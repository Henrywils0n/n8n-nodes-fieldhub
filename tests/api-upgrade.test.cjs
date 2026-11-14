const test = require('node:test');
const assert = require('node:assert/strict');
const { operations } = require('../dist/nodes/Fieldhub/generated/catalog.js');
const { properties } = require('../dist/nodes/Fieldhub/properties.js');
const {
	buildRequest,
	prepareRequest,
	receiveResponse,
	paginate,
} = require('../dist/nodes/Fieldhub/request.js');
const { writableProperties } = require('../dist/nodes/Fieldhub/schema.js');

function operation(id) {
	const found = operations.find((entry) => entry.id === id);
	assert.ok(found, `Missing operation ${id}`);
	return found;
}

function context(parameters, itemIndex = 0) {
	return {
		getNodeParameter(name, fallback) {
			if (name === 'resource') return operation(parameters.operation).resource;
			return Object.hasOwn(parameters, name) ? parameters[name] : fallback;
		},
		getNode: () => ({
			id: 'api-upgrade',
			name: 'FieldHub',
			type: 'fieldhub',
			typeVersion: 1.1,
			position: [0, 0],
			parameters,
		}),
		getItemIndex: () => itemIndex,
		helpers: {},
	};
}

const contract = {
	account: 101,
	contract_type: 2,
	contract_number: 'EXAMPLE-001',
	start_date: '2026-01-01',
	initial_term: 36,
	initial_term_expiration_date: '2028-12-31',
};

const fields = (id) =>
	properties.filter((field) => field.displayOptions?.show?.operation?.includes(id));
const additionalFields = (id) =>
	fields(id).find((field) => field.name === 'additionalFields').options;

test('contract forms require an explicit expiration date and expose writable date and relationship fields', () => {
	const create = fields('contracts_create');
	for (const name of [
		'bodyAccount',
		'bodyContractType',
		'bodyContractNumber',
		'bodyStartDate',
		'bodyInitialTerm',
		'bodyInitialTermExpirationDate',
	]) {
		assert.equal(create.find((field) => field.name === name)?.required, true, name);
	}
	const optional = additionalFields('contracts_create');
	assert.equal(
		optional.find((field) => field.name === 'rateEscalationDate').displayName,
		'Rate Lock Until Date',
	);
	assert.equal(optional.find((field) => field.name === 'sites').type, 'json');
	assert.equal(optional.find((field) => field.name === 'sitesystems').type, 'json');
	const updateNames = writableProperties(operation('contracts_partial_update').body).map(
		([name]) => name,
	);
	assert.ok(!updateNames.includes('account'), 'Contract account is immutable');
	assert.ok(
		!updateNames.includes('next_expiration_date'),
		'Next expiration is computed by FieldHub',
	);
	assert.ok(!updateNames.includes('id'));
});

test('contract creation preserves explicit values, nested IDs, and separate JSON mode', () => {
	const values = {
		...contract,
		auto_renewal: false,
		renewal_term: null,
		rate_escalation_date: null,
		sites: [201, 202],
		sitesystems: [],
		notes: '',
	};
	const request = buildRequest(operation('contracts_create'), {
		bodyFields: { ...values, sites: '[201,202]', sitesystems: '[]' },
	});
	assert.equal(request.method, 'POST');
	assert.equal(request.url, '/contracts/');
	assert.deepEqual(request.body, values);
	for (const bodyJson of [values, JSON.stringify(values)]) {
		assert.deepEqual(
			buildRequest(operation('contracts_create'), {
				bodyMode: 'json',
				bodyJson,
				bodyFields: { notes: 'Do not merge', account: 999 },
			}).body,
			values,
		);
	}
	const { initial_term_expiration_date, ...missingExpiration } = contract;
	assert.throws(
		() => buildRequest(operation('contracts_create'), { bodyFields: missingExpiration }),
		/initial_term_expiration_date.*required/,
	);
	assert.throws(
		() =>
			buildRequest(operation('contracts_create'), { bodyFields: { ...contract, initial_term: 0 } }),
		/initial_term/,
	);
});

test('contract PATCH changes only supplied fields while PUT requires complete writable fields', async () => {
	const request = await prepareRequest.call(
		context({
			operation: 'contracts_partial_update',
			pathId: 301,
			additionalFields: {
				rateEscalationDate: '2028-12-31',
				autoRenewal: false,
				sitesystems: '[]',
				notes: null,
			},
		}),
		{ url: '/', baseURL: 'https://api.example.test/v3/' },
	);
	assert.equal(request.url, '/contracts/301/');
	assert.equal(request.method, 'PATCH');
	assert.deepEqual(request.body, {
		rate_escalation_date: '2028-12-31',
		auto_renewal: false,
		sitesystems: [],
		notes: null,
	});
	assert.equal(request.timeout, 30000);
	assert.throws(
		() =>
			buildRequest(operation('contracts_update'), {
				pathParameters: { id: 301 },
				bodyFields: { rate_escalation_date: '2028-12-31' },
			}),
		/required/,
	);
	const { account, ...replacement } = contract;
	const put = buildRequest(operation('contracts_update'), {
		pathParameters: { id: 301 },
		bodyFields: replacement,
	});
	assert.equal(put.method, 'PUT');
	assert.deepEqual(put.body, replacement);
});

test('contract detail, types, and lifecycle actions preserve documented paths and methods', () => {
	for (const [id, method, url] of [
		['contracts_retrieve', 'GET', '/contracts/301/'],
		['contracts_types_list', 'GET', '/contracts/types/'],
		['contracts_types_retrieve', 'GET', '/contracts/types/301/'],
		['contracts_archive_create', 'POST', '/contracts/301/archive/'],
		['contracts_resume_create', 'POST', '/contracts/301/resume/'],
		['contracts_unarchive_create', 'POST', '/contracts/301/unarchive/'],
	]) {
		const request = buildRequest(operation(id), { pathParameters: { id: 301 } });
		assert.equal(request.method, method, id);
		assert.equal(request.url, url, id);
		assert.equal(request.body, undefined, id);
	}
	assert.throws(
		() => buildRequest(operation('contracts_terminate_create'), { pathParameters: { id: 301 } }),
		/required/,
	);
	const termination = buildRequest(operation('contracts_terminate_create'), {
		pathParameters: { id: 301 },
		bodyFields: {
			stop_date: '2026-12-31',
			termination_cause: 'Example reason',
			termination_notes: null,
		},
	});
	assert.equal(termination.method, 'POST');
	assert.equal(termination.url, '/contracts/301/terminate/');
	assert.deepEqual(termination.body, {
		stop_date: '2026-12-31',
		termination_cause: 'Example reason',
		termination_notes: null,
	});
});

test('contract list keeps repeated site/system filters across pages and links results to the input', async () => {
	const ctx = context({ operation: 'contracts_list', returnAll: true, simplify: false }, 4);
	const filters = {
		account: 101,
		sites: [201, 202],
		sitesystems: [401, 402],
		auto_renewal: false,
		status__in: ['active', 'pending'],
		ordering: '-next_expiration_date',
	};
	const requestData = {
		options: {
			...buildRequest(operation('contracts_list'), { queryParameters: filters, returnAll: true }),
			baseURL: 'https://api.example.test/v3',
		},
		postReceive: [{ data: { parameterValue: undefined }, actions: [receiveResponse] }],
	};
	const calls = [];
	const originalHooks = requestData.postReceive;
	const responses = [
		{
			statusCode: 200,
			headers: {},
			body: { count: 3, next: '?offset=2', results: [{ id: 301 }, { id: 302 }] },
		},
		{ statusCode: 200, headers: {}, body: { count: 3, next: null, results: [{ id: 303 }] } },
	];
	ctx.makeRoutingRequest = async (current) => {
		calls.push(structuredClone(current.options));
		const response = responses[calls.length - 1];
		assert.ok(response, 'No unexpected page request');
		let items = [];
		for (const step of requestData.postReceive) {
			for (const action of step.actions) items = await action.call(ctx, items, response);
		}
		return items;
	};
	const result = await paginate.call(ctx, requestData);
	assert.deepEqual(
		result,
		[301, 302, 303].map((id) => ({ json: { id }, pairedItem: { item: 4 } })),
	);
	assert.deepEqual(
		calls.map(({ qs }) => qs.offset),
		[0, 2],
	);
	for (const request of calls) {
		assert.equal(request.method, 'GET');
		assert.equal(request.url, '/contracts/');
		assert.equal(request.arrayFormat, 'repeat');
		assert.deepEqual(request.qs, {
			...filters,
			status__in: 'active,pending',
			limit: 100,
			offset: request.qs.offset,
		});
	}
	assert.equal(requestData.postReceive, originalHooks);
});

test('contract detail raw output retains renewal dates and site systems without losing item links', async () => {
	const ctx = context({ operation: 'contracts_retrieve', simplify: false }, 2);
	const body = {
		id: 301,
		...contract,
		next_expiration_date: '2029-01-31',
		rate_escalation_date: '2028-12-31',
		sites: [{ id: 201 }],
		sitesystems: [{ id: 401 }],
	};
	assert.deepEqual(await receiveResponse.call(ctx, [], { statusCode: 200, headers: {}, body }), [
		{ json: body, pairedItem: { item: 2 } },
	]);
});

test('recurring billing contract links are editable with form fields or explicit JSON null', async () => {
	for (const id of [
		'recurrings_billings_create',
		'recurrings_billings_update',
		'recurrings_billings_partial_update',
	]) {
		const field = additionalFields(id).find((entry) => entry.name === 'contract');
		assert.equal(field.type, 'number', id);
		assert.match(field.description, /same.*account/);
	}
	const linked = await prepareRequest.call(
		context({
			operation: 'recurrings_billings_partial_update',
			pathId: 501,
			additionalFields: { contract: 301 },
		}),
		{ url: '/', baseURL: 'https://api.example.test/v3' },
	);
	assert.equal(linked.method, 'PATCH');
	assert.equal(linked.url, '/recurrings/billings/501/');
	assert.deepEqual(linked.body, { contract: 301 });
	const cleared = buildRequest(operation('recurrings_billings_partial_update'), {
		pathParameters: { id: 501 },
		bodyMode: 'json',
		bodyJson: '{"contract":null}',
		bodyFields: { contract: 999 },
	});
	assert.deepEqual(cleared.body, { contract: null });
	assert.throws(
		() =>
			buildRequest(operation('recurrings_billings_partial_update'), {
				pathParameters: { id: 501 },
				bodyJson: { contract: 'EXAMPLE-001' },
				bodyMode: 'json',
			}),
		/contract.*integer/,
	);
});

test('general ledger requests preserve nested row amounts and the entry-set path identifier', () => {
	const splits = [
		{
			entries: [
				{ business_unit: 1, register: 10, sum_db: 125.25, note: null },
				{ business_unit: 1, register: 11, sum_cr: 125.25, references: [] },
			],
		},
	];
	for (const [id, url] of [
		['entries_create', '/entries/'],
		['entries_simple_create', '/entries/simple/'],
	]) {
		const request = buildRequest(operation(id), {
			bodyFields: {
				operation: 2,
				entry_date: '2026-01-31',
				splits: JSON.stringify(splits),
				note: '',
			},
		});
		assert.equal(request.method, 'POST');
		assert.equal(request.url, url);
		assert.deepEqual(request.body, { operation: 2, entry_date: '2026-01-31', splits, note: '' });
	}
	assert.throws(
		() =>
			buildRequest(operation('entries_create'), {
				bodyFields: {
					operation: 2,
					entry_date: '2026-01-31',
					splits: [{ entries: [{ register: 10, sum_db: 1 }] }],
				},
			}),
		/business_unit.*required/,
	);
	const detail = buildRequest(operation('entries_retrieve'), {
		pathParameters: { entryset_id: 601 },
	});
	assert.equal(detail.method, 'GET');
	assert.equal(detail.url, '/entries/601/');
	assert.throws(
		() => buildRequest(operation('entries_retrieve'), { pathParameters: { id: 601 } }),
		/entryset_id.*required/,
	);
	for (const [id, url] of [
		['entries_categories_list', '/entries/categories/'],
		['entries_categories_retrieve', '/entries/categories/3/'],
	]) {
		const request = buildRequest(operation(id), { pathParameters: { id: 3 } });
		assert.equal(request.method, 'GET');
		assert.equal(request.url, url);
	}
});

test('recurring change reason filters preserve enum values and false flags', () => {
	const request = buildRequest(operation('recurrings_change_reasons_list'), {
		queryParameters: { context: 'edit_increase', allow_select: true, is_system: false },
		limit: 20,
	});
	assert.equal(request.method, 'GET');
	assert.equal(request.url, '/recurrings/change-reasons/');
	assert.deepEqual(request.qs, {
		context: 'edit_increase',
		allow_select: true,
		is_system: false,
		limit: 20,
		offset: 0,
	});
	assert.equal(
		buildRequest(operation('recurrings_change_reasons_retrieve'), { pathParameters: { id: 3 } })
			.url,
		'/recurrings/change-reasons/3/',
	);
	assert.throws(
		() =>
			buildRequest(operation('recurrings_change_reasons_list'), {
				queryParameters: { context: 'invented' },
			}),
		/choices/,
	);
});

test('storage metadata supports the documented Contract model and rejects wrong model casing', () => {
	const metadata = {
		name: 'example-contract.pdf',
		description: 'Example contract',
		objects: [{ model: 'Contract', id: 301 }],
	};
	assert.deepEqual(
		buildRequest(operation('storage_files_create'), { bodyFields: metadata }).body,
		metadata,
	);
	assert.throws(
		() =>
			buildRequest(operation('storage_files_create'), {
				bodyFields: { ...metadata, objects: [{ model: 'contract', id: 301 }] },
			}),
		/model.*choices/,
	);
});

test('billing group update responses retain generated period IDs on both saved node versions', async () => {
	for (const id of [
		'recurrings_billing_groups_update',
		'recurrings_billing_groups_partial_update',
	]) {
		for (const version of [1, 1.1]) {
			const ctx = context({ operation: id }, 3);
			const node = ctx.getNode();
			ctx.getNode = () => ({ ...node, typeVersion: version });
			for (const periods of [[], [701, 702]]) {
				const body = { id: 601, periods };
				assert.deepEqual(
					await receiveResponse.call(ctx, [], { statusCode: 200, headers: {}, body }),
					[{ json: body, pairedItem: { item: 3 } }],
				);
			}
		}
	}
});
