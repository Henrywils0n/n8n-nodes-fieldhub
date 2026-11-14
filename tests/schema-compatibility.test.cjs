const test = require('node:test');
const assert = require('node:assert/strict');
const { operations, schemas } = require('../dist/nodes/Fieldhub/generated/catalog.js');
const { properties } = require('../dist/nodes/Fieldhub/properties.js');
const { buildRequest } = require('../dist/nodes/Fieldhub/request.js');
const {
	fieldLabel,
	isStringInputSchema,
	validateValue,
} = require('../dist/nodes/Fieldhub/schema.js');

const operation = (id) => {
	const result = operations.find((entry) => entry.id === id);
	assert.ok(result, `Missing operation ${id}`);
	return result;
};

const collectionField = (operationId, collection, name) => {
	const property = properties.find(
		(field) =>
			field.name === collection && field.displayOptions?.show?.operation?.includes(operationId),
	);
	assert.ok(property, `Missing ${collection} for ${operationId}`);
	const field = property.options.find((option) => option.name === name);
	assert.ok(field, `Missing ${name} for ${operationId}`);
	return field;
};

test('contact email form fields preserve saved plain text after the API union change', () => {
	for (const id of ['contacts_create', 'contacts_update', 'contacts_partial_update']) {
		assert.equal(collectionField(id, 'additionalFields', 'email').type, 'string');
		for (const email of [
			'person@example.test',
			'name+tag@example.test',
			'"a b"@example.test',
			'',
		]) {
			const request = buildRequest(operation(id), {
				pathParameters: { id: 12 },
				bodyMode: 'fields',
				bodyFields: { email },
			});
			assert.deepEqual(request.body, { email });
		}
	}
});

test('contact JSON bodies preserve explicit empty and null email values and omitted fields', () => {
	for (const body of [{ email: '' }, { email: null }, {}]) {
		const request = buildRequest(operation('contacts_partial_update'), {
			pathParameters: { id: 12 },
			bodyMode: 'json',
			bodyJson: JSON.stringify(body),
			bodyFields: { email: 'ignored@example.test' },
		});
		assert.deepEqual(request.body, body);
	}
});

test('email/empty-string unions stay disjoint without relaxing unrelated oneOf constraints', () => {
	const email = schemas.PatchedContactEdit.properties.email;
	assert.equal(isStringInputSchema(email), true);
	for (const value of ['person@example.test', '', null])
		assert.doesNotThrow(() => validateValue(value, email, 'Email'));
	for (const value of ['invalid', '@example.test', 'person@', 'a b@example.test', 12, {}])
		assert.throws(() => validateValue(value, email, 'Email'));
	assert.throws(
		() => validateValue('x', { oneOf: [{ type: 'string' }, { type: 'string' }] }, 'Value'),
		/allowed value type/,
	);
	assert.equal(isStringInputSchema({ oneOf: [{ type: 'string' }, { type: 'object' }] }), false);
});

test('storage file tags retain legacy CSV inputs and serialize integer arrays consistently', () => {
	assert.equal(collectionField('storage_files_list', 'filters', 'fileTags').type, 'string');
	for (const input of ['1,2', ' 1, 2 ', '[1,2]', [1, 2]]) {
		const request = buildRequest(operation('storage_files_list'), {
			queryParameters: { file_tags: input, obj_model: 'Contract', obj_id: 12 },
		});
		assert.equal(request.method, 'GET');
		assert.equal(request.qs.file_tags, '1,2');
		assert.equal(request.qs.obj_model, 'Contract');
		assert.equal(request.qs.obj_id, 12);
	}
	for (const input of ['1', [1]])
		assert.equal(
			buildRequest(operation('storage_files_list'), { queryParameters: { file_tags: input } }).qs
				.file_tags,
			'1',
		);
	assert.equal(
		buildRequest(operation('storage_files_list'), { queryParameters: { file_tags: '' } }).qs
			.file_tags,
		'',
	);
	assert.equal(buildRequest(operation('storage_files_list'), {}).qs.file_tags, undefined);
});

test('storage CSV compatibility rejects malformed values and does not coerce other arrays', () => {
	for (const file_tags of ['1,,2', 'one,2', '1.5,2', '["1",2]', '9007199254740992'])
		assert.throws(() =>
			buildRequest(operation('storage_files_list'), { queryParameters: { file_tags } }),
		);
	assert.throws(() =>
		buildRequest(operation('contracts_list'), { queryParameters: { sites: '1,2' } }),
	);
	assert.deepEqual(
		buildRequest(operation('contracts_list'), { queryParameters: { sites: [1, 2] } }).qs.sites,
		[1, 2],
	);
});

test('contract rate lock field uses the business label while retaining its API key', () => {
	assert.equal(fieldLabel('rate_escalation_date'), 'Rate Lock Until Date');
	assert.equal(
		collectionField('contracts_partial_update', 'additionalFields', 'rateEscalationDate')
			.displayName,
		'Rate Lock Until Date',
	);
	const request = buildRequest(operation('contracts_partial_update'), {
		pathParameters: { id: 12 },
		bodyFields: { rate_escalation_date: '2026-09-02' },
	});
	assert.deepEqual(request.body, { rate_escalation_date: '2026-09-02' });
});
