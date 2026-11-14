const assert = require('node:assert/strict');
const test = require('node:test');
const { Expression, NodeHelpers, Workflow } = require('n8n-workflow');
const { FieldhubApi } = require('../dist/credentials/FieldhubApi.credentials.js');
const { FieldhubOAuth2Api } = require('../dist/credentials/FieldhubOAuth2Api.credentials.js');

function evaluate(expression, values) {
	return new Expression('UTC').resolveSimpleParameterValue(expression, {
		$credentials: values,
		$self: values,
	});
}

test('token authentication preserves the credential identity and uses the FieldHub Token scheme', () => {
	const credential = new FieldhubApi();
	assert.equal(credential.name, 'fieldhubApi');
	const token = credential.properties.find((property) => property.name === 'apiKey');
	assert.equal(token.typeOptions.password, true);
	assert.equal(token.required, true);
	assert.deepEqual(Object.keys(credential.authenticate.properties.headers), ['Authorization']);
	assert.equal(
		evaluate(credential.authenticate.properties.headers.Authorization, { apiKey: 'test-token' }),
		'Token test-token',
	);
});

for (const Credential of [FieldhubApi, FieldhubOAuth2Api]) {
	test(`${Credential.name} tests GET /v3/profile/ and normalizes the API URL`, () => {
		const credential = new Credential();
		const { request } = credential.test;
		assert.equal(request.method, 'GET');
		assert.equal(request.url, '/profile/');
		assert.equal(request.timeout, 30000);
		assert.equal(request.disableFollowRedirect, true);
		assert.equal(request.maxRedirects, 0);
		assert.equal(request.ignoreHttpStatusErrors, false);
		for (const suffix of ['', '/', '///', '/v3', '/v3/', '/v3/v3///']) {
			assert.equal(
				evaluate(request.baseURL, { baseUrl: `https://api.example.com${suffix}` }) + request.url,
				'https://api.example.com/v3/profile/',
			);
		}
		const apiUrl = credential.properties.find((property) => property.name === 'baseUrl');
		assert.equal(apiUrl.required, true);
		assert.equal(apiUrl.default, '');
		for (const baseUrl of [undefined, null, '', ' \t\n ']) {
			assert.throws(() => evaluate(request.baseURL, { baseUrl }), /API URL is required/);
		}
		assert.equal(
			evaluate(request.baseURL, { baseUrl: '  https://api.example.com/v3/  ' }),
			'https://api.example.com/v3',
		);
	});

	test(`${Credential.name} rejects unsafe API URLs before the authenticated profile test`, () => {
		const credential = new Credential();
		for (const baseUrl of [
			'http://api.example.com',
			'https://user:secret@api.example.com',
			'https://api.example.com?secret=value',
			'https://api.example.com#fragment',
			'https://api.example.com/?',
			'https://api.example.com/#',
			'https://api.example.com\\@other.example.com',
			'https://api.exa\nmple.com',
			'https://',
			'//api.example.com',
		]) {
			assert.throws(
				() => evaluate(credential.test.request.baseURL, { baseUrl }),
				/HTTPS URL without credentials, a query, or a fragment/,
			);
		}
	});
}

test('OAuth2 delegates bearer tokens and refresh to n8n and requires user-supplied endpoints', () => {
	const credential = new FieldhubOAuth2Api();
	const properties = Object.fromEntries(
		credential.properties.map((property) => [property.name, property]),
	);
	assert.equal(credential.name, 'fieldhubOAuth2Api');
	assert.deepEqual(credential.extends, ['oAuth2Api']);
	assert.equal(credential.authenticate, undefined);
	assert.equal(credential.preAuthentication, undefined);
	assert.equal(properties.grantType.default, 'authorizationCode');
	assert.equal(properties.authentication.default, 'body');
	for (const name of ['authUrl', 'accessTokenUrl']) {
		assert.equal(properties[name].default, '');
		assert.equal(properties[name].required, true);
		assert.equal(properties[name].type, 'string');
		assert.equal(new URL(properties[name].placeholder).hostname, 'example.com');
	}
	assert.equal(new URL(properties.authUrl.placeholder).pathname, '/oauth2/authorize/');
	assert.equal(new URL(properties.accessTokenUrl.placeholder).pathname, '/oauth2/token/');
	assert.equal(properties.scope.type, 'hidden');
	assert.equal(
		evaluate(properties.scope.default, { fieldhubScopes: 'workOrder:view workOrder:edit' }),
		'workOrder:view workOrder:edit',
	);
	assert.equal(evaluate(properties.scope.default, { fieldhubScopes: '' }), '');
});

function resolveOAuthCredentials(savedValues) {
	const credential = new FieldhubOAuth2Api();
	// These are the same defaults and expression APIs used by native n8n's
	// CredentialsHelper.applyDefaultsAndOverwrites for connect/callback/refresh.
	const values = NodeHelpers.getNodeParameters(
		credential.properties,
		savedValues,
		true,
		false,
		null,
		null,
	);
	const node = { name: '', type: 'mock', typeVersion: 1, position: [0, 0], parameters: {} };
	const workflow = new Workflow({
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes: { getByNameAndVersion: () => ({ description: { properties: [] } }) },
	});
	return workflow.expression.getComplexParameterValue(
		node,
		values,
		'internal',
		{},
		undefined,
		undefined,
		values,
	);
}

const safeOAuthUrls = {
	baseUrl: 'https://api.example.com/v3',
	authUrl: 'https://example.com/oauth2/authorize/',
	accessTokenUrl: 'https://example.com/oauth2/token/',
};

test('OAuth URL guard resolves in native credential expressions for fresh and legacy credentials', () => {
	const credential = new FieldhubOAuth2Api();
	const defaults = Object.fromEntries(
		credential.properties.map(({ name, default: value }) => [name, value]),
	);
	const fresh = { ...defaults, ...safeOAuthUrls, fieldhubScopes: 'workOrder:view' };
	const legacy = { ...safeOAuthUrls, fieldhubScopes: 'workOrder:view', scope: 'workOrder:view' };
	for (const saved of [fresh, legacy]) {
		const resolved = resolveOAuthCredentials(saved);
		assert.equal(resolved.fieldhubUrlValidation, true);
		assert.equal(resolved.scope, 'workOrder:view');
		for (const [name, value] of Object.entries(safeOAuthUrls)) assert.equal(resolved[name], value);
		// Native OAuth callbacks/refresh persist token data into the raw stored
		// values rather than replacing defaults with evaluated expression results.
		const savedAfterExchange = { ...saved, oauthTokenData: { access_token: 'synthetic-token' } };
		assert.equal(savedAfterExchange.fieldhubUrlValidation, saved.fieldhubUrlValidation);
		assert.equal(resolveOAuthCredentials(savedAfterExchange).fieldhubUrlValidation, true);
		assert.throws(
			() =>
				resolveOAuthCredentials({
					...savedAfterExchange,
					accessTokenUrl: 'http://example.com/token',
				}),
			/Access Token URL must be an HTTPS URL/,
		);
	}
});

test('OAuth endpoints reject unsafe values before native authorization, exchange, or refresh', () => {
	for (const [field, label] of [
		['baseUrl', 'API URL'],
		['authUrl', 'Authorization URL'],
		['accessTokenUrl', 'Access Token URL'],
	]) {
		for (const invalid of [
			undefined,
			null,
			'',
			'http://example.com/oauth2/token/',
			'https://user:secret@example.com/oauth2/token/',
			'https://example.com/oauth2/token/?secret=value',
			'https://example.com/oauth2/token/#fragment',
			'https://example.com/oauth2/token/?',
			'https://example.com/oauth2/token/#',
			'https://example.com\\@other.example.com/oauth2/token/',
			'https://exa\nmple.com/oauth2/token/',
			'//example.com/oauth2/token/',
			17,
		]) {
			assert.throws(
				() => resolveOAuthCredentials({ ...safeOAuthUrls, [field]: invalid }),
				(error) => {
					assert.equal(error.name, 'ExpressionExtensionError');
					assert.equal(
						error.message,
						`${label} must be an HTTPS URL without credentials, a query, or a fragment`,
					);
					return true;
				},
			);
		}
	}
});

test('OAuth scope defaults and explicit values survive n8n project-permission metadata', () => {
	const credential = new FieldhubOAuth2Api();
	const properties = Object.fromEntries(
		credential.properties.map((property) => [property.name, property]),
	);
	assert.equal(properties.fieldhubScopes.default, '');
	assert.equal(properties.fieldhubScopes.type, 'string');
	assert.equal(properties.scopes, undefined);
	const defaults = Object.fromEntries(
		credential.properties.map((property) => [property.name, property.default]),
	);
	const projectPermissions = ['agent:create', 'credential:read', 'workflow:update'];
	// n8n's credential form adds project metadata after applying credential defaults.
	// Legacy strings are intentionally not migrated: they can contain the same permissions.
	for (const scopes of [projectPermissions, projectPermissions.join(','), 'workOrder:view']) {
		const form = { ...defaults, scopes, homeProject: { scopes: projectPermissions } };
		assert.equal(evaluate(properties.scope.default, form), '');
		assert.equal(
			evaluate(properties.scope.default, {
				...form,
				fieldhubScopes: 'workOrder:view workOrder:edit',
			}),
			'workOrder:view workOrder:edit',
		);
		for (const fieldhubScopes of [undefined, null, '']) {
			assert.equal(evaluate(properties.scope.default, { ...form, fieldhubScopes }), '');
		}
	}
});
