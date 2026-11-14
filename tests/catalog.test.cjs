const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const schemaBytes = fs.readFileSync(path.join(root, 'api/fieldhub-openapi.json'));
const schema = JSON.parse(schemaBytes);
const catalog = require('../dist/nodes/Fieldhub/generated/catalog.js');
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
const sourceOperations = Object.entries(schema.paths).flatMap(([url, entries]) =>
	Object.entries(entries)
		.filter(([method]) => methods.has(method))
		.map(([method, operation]) => ({ ...operation, path: url, method: method.toUpperCase() })),
);
const sourceById = new Map(sourceOperations.map((operation) => [operation.operationId, operation]));
const resourceByName = new Map(
	catalog.resources.map((resource) => [resource.name, resource.value]),
);

test('snapshot and generated catalog pin the approved API version and source', () => {
	assert.equal(schema.info.version, '10.4.32');
	assert.equal(catalog.schemaVersion, schema.info.version);
	assert.equal(catalog.schemaSource, 'api/fieldhub-openapi.json');
	assert.equal(catalog.schemaSha256, crypto.createHash('sha256').update(schemaBytes).digest('hex'));
});

test('all 284 endpoints are covered exactly once by 281 actions or 3 explicit exclusions', () => {
	assert.equal(sourceOperations.length, 284);
	assert.equal(catalog.operations.length, 281);
	assert.equal(catalog.excludedOperations.length, 3);
	const covered = [...catalog.operations, ...catalog.excludedOperations];
	assert.equal(new Set(covered.map(({ id }) => id)).size, covered.length);
	assert.deepEqual(covered.map(({ id }) => id).sort(), [...sourceById.keys()].sort());
	for (const operation of covered) {
		const expected = sourceById.get(operation.id);
		assert.equal(operation.path, expected.path, `${operation.id}: path`);
		assert.equal(operation.method, expected.method, `${operation.id}: HTTP method`);
		assert.equal(operation.resource, resourceByName.get(expected.tags[0]), `${operation.id}: tag`);
	}
});

test('resource names preserve all 52 documentation tags', () => {
	assert.equal(catalog.resources.length, 52);
	assert.equal(new Set(catalog.resources.map(({ value }) => value)).size, 52);
	assert.deepEqual(
		catalog.resources.map(({ name }) => name).sort(),
		[...new Set(sourceOperations.flatMap(({ tags }) => tags))].sort(),
	);
	for (const resource of catalog.resources) {
		assert.ok(catalog.operations.some((operation) => operation.resource === resource.value));
	}
});

test('only the three documented unavailable operations are excluded', () => {
	assert.deepEqual(
		catalog.excludedOperations.map(({ id }) => id).sort(),
		[
			'materials_alternative_prices_retrieve',
			'storage_files_update',
			'work_orders_create_from_inspection_create',
		].sort(),
	);
	const documentation = fs.readFileSync(path.join(root, 'docs/operations.md'), 'utf8');
	for (const operation of catalog.excludedOperations) {
		assert.ok(operation.reason.length > 10, `${operation.id}: explain why unavailable`);
		assert.ok(documentation.includes(operation.id), `${operation.id}: documented exclusion`);
		assert.match(sourceById.get(operation.id).description, /access forbidden|currently not in use/);
	}
});

test('all documented parameters, nested identifiers, and request bodies survive generation', () => {
	for (const operation of catalog.operations) {
		const expected = sourceById.get(operation.id);
		assert.deepEqual(
			operation.parameters,
			expected.parameters ?? [],
			`${operation.id}: parameters`,
		);
		const placeholders = [...operation.path.matchAll(/\{([^}]+)\}/g)]
			.map((match) => match[1])
			.sort();
		assert.deepEqual(
			operation.parameters
				.filter(({ in: location }) => location === 'path')
				.map(({ name }) => name)
				.sort(),
			placeholders,
			`${operation.id}: path placeholders`,
		);
		const content = expected.requestBody?.content;
		const expectedContentType =
			content && (content['application/json'] ? 'application/json' : Object.keys(content)[0]);
		if (content) {
			assert.deepEqual(
				operation.body,
				content[expectedContentType].schema,
				`${operation.id}: body schema`,
			);
			assert.equal(operation.contentType, expectedContentType, `${operation.id}: media type`);
		} else {
			assert.equal(operation.body, undefined, `${operation.id}: no invented body`);
		}
		assert.ok(operation.label.length > 0, `${operation.id}: operation label`);
	}
});

test('all 82 paginated endpoints are recognized from their response schemas', () => {
	const expected = sourceOperations
		.filter((operation) =>
			Object.values(operation.responses).some((response) =>
				response.content?.['application/json']?.schema?.$ref?.includes('/Paginated'),
			),
		)
		.map(({ operationId }) => operationId)
		.sort();
	assert.equal(expected.length, 82);
	assert.deepEqual(
		catalog.operations
			.filter(({ paginated }) => paginated)
			.map(({ id }) => id)
			.sort(),
		expected,
	);
});

test('every generated schema reference resolves inside the bundled catalog', () => {
	const visit = (value) => {
		if (!value || typeof value !== 'object') return;
		if (value.$ref) {
			assert.ok(value.$ref.startsWith('#/components/schemas/'), value.$ref);
			assert.ok(catalog.schemas[value.$ref.split('/').pop()], `Missing ${value.$ref}`);
		}
		for (const nested of Object.values(value)) visit(nested);
	};
	visit(catalog.operations);
	visit(catalog.schemas);
});

test('the declarative node exposes exactly the catalog resources and usable operations', () => {
	const { Fieldhub } = require('../dist/nodes/Fieldhub/Fieldhub.node.js');
	const node = new Fieldhub();
	assert.equal(node.description.name, 'fieldhub');
	assert.equal(node.description.displayName, 'FieldHub');
	assert.equal(node.execute, undefined, 'Keep the declarative n8n lifecycle');
	assert.equal(node.description.requestDefaults.timeout, 30000);
	const { Expression } = require('n8n-workflow');
	const evaluateBaseUrl = (baseUrl) =>
		new Expression('UTC').resolveSimpleParameterValue(node.description.requestDefaults.baseURL, {
			$credentials: { baseUrl },
		});
	for (const baseUrl of [undefined, null, '', ' \t\n '])
		assert.throws(() => evaluateBaseUrl(baseUrl), /API URL is required/);
	assert.equal(evaluateBaseUrl(' https://api.example.com/v3/ '), 'https://api.example.com/v3');
	const resource = node.description.properties.find(({ name }) => name === 'resource');
	assert.deepEqual(resource.options, catalog.resources);
	const selectors = node.description.properties.filter(({ name }) => name === 'operation');
	assert.equal(selectors.length, 52);
	const options = selectors.flatMap(({ options }) => options);
	assert.equal(options.length, 281);
	assert.deepEqual(
		options.map(({ value }) => value).sort(),
		catalog.operations.map(({ id }) => id).sort(),
	);
	for (const selector of selectors) {
		assert.ok(selector.options.some(({ value }) => value === selector.default));
		for (const option of selector.options) {
			const operation = catalog.operations.find(({ id }) => id === option.value);
			assert.deepEqual(selector.displayOptions.show.resource, [operation.resource]);
			assert.equal(option.routing.request.method, operation.method);
			assert.equal(option.routing.request.url, operation.path.replace(/^\/v3/, ''));
			assert.equal(option.routing.send.preSend.length, 1);
			assert.equal(option.routing.output.postReceive.length, 1);
			assert.equal(Boolean(option.routing.send.paginate), operation.paginated);
			assert.equal(
				typeof option.routing.operations?.pagination,
				operation.paginated ? 'function' : 'undefined',
			);
		}
	}
});

// Existing saved workflows must keep selecting the same resource and endpoint.
test('all 10.2.16 operation identities remain compatible after the schema upgrade', () => {
	const baseline = require('./fixtures/schema-10.2.16-operation-identities.json');
	assert.equal(baseline.length, 265);
	const covered = new Map(
		[...catalog.operations, ...catalog.excludedOperations].map((op) => [op.id, op]),
	);
	for (const before of baseline) {
		const after = covered.get(before.id);
		assert.ok(after, before.id);
		assert.equal(after.path, before.path, before.id + ': path');
		assert.equal(after.method, before.method, before.id + ': method');
		assert.equal(after.resource, resourceByName.get(before.tag), before.id + ': resource');
	}
});
