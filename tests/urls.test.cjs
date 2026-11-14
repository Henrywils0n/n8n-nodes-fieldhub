const assert = require('node:assert/strict');
const test = require('node:test');
const { Expression } = require('n8n-workflow');
const { normalizeBaseUrl, baseUrlExpression } = require('../dist/nodes/Fieldhub/urls.js');

function normalizeExpression(value) {
	return new Expression('UTC').resolveSimpleParameterValue(baseUrlExpression, {
		$credentials: { baseUrl: value },
	});
}

test('runtime and credential expressions preserve HTTPS URLs and normalize API suffixes equally', () => {
	for (const base of [
		'https://api.example.com',
		'https://api.example.com/tenant',
		'https://api.example.com:8443',
		'https://localhost',
		'https://[::1]:8443',
		'https://127.0.0.1:8443',
		'https://api.example.com/with%20space',
		'HTTPS://API.EXAMPLE.COM',
	]) {
		for (const suffix of ['', '/', '///', '/v3', '/v3/', '/v3/v3///']) {
			const value = ` \t${base}${suffix}\n `;
			assert.equal(normalizeBaseUrl(value), `${base}/v3`);
			assert.equal(normalizeExpression(value), normalizeBaseUrl(value));
		}
	}
});

test('runtime and credential expressions reject missing and unsafe URLs without exposing URL secrets', () => {
	for (const value of [undefined, null, '', ' \t\n ', 17, {}]) {
		assert.throws(() => normalizeBaseUrl(value), /API URL is required/);
		assert.throws(() => normalizeExpression(value), /API URL is required/);
	}
	for (const value of [
		'http://api.example.com',
		'ftp://api.example.com',
		'https://username:secret@example.com',
		'https://@example.com',
		'https://example.com?secret=value',
		'https://example.com#secret',
		'https://example.com/?',
		'https://example.com/#',
		'https://example.com\\@other.example.com',
		'https://exa\nmple.com',
		'https://example.com/\u0000',
		'//example.com',
		'example.com',
		'https://',
	]) {
		for (const normalize of [normalizeBaseUrl, normalizeExpression]) {
			assert.throws(
				() => normalize(value),
				(error) => {
					assert.equal(
						error.message,
						'API URL must be an HTTPS URL without credentials, a query, or a fragment',
					);
					return true;
				},
			);
		}
	}
});
