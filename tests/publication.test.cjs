const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {
	checkPublicText,
	checkSource,
	checkPackage,
} = require('../scripts/check-publication-content.cjs');
const root = path.resolve(__dirname, '..');

test('publication content uses reviewed hosts and contains no detected private data', () => {
	checkSource(root);
});

test('publication checks reject tenant URLs, local user paths, and secrets without echoing them', () => {
	const samples = [
		'https://private-tenant.invalid/v3',
		'C:\\Users\\private-person\\work',
		'/Users/private-person/work',
		'https://user:password@example.com',
		'-----BEGIN PRIVATE KEY-----',
		'npm_' + 'A'.repeat(36),
	];
	for (const value of samples) {
		assert.throws(
			() => checkPublicText('fixture.txt', value),
			(error) => {
				assert.ok(error.message.includes('fixture.txt'));
				assert.ok(!error.message.includes(value));
				return true;
			},
		);
	}
});

test('package allowlist rejects accidentally bundled configuration before reading it', () => {
	for (const file of [
		'.env',
		'.npmrc',
		'dist/package.json',
		'dist/tsconfig.tsbuildinfo',
		'node_modules/private/index.js',
		'dist/nodes/Fieldhub/../../.env',
	]) {
		assert.throws(() => checkPackage(root, [{ path: file }]), /Unexpected packaged file/);
	}
});

test('example workflow is inactive, credential-free and uses supported read-only actions', () => {
	const workflow = JSON.parse(
		fs.readFileSync(path.join(root, 'examples/work-order-lookup.json'), 'utf8'),
	);
	const { operations } = require('../dist/nodes/Fieldhub/generated/catalog.js');
	assert.equal(workflow.active, false);
	assert.equal(workflow.pinData, undefined);
	assert.equal(
		workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.manualTrigger').length,
		1,
	);
	for (const node of workflow.nodes.filter((node) => node.type === 'n8n-nodes-fieldhub.fieldhub')) {
		assert.equal(node.credentials, undefined);
		const operation = operations.find((entry) => entry.id === node.parameters.operation);
		assert.ok(operation);
		assert.equal(operation.resource, node.parameters.resource);
		assert.equal(operation.method, 'GET');
		assert.equal(node.typeVersion, 1.1);
	}
	const detail = workflow.nodes.find(
		(node) => node.parameters.operation === 'work_orders_retrieve',
	);
	assert.equal(detail.parameters.pathId, '={{ $json.id }}');
});

test('the published node registers only API Token authentication', () => {
	const manifest = require('../package.json');
	const { Fieldhub } = require('../dist/nodes/Fieldhub/Fieldhub.node.js');
	const description = new Fieldhub().description;
	assert.deepEqual(manifest.n8n.credentials, ['dist/credentials/FieldhubApi.credentials.js']);
	assert.deepEqual(description.credentials, [{ name: 'fieldhubApi', required: true }]);
	const authentication = description.properties.find((field) => field.name === 'authentication');
	assert.equal(authentication.default, 'token');
	assert.deepEqual(authentication.options, [{ name: 'API Token', value: 'token' }]);
	assert.throws(
		() => checkPackage(root, [{ path: 'dist/credentials/FieldhubOAuth2Api.credentials.js' }]),
		/Disabled OAuth2/,
	);
});
