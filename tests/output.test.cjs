const test = require('node:test');
const assert = require('node:assert/strict');
const { NodeHelpers } = require('n8n-workflow');
const { operations } = require('../dist/nodes/Fieldhub/generated/catalog.js');
const { properties } = require('../dist/nodes/Fieldhub/properties.js');
const { operationAction, operationDescription } = require('../dist/nodes/Fieldhub/labels.js');
const {
	responseFields,
	outputProperties,
	applyOutputSelection,
} = require('../dist/nodes/Fieldhub/output.js');

const operation = operations.find((entry) => entry.id === 'work_orders_retrieve');
const context = (parameters = {}, version = 1.1, tool = false) => ({
	getNode: () => ({
		id: 'output-test',
		name: 'FieldHub',
		type: `n8n-nodes-fieldhub.fieldhub${tool ? 'Tool' : ''}`,
		typeVersion: version,
		parameters,
		position: [0, 0],
	}),
	getNodeParameter: (name, fallback) =>
		Object.hasOwn(parameters, name) ? parameters[name] : fallback,
});
const sample = () => [
	{
		json: Object.fromEntries(responseFields(operation).map(([name], index) => [name, index + 1])),
		pairedItem: { item: 7 },
		binary: { data: { data: 'unchanged', mimeType: 'text/plain' } },
	},
];

test('v1 output stays raw even if new selection parameters are present', () => {
	const items = sample();
	items[0].json.future_field = 'retain me';
	for (const tool of [false, true]) {
		const result = applyOutputSelection.call(
			context({ simplify: true, output: 'selectedFields', outputFields: ['bad'] }, 1, tool),
			items,
			operation,
		);
		assert.strictEqual(result, items);
	}
});

test('v1.1 defaults simplify large record output and preserve item metadata', () => {
	for (const tool of [false, true]) {
		const items = sample();
		const original = structuredClone(items);
		const result = applyOutputSelection.call(context({}, 1.1, tool), items, operation);
		assert.equal(Object.keys(result[0].json).length, 10);
		assert.equal(result[0].json.id, items[0].json.id);
		assert.equal(result[0].json.summary, items[0].json.summary);
		assert.strictEqual(result[0].pairedItem, items[0].pairedItem);
		assert.strictEqual(result[0].binary, items[0].binary);
		assert.deepEqual(items, original);
	}
});

test('both raw modes retain unknown fields and preserve the original items', () => {
	const items = sample();
	items[0].json.future_field = { arbitrary: [1, 2] };
	assert.strictEqual(
		applyOutputSelection.call(context({ simplify: false }), items, operation),
		items,
	);
	assert.strictEqual(
		applyOutputSelection.call(context({ output: 'raw' }, 1.1, true), items, operation),
		items,
	);
});

test('selected fields deduplicate choices, retain an identifier, and omit absent keys', () => {
	const items = [
		{ json: { id: 41, summary: 'Repair', status: 'open', unknown: true }, pairedItem: { item: 4 } },
	];
	const result = applyOutputSelection.call(
		context(
			{ output: 'selectedFields', outputFields: ['summary', 'summary', 'work_done'] },
			1.1,
			true,
		),
		items,
		operation,
	);
	assert.deepEqual(result, [{ json: { id: 41, summary: 'Repair' }, pairedItem: { item: 4 } }]);
	assert.deepEqual(
		applyOutputSelection.call(context({ output: 'selectedFields' }, 1.1, true), items, operation)[0]
			.json,
		{ id: 41 },
	);
});

test('selected fields reject invalid keys and malformed selections', () => {
	for (const outputFields of [
		['missing'],
		['__proto__'],
		['constructor'],
		['prototype'],
		['id', 1],
		'summary',
		null,
	]) {
		assert.throws(
			() =>
				applyOutputSelection.call(
					context({ output: 'selectedFields', outputFields }, 1.1, true),
					sample(),
					operation,
				),
			(error) =>
				error.name === 'NodeOperationError' && /documented response fields/.test(error.message),
		);
	}
	assert.throws(
		() => applyOutputSelection.call(context({ output: 'invalid' }, 1.1, true), sample(), operation),
		/valid Output/,
	);
});

test('selection only copies own properties and does not alter prototypes', () => {
	const json = Object.create({ summary: 'inherited', id: 99 });
	json.work_done = 'Own field';
	const result = applyOutputSelection.call(
		context({ output: 'selectedFields', outputFields: ['summary', 'work_done'] }, 1.1, true),
		[{ json }],
		operation,
	);
	assert.deepEqual(result[0].json, { work_done: 'Own field' });
	assert.equal(Object.getPrototypeOf(result[0].json), Object.prototype);
	assert.equal({}.polluted, undefined);
});

test('output fields come from individual response schemas, including arrays and pagination', () => {
	const listed = operations.find((entry) => entry.id === 'work_orders_list');
	assert.ok(responseFields(listed).some(([name]) => name === 'id'));
	assert.ok(!responseFields(listed).some(([name]) => name === 'results'));
	const arrayOperation = {
		...operation,
		responseSchema: { type: 'array', items: operation.responseSchema },
	};
	assert.deepEqual(responseFields(arrayOperation), responseFields(operation));
	const options = outputProperties(operation).find((field) => field.name === 'outputFields');
	assert.equal(options.type, 'multiOptions');
	assert.deepEqual(
		new Set(options.options.map((option) => option.value)),
		new Set(responseFields(operation).map(([name]) => name)),
	);
	const smallOperation = {
		...operation,
		responseSchema: { type: 'object', properties: { id: { type: 'integer' } } },
	};
	const items = [{ json: { id: 1, extra: true } }];
	assert.deepEqual(outputProperties(smallOperation), []);
	assert.strictEqual(applyOutputSelection.call(context(), items, smallOperation), items);
});

test('native n8n display conditions separate normal, tool, and v1 parameters', () => {
	const fields = outputProperties(operation);
	const params = {
		resource: operation.resource,
		operation: operation.id,
		output: 'selectedFields',
	};
	const visible = (version, tool) =>
		fields
			.filter((field) =>
				NodeHelpers.displayParameter(
					params,
					field,
					{ typeVersion: version },
					{ name: tool ? 'fieldhubTool' : 'fieldhub' },
				),
			)
			.map((field) => field.name);
	assert.deepEqual(visible(1, false), []);
	assert.deepEqual(visible(1, true), []);
	assert.deepEqual(visible(1.1, false), ['simplify']);
	assert.deepEqual(visible(1.1, true), ['output', 'outputFields']);
});

test('password inputs are masked and explain literal workflow storage', () => {
	const nested = properties.flatMap((field) =>
		field.type === 'collection' ? field.options : [field],
	);
	const passwords = nested.filter((field) => /^(body)?(confirm)?password$/i.test(field.name));
	assert.ok(passwords.length > 0);
	for (const field of passwords) {
		assert.equal(field.typeOptions?.password, true, field.name);
		assert.match(field.description, /Literal values are stored in the workflow/);
	}
});

test('actions use natural sentence case, retain acronyms, and avoid repeated resources', () => {
	const find = (id) => operations.find((entry) => entry.id === id);
	assert.equal(
		operationAction(find('billing_rules_retrieve'), 'Billing Rules'),
		'Get billing rule',
	);
	assert.equal(
		operationAction(find('storage_files_download_retrieve'), 'Storage'),
		'Get file download URL',
	);
	assert.equal(operationAction(find('accounts_retrieve'), 'Accounts'), 'Get account');
	assert.equal(operationAction(find('accounts_create'), 'Accounts'), 'Create account');
	assert.equal(operationAction(find('accounts_list'), 'Accounts'), 'Get many accounts');
	assert.equal(operationAction({ label: 'Get' }, 'Account Statuses'), 'Get account status');
	assert.equal(
		operationDescription(find('accounts_update'), 'Accounts'),
		'Replace all editable fields of the account',
	);
	const options = properties
		.filter((field) => field.name === 'operation')
		.flatMap((field) => field.options);
	assert.equal(options.length, operations.length);
	for (const option of options) {
		assert.ok(option.action);
		assert.doesNotMatch(option.action, /\b(a|an|the)\b/i);
		assert.doesNotMatch(option.description, /^(GET|POST|PUT|PATCH|DELETE|HEAD)\s+\//);
		assert.ok(operations.some((entry) => entry.id === option.value));
	}
});
