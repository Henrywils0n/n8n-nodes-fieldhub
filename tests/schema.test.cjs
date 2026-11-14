const test = require('node:test');
const assert = require('node:assert/strict');
const { schemas } = require('../dist/nodes/Fieldhub/generated/catalog.js');
const {
	resolveSchema,
	writableProperties,
	parseJson,
	validateValue,
} = require('../dist/nodes/Fieldhub/schema.js');

test('schema resolution preserves allOf metadata and writable required properties', () => {
	const account = resolveSchema({ $ref: '#/components/schemas/AccountAdd' });
	const address = resolveSchema(account.properties.address);
	assert.equal(address.type, 'object');
	assert.equal(address.description, 'Billing address');
	assert.ok(address.properties);
	const fields = writableProperties({
		type: 'object',
		properties: { name: { type: 'string' }, id: { allOf: [{ type: 'integer' }], readOnly: true } },
	});
	assert.deepEqual(
		fields.map(([name]) => name),
		['name'],
	);
	assert.doesNotThrow(() =>
		validateValue(
			{ name: 'New' },
			{
				type: 'object',
				required: ['id', 'name'],
				properties: { name: { type: 'string' }, id: { type: 'integer', readOnly: true } },
			},
			'Body',
		),
	);
	assert.throws(
		() =>
			validateValue(
				{ id: 1, name: 'New' },
				{ type: 'object', properties: { id: { type: 'integer', readOnly: true } } },
				'Body',
			),
		/read-only/,
	);
});

test('primitive allOf wrappers do not become objects', () => {
	const schema = { allOf: [{ type: 'string', enum: ['one', 'two'] }], description: 'A choice' };
	assert.equal(resolveSchema(schema).properties, undefined);
	assert.doesNotThrow(() => validateValue('one', schema, 'Choice'));
	assert.throws(() => validateValue('three', schema, 'Choice'), /choices/);
});

test('nullable values and enum choices retain their documented types', () => {
	assert.doesNotThrow(() =>
		validateValue(null, { type: 'string', nullable: true, enum: ['x'] }, 'Choice'),
	);
	assert.doesNotThrow(() => validateValue(null, { enum: ['x', null] }, 'Choice'));
	assert.doesNotThrow(() =>
		validateValue(false, { type: 'boolean', enum: [false, true] }, 'Choice'),
	);
	assert.throws(
		() => validateValue('false', { type: 'boolean', enum: [false, true] }, 'Choice'),
		/choices/,
	);
	assert.throws(() => validateValue(null, { type: 'string' }, 'Choice'), /null/);
});

test('validation preserves omitted values and never inserts defaults or coerces nested JSON', () => {
	const input = parseJson(
		'{"rows":[{"quantity":0.125,"enabled":false,"tags":[]}],"memo":null}',
		'Body',
	);
	const copy = structuredClone(input);
	validateValue(
		input,
		{
			type: 'object',
			properties: {
				rows: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							quantity: { type: 'number' },
							enabled: { type: 'boolean' },
							tags: { type: 'array', items: { type: 'string' } },
						},
					},
				},
				memo: { type: 'string', nullable: true },
				omitted: { type: 'string', default: 'must not insert' },
			},
		},
		'Body',
	);
	assert.deepEqual(input, copy);
	assert.equal(Object.hasOwn(input, 'omitted'), false);
	assert.equal(parseJson(input, 'Body'), input);
	assert.throws(() => parseJson('{bad', 'Body'), /valid JSON/);
	assert.throws(
		() =>
			validateValue(
				{ rows: [{ quantity: '0.125' }] },
				{
					type: 'object',
					properties: {
						rows: {
							type: 'array',
							items: { type: 'object', properties: { quantity: { type: 'number' } } },
						},
					},
				},
				'Body',
			),
		/Body.rows\[0\].quantity must be a number/,
	);
});

test('date validation checks real calendar dates and date-time timezone components', () => {
	for (const value of ['2024-02-29', '2026-09-18'])
		validateValue(value, { type: 'string', format: 'date' }, 'Date');
	for (const value of ['2025-02-29', '2026-13-01', '2026-04-31', '18/09/2026'])
		assert.throws(
			() => validateValue(value, { type: 'string', format: 'date' }, 'Date'),
			/valid date/,
		);
	for (const value of [
		'2026-09-18T10:30:00Z',
		'2026-09-18T10:30:00.123456-03:00',
		'2026-09-18t10:30:00z',
	])
		validateValue(value, { type: 'string', format: 'date-time' }, 'Date');
	for (const value of [
		'2026-02-30T10:30:00Z',
		'2026-09-18T24:00:00Z',
		'2026-09-18T10:30:00',
		'2026-09-18T10:30:00+30:00',
	])
		assert.throws(
			() => validateValue(value, { type: 'string', format: 'date-time' }, 'Date'),
			/timezone/,
		);
});

test('numeric constraints cover exclusive bounds and exact integer transport', () => {
	const schema = {
		type: 'number',
		minimum: 0,
		maximum: 1,
		exclusiveMinimum: true,
		exclusiveMaximum: true,
		multipleOf: 0.1,
	};
	validateValue(0.3, schema, 'Amount');
	for (const value of [0, 1, 0.31, NaN, Infinity])
		assert.throws(() => validateValue(value, schema, 'Amount'));
	assert.throws(
		() => validateValue(3, { type: 'number', exclusiveMinimum: 3 }, 'Amount'),
		/greater than/,
	);
	assert.throws(
		() => validateValue(3, { type: 'number', exclusiveMaximum: 3 }, 'Amount'),
		/less than/,
	);
	validateValue(Number.MAX_SAFE_INTEGER, { type: 'integer' }, 'ID');
	assert.throws(
		() => validateValue(Number.MAX_SAFE_INTEGER + 1, { type: 'integer' }, 'ID'),
		/precision/,
	);
	assert.throws(() => validateValue(1.5, { type: 'integer' }, 'ID'), /integer/);
});

test('collections enforce cardinality, structural uniqueness, and additional property schemas', () => {
	const array = { type: 'array', minItems: 1, maxItems: 2, uniqueItems: true };
	validateValue([{ a: 1 }, { a: 2 }], array, 'Rows');
	assert.throws(() => validateValue([], array, 'Rows'), /few items/);
	assert.throws(() => validateValue([1, 2, 3], array, 'Rows'), /many items/);
	assert.throws(
		() =>
			validateValue(
				[
					{ a: 1, b: 2 },
					{ b: 2, a: 1 },
				],
				array,
				'Rows',
			),
		/unique/,
	);
	const map = {
		type: 'object',
		minProperties: 1,
		maxProperties: 2,
		additionalProperties: { type: 'integer' },
	};
	validateValue({ newField: 0 }, map, 'Map');
	assert.throws(() => validateValue({}, map, 'Map'), /few properties/);
	assert.throws(() => validateValue({ a: 1, b: 2, c: 3 }, map, 'Map'), /many properties/);
	assert.throws(() => validateValue({ newField: 'x' }, map, 'Map'), /integer/);
	assert.throws(
		() => validateValue({ newField: 1 }, { type: 'object', additionalProperties: false }, 'Map'),
		/not a documented property/,
	);
	assert.doesNotThrow(() =>
		validateValue({ customField: { anything: true } }, { type: 'object' }, 'Map'),
	);
});

test('required fields and known property lookup do not trust inherited object keys', () => {
	assert.throws(
		() => validateValue({}, { type: 'object', required: ['constructor'] }, 'Body'),
		/required/,
	);
	assert.doesNotThrow(() =>
		validateValue(
			JSON.parse('{"constructor":1,"__proto__":2}'),
			{ type: 'object', additionalProperties: { type: 'integer' } },
			'Body',
		),
	);
});

test('string length counts Unicode characters and oneOf requires exactly one branch', () => {
	validateValue('😀', { type: 'string', maxLength: 1 }, 'Name');
	assert.throws(() => validateValue('😀x', { type: 'string', maxLength: 1 }, 'Name'), /long/);
	assert.throws(
		() => validateValue('x', { oneOf: [{ type: 'string' }, { type: 'string' }] }, 'Choice'),
		/allowed/,
	);
	validateValue('x', { anyOf: [{ type: 'string' }, { type: 'string' }] }, 'Choice');
	assert.throws(
		() => validateValue('x', { type: 'string', not: { enum: ['x'] } }, 'Choice'),
		/forbidden/,
	);
});

test('catalog schemas resolve without mutation and profile response metadata stays intact', () => {
	const before = JSON.stringify(schemas);
	for (const [name, schema] of Object.entries(schemas)) {
		resolveSchema(schema);
		writableProperties({ $ref: `#/components/schemas/${name}` });
	}
	assert.equal(JSON.stringify(schemas), before);
});

test('ordering dropdowns distinguish ascending and descending API values', () => {
	const { properties } = require('../dist/nodes/Fieldhub/properties.js');
	const orderings = properties
		.filter((field) => field.name === 'filters')
		.flatMap((field) => field.options)
		.filter((field) => field.name === 'ordering' && field.type === 'options');
	assert.ok(orderings.length > 0);
	for (const field of orderings) {
		for (const option of field.options) {
			assert.equal(option.name, option.name.trim());
			assert.ok(
				option.name.endsWith(option.value.startsWith('-') ? '(Descending)' : '(Ascending)'),
			);
		}
	}
	const contacts = properties.find(
		(field) =>
			field.name === 'filters' && field.displayOptions.show.operation.includes('contacts_list'),
	);
	const options = contacts.options.find((field) => field.name === 'ordering').options;
	assert.equal(options.find((option) => option.name === 'ID (Ascending)').value, 'id');
	assert.equal(options.find((option) => option.name === 'ID (Descending)').value, '-id');
});
