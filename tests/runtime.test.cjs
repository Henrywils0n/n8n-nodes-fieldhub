const test = require('node:test');
const assert = require('node:assert/strict');
const { operations } = require('../dist/nodes/Fieldhub/generated/catalog.js');
const {
	normalizeBaseUrl,
	parameterName,
	resolveSchema,
	buildRequest,
	prepareRequest,
	receiveResponse,
	paginate,
} = require('../dist/nodes/Fieldhub/request.js');

const operation = (id) => {
	const found = operations.find((entry) => entry.id === id);
	assert.ok(found, `Missing operation ${id}`);
	return found;
};
const context = (parameters = {}, itemIndex = 0, typeVersion = 1) => ({
	getNodeParameter(name, fallback) {
		if (name === 'resource' && !Object.hasOwn(parameters, name) && parameters.operation)
			return operation(parameters.operation).resource;
		const value = Object.hasOwn(parameters, name) ? parameters[name] : fallback;
		if (value === undefined) throw new Error(`Could not get parameter "${name}"`);
		return value;
	},
	getNode() {
		return {
			id: 'test-fieldhub',
			name: 'FieldHub',
			type: 'fieldhub',
			typeVersion,
			position: [0, 0],
			parameters,
		};
	},
	getItemIndex: () => itemIndex,
	getCredentials: async () => ({
		baseUrl: 'https://api.example.test/v3/',
		apiKey: 'test-only-placeholder',
	}),
	getInputData: () => ({ json: {} }),
	helpers: {},
});
const fullResponse = (body, statusCode = 200, headers = {}) => ({ body, statusCode, headers });
const createWorkOrder = {
	account: 101,
	business_unit: 3,
	site: 202,
	summary: 'Replace test sensor',
	workorder_type: 4,
};

test('base URL normalization preserves the host and includes v3 exactly once', () => {
	for (const input of [
		'https://api.example.test',
		'https://api.example.test/',
		'https://api.example.test/v3',
		'https://api.example.test/v3/',
	]) {
		assert.equal(normalizeBaseUrl(input), 'https://api.example.test/v3');
	}
});

test('missing API URLs stop requests with an actionable credential error', async () => {
	for (const baseURL of [undefined, null, '', ' \t\n ']) {
		assert.throws(() => normalizeBaseUrl(baseURL), /API URL is required/);
		await assert.rejects(
			prepareRequest.call(context({ operation: 'work_orders_list' }, 3), { url: '/', baseURL }),
			(error) =>
				error.name === 'NodeOperationError' &&
				error.context.itemIndex === 3 &&
				/API URL is required/.test(error.message),
		);
	}
});

test('UI parameter naming is stable for nested identifiers and API snake case', () => {
	assert.equal(parameterName('path', 'account_id'), 'pathAccountId');
	assert.equal(parameterName('body', 'business_unit'), 'bodyBusinessUnit');
	assert.equal(parameterName('query', 'start_date'), 'queryStartDate');
});

test('request construction preserves methods and substitutes every nested path identifier', () => {
	const request = buildRequest(operation('accounts_contacts_retrieve'), {
		pathParameters: { account_id: '21', id: 73 },
	});
	assert.equal(request.method, 'GET');
	assert.equal(request.url, '/accounts/21/contacts/73/');
	assert.equal(request.body, undefined);
	assert.equal(request.json, true);
	assert.throws(
		() => buildRequest(operation('accounts_contacts_retrieve'), { pathParameters: { id: 73 } }),
		/account_id|required/i,
	);
});

test('query serialization preserves explicit false and serializes documented comma-separated arrays', () => {
	const request = buildRequest(operation('accounts_contacts_list'), {
		pathParameters: { account_id: '21' },
		queryParameters: { account_type: [1, 2], email_opt_in: false, search: 'Ann & Co' },
		limit: 20,
	});
	assert.equal(request.qs.account_type, '1,2');
	assert.equal(request.qs.email_opt_in, false);
	assert.equal(request.qs.search, 'Ann & Co');
	assert.equal(request.qs.limit, 20);
	assert.equal(request.qs.industry, undefined);
});

test('required report queries remain required and correctly named', () => {
	const report = operation('income_statement_report_feed');
	assert.throws(() => buildRequest(report, {}), /required|end_date|start_date|template_id/i);
	const request = buildRequest(report, {
		queryParameters: { start_date: '2026-01-01', end_date: '2026-01-31', template_id: 8 },
	});
	assert.equal(request.qs.start_date, '2026-01-01');
	assert.equal(request.qs.end_date, '2026-01-31');
	assert.equal(request.qs.template_id, 8);
});

test('GET list requests default to a limit of 50 and retain the initial offset', () => {
	const request = buildRequest(operation('work_orders_list'), {
		queryParameters: { offset: 7, number: 'WO-123' },
	});
	assert.equal(request.qs.limit, 50);
	assert.equal(request.qs.offset, 7);
	assert.equal(request.qs.number, 'WO-123');
});

test('documented descending ordering is accepted and preserved', () => {
	const request = buildRequest(operation('work_orders_list'), {
		queryParameters: { ordering: '-id' },
	});
	assert.equal(request.qs.ordering, '-id');
});

test('form bodies preserve explicit false, zero, empty arrays, and nullable values', () => {
	const request = buildRequest(operation('storage_files_create'), {
		bodyMode: 'fields',
		bodyFields: {
			name: 'notes.txt',
			description: '',
			objects: [],
			file_tags: [],
			show_customer: false,
			expected_size: 0,
		},
	});
	assert.deepEqual(request.body, {
		name: 'notes.txt',
		description: '',
		objects: [],
		file_tags: [],
		show_customer: false,
		expected_size: 0,
	});
	const patched = buildRequest(operation('work_orders_partial_update'), {
		pathParameters: { id: 7 },
		bodyFields: { assigned: null, summary: '' },
	});
	assert.deepEqual(patched.body, { assigned: null, summary: '' });
});

test('PATCH omits fields not supplied while PUT enforces writable required fields', () => {
	const patch = buildRequest(operation('work_orders_partial_update'), {
		pathParameters: { id: 7 },
		bodyFields: { completion_notes: 'Finished' },
	});
	assert.equal(patch.method, 'PATCH');
	assert.deepEqual(patch.body, { completion_notes: 'Finished' });
	assert.throws(
		() =>
			buildRequest(operation('work_orders_update'), {
				pathParameters: { id: 7 },
				bodyFields: { summary: 'Finished' },
			}),
		/required|bill_status|primary_contact/i,
	);
	const put = buildRequest(operation('work_orders_update'), {
		pathParameters: { id: 7 },
		bodyFields: { summary: 'Finished', bill_status: 'billable', primary_contact: null },
	});
	assert.equal(put.method, 'PUT');
	assert.equal(put.body.id, undefined);
});

test('JSON mode accepts objects and JSON text without merging form fields', () => {
	for (const bodyJson of [createWorkOrder, JSON.stringify(createWorkOrder)]) {
		const request = buildRequest(operation('work_orders_create'), {
			bodyMode: 'json',
			bodyJson,
			bodyFields: { summary: 'Must not overwrite', assigned: 55 },
		});
		assert.deepEqual(request.body, createWorkOrder);
	}
	assert.throws(
		() => buildRequest(operation('work_orders_create'), { bodyMode: 'json', bodyJson: '{broken' }),
		/JSON|parse|property/i,
	);
});

test('read-only fields are rejected before sending and cannot be included via JSON', () => {
	assert.throws(
		() =>
			buildRequest(operation('work_orders_partial_update'), {
				pathParameters: { id: 7 },
				bodyMode: 'json',
				bodyJson: { id: 999, summary: 'No rewrite' },
			}),
		/read.only|id/i,
	);
});

test('nested JSON editor values become arrays and objects in the request', () => {
	const request = buildRequest(operation('work_orders_create'), {
		bodyFields: { ...createWorkOrder, process: '[5,6]', details: '[]' },
	});
	assert.deepEqual(request.body.process, [5, 6]);
	assert.deepEqual(request.body.details, []);
	assert.throws(
		() =>
			buildRequest(operation('work_orders_create'), {
				bodyFields: { ...createWorkOrder, process: '{"wrong":"shape"}' },
			}),
		/array|process/i,
	);
});

test('schema references and allOf wrappers resolve writable fields', () => {
	const schema = resolveSchema({ $ref: '#/components/schemas/AccountAdd' });
	assert.equal(schema.properties.name.type, 'string');
	const address = resolveSchema(schema.properties.address);
	assert.equal(address.type, 'object');
	assert.ok(Object.keys(address.properties).length > 0);
});

test('response hook splits arrays and paginated results into linked n8n items', async () => {
	for (const [id, body] of [
		['profile_retrieve', [{ id: 1 }, { id: 2 }]],
		['work_orders_list', { count: 2, next: null, results: [{ id: 1 }, { id: 2 }] }],
	]) {
		const result = await receiveResponse.call(
			context({ operation: id }, 3),
			[],
			fullResponse(body),
		);
		assert.deepEqual(
			result.map(({ json }) => json),
			[{ id: 1 }, { id: 2 }],
		);
		assert.ok(result.every(({ pairedItem }) => pairedItem.item === 3));
	}
});

test('204 returns a success item while 202 preserves processing status without polling', async () => {
	const deleted = await receiveResponse.call(
		context({ operation: 'materials_destroy' }, 2),
		[],
		fullResponse('', 204),
	);
	assert.deepEqual(deleted, [{ json: { success: true }, pairedItem: { item: 2 } }]);
	const processing = await receiveResponse.call(
		context({ operation: 'income_statement_report_feed' }),
		[],
		fullResponse({ status: 'processing', progress: 25 }, 202, { 'retry-after': '5' }),
	);
	assert.deepEqual(processing[0].json, {
		status: 'processing',
		progress: 25,
		statusCode: 202,
		retryAfter: '5',
	});
});

test('empty accepted responses retain pending metadata for reports and deletions', async () => {
	for (const body of ['', null, undefined]) {
		for (const typeVersion of [1, 1.1]) {
			for (const id of ['income_statement_report_feed', 'materials_destroy']) {
				const result = await receiveResponse.call(
					context({ operation: id }, 2, typeVersion),
					[],
					fullResponse(body, 202, { 'retry-after': '5' }),
				);
				assert.deepEqual(result, [
					{ json: { statusCode: 202, retryAfter: '5' }, pairedItem: { item: 2 } },
				]);
			}
		}
	}
});

test('download response retains the documented download URL', async () => {
	const body = { url: 'https://files.example.test/test-download' };
	const result = await receiveResponse.call(
		context({ operation: 'storage_files_download_retrieve' }),
		[],
		fullResponse(body),
	);
	assert.deepEqual(result[0].json, body);
});

test('new nodes confirm completed deletions while legacy nodes keep their output contract', async () => {
	for (const [body, status] of [
		['', 204],
		[{ archived: true }, 200],
	]) {
		const result = await receiveResponse.call(
			context({ operation: 'materials_destroy' }, 4, 1.1),
			[],
			fullResponse(body, status),
		);
		assert.deepEqual(result, [{ json: { deleted: true }, pairedItem: { item: 4 } }]);
	}
	const legacy = await receiveResponse.call(
		context({ operation: 'materials_destroy' }, 4),
		[],
		fullResponse({ archived: true }),
	);
	assert.deepEqual(legacy, [{ json: { archived: true }, pairedItem: { item: 4 } }]);
	const pending = await receiveResponse.call(
		context({ operation: 'materials_destroy' }, 4, 1.1),
		[],
		fullResponse({ status: 'pending' }, 202, { 'retry-after': '5' }),
	);
	assert.deepEqual(pending, [
		{ json: { status: 'pending', statusCode: 202, retryAfter: '5' }, pairedItem: { item: 4 } },
	]);
});

test('new response output controls preserve pairing and offer unchanged raw details', async () => {
	const body = {
		id: 17,
		number: 'WO-17',
		summary: 'Example',
		status: 'active',
		work_done: 'Test notes',
		account: { id: 22, name: 'Example account' },
		site: { id: 33 },
		business_unit: { id: 44 },
		billing_rule: { id: 55 },
		tax_status: 1,
		tax_zone: 2,
		tax_group: 3,
		operation_status: 'working',
		unknown_future_field: 'preserve in raw mode',
	};
	const simplified = await receiveResponse.call(
		context({ operation: 'work_orders_retrieve' }, 3, 1.1),
		[],
		fullResponse(body),
	);
	assert.equal(simplified[0].json.id, 17);
	assert.ok(Object.keys(simplified[0].json).length <= 10);
	assert.deepEqual(simplified[0].pairedItem, { item: 3 });
	for (const [version, parameters] of [
		[1, {}],
		[1.1, { simplify: false }],
	]) {
		const result = await receiveResponse.call(
			context({ operation: 'work_orders_retrieve', ...parameters }, 3, version),
			[],
			fullResponse(body),
		);
		assert.deepEqual(result, [{ json: body, pairedItem: { item: 3 } }]);
	}
});

test('malformed API JSON reports the input item and an actionable n8n error', async () => {
	await assert.rejects(
		receiveResponse.call(
			context({ operation: 'work_orders_retrieve' }, 6, 1.1),
			[],
			fullResponse('{broken'),
		),
		(error) =>
			error.name === 'NodeOperationError' &&
			error.context.itemIndex === 6 &&
			/API response must contain valid JSON/.test(error.message),
	);
});

test('request transport rejects plaintext and does not follow redirects', async () => {
	const ctx = context({ operation: 'work_orders_list' }, 2, 1.1);
	await assert.rejects(
		prepareRequest.call(ctx, { url: '/', baseURL: 'http://api.example.test' }),
		(error) =>
			error.name === 'NodeOperationError' &&
			error.context.itemIndex === 2 &&
			/HTTPS/.test(error.message),
	);
	const request = await prepareRequest.call(ctx, { url: '/', baseURL: 'https://api.example.test' });
	assert.equal(request.disableFollowRedirect, true);
	assert.equal(request.sendCredentialsOnCrossOriginRedirect, false);
	assert.equal(request.ignoreHttpStatusErrors, false);
});

test('empty successful creation responses return a useful success item', async () => {
	for (const body of ['', null, undefined]) {
		const result = await receiveResponse.call(
			context({ operation: 'events_handlers_add_create' }, 2),
			[],
			fullResponse(body, 201),
		);
		assert.deepEqual(result, [{ json: { success: true }, pairedItem: { item: 2 } }]);
	}
});

test('untyped webhook configuration uses JSON fields and sends an object', () => {
	const { Fieldhub } = require('../dist/nodes/Fieldhub/Fieldhub.node.js');
	const op = operation('events_handlers_add_create');
	const field = new Fieldhub().description.properties.find(
		(entry) =>
			entry.name === 'bodyConfig' && entry.displayOptions?.show?.operation?.includes(op.id),
	);
	assert.equal(field.type, 'json');
	const request = buildRequest(op, {
		pathParameters: { handler_slug: 'test-handler' },
		bodyFields: {
			config: '{"url":"https://example.test/webhook"}',
			event_type: 1,
			status: 'enabled',
		},
	});
	assert.deepEqual(request.body.config, { url: 'https://example.test/webhook' });
});

test('pre-send hook maps n8n fields and keeps separate input items linked to their outputs', async () => {
	const outputs = [];
	for (const [itemIndex, id] of [41, 42].entries()) {
		const ctx = context(
			{
				operation: 'work_orders_partial_update',
				pathId: id,
				additionalFields: { completionNotes: `Completed ${id}`, assigned: null },
			},
			itemIndex,
		);
		const request = await prepareRequest.call(ctx, {
			url: '/',
			method: 'GET',
			body: {},
			baseURL: 'https://api.example.test/v3/',
		});
		assert.equal(request.url, `/work-orders/${id}/`);
		assert.equal(request.baseURL, 'https://api.example.test/v3');
		assert.equal(request.method, 'PATCH');
		assert.equal(request.timeout, 30000);
		assert.deepEqual(request.body, { assigned: null, completion_notes: `Completed ${id}` });
		outputs.push(...(await receiveResponse.call(ctx, [], fullResponse({ id }))));
	}
	assert.deepEqual(outputs, [
		{ json: { id: 41 }, pairedItem: { item: 0 } },
		{ json: { id: 42 }, pairedItem: { item: 1 } },
	]);
});

test('pre-send hook maps required and optional queries without adding a GET body', async () => {
	const ctx = context({
		operation: 'income_statement_report_feed',
		queryStartDate: '2026-01-01',
		queryEndDate: '2026-01-31',
		queryTemplateId: 3,
		filters: { accountIds: '[11,12]', offset: 5 },
		limit: 25,
	});
	const request = await prepareRequest.call(ctx, {
		url: '/',
		body: {},
		baseURL: 'https://api.example.test/v3',
	});
	assert.deepEqual(request.qs, {
		account_ids: [11, 12],
		end_date: '2026-01-31',
		offset: 5,
		start_date: '2026-01-01',
		template_id: 3,
		limit: 25,
	});
	assert.equal(Object.hasOwn(request, 'body'), false);
	assert.equal(request.arrayFormat, 'repeat');
});

test('pre-send validation errors retain the failing input item index', async () => {
	await assert.rejects(
		prepareRequest.call(context({ operation: 'accounts_contacts_retrieve', pathId: 7 }, 4), {
			url: '/',
		}),
		(error) =>
			error.name === 'NodeOperationError' &&
			error.context.itemIndex === 4 &&
			/account_id|pathAccountId/.test(error.message),
	);
});

test('binary upload reads n8n-managed bytes from the selected property', async () => {
	const bytes = Buffer.from([0, 255, 1, 2]);
	const calls = [];
	const ctx = context(
		{ operation: 'storage_files_upload_update', pathId: 17, binaryPropertyName: 'attachment' },
		2,
	);
	ctx.helpers.assertBinaryData = (name) => {
		calls.push(['assert', name]);
		return { fileName: 'test.dat', mimeType: 'application/octet-stream' };
	};
	ctx.helpers.getBinaryDataBuffer = async (name) => {
		calls.push(['read', name]);
		return bytes;
	};
	const request = await prepareRequest.call(ctx, {
		url: '/',
		body: {},
		baseURL: 'https://api.example.test/v3',
	});
	assert.equal(request.url, '/storage/files/17/upload/');
	assert.equal(request.method, 'PUT');
	assert.equal(request.body, bytes);
	assert.equal(request.json, false);
	assert.equal(request.headers['Content-Type'], 'application/octet-stream');
	assert.deepEqual(calls, [
		['assert', 'attachment'],
		['read', 'attachment'],
	]);
	const result = await receiveResponse.call(ctx, [], fullResponse('{"id":17,"status":"ready"}'));
	assert.deepEqual(result, [{ json: { id: 17, status: 'ready' }, pairedItem: { item: 2 } }]);
});

test('vendor bill uploads combine documented fields and binary bytes in multipart form data', async () => {
	const bytes = Buffer.from('document contents');
	const ctx = context({
		operation: 'vendor_bills_upload_file_create',
		pathId: 18,
		bodyDescription: 'Receipt scan',
		additionalFields: { fileTags: '[3,4]' },
		binaryPropertyName: 'document',
	});
	ctx.helpers.assertBinaryData = () => ({ fileName: 'receipt.pdf', mimeType: 'application/pdf' });
	ctx.helpers.getBinaryDataBuffer = async () => bytes;
	const request = await prepareRequest.call(ctx, {
		url: '/',
		baseURL: 'https://api.example.test/v3',
	});
	assert.equal(request.url, '/vendor-bills/18/upload-file/');
	assert.equal(request.method, 'POST');
	assert.equal(request.json, false);
	assert.ok(Buffer.isBuffer(request.body));
	assert.match(request.headers['Content-Type'], /^multipart\/form-data; boundary=/);
	const message = request.body.toString();
	assert.ok(message.includes('name="description"\r\n\r\nReceipt scan'));
	assert.ok(message.includes('name="file_tags"\r\n\r\n3'));
	assert.ok(message.includes('name="file_tags"\r\n\r\n4'));
	assert.ok(message.includes('name="file"; filename="receipt.pdf"'));
	assert.ok(message.includes('Content-Type: application/pdf\r\n\r\ndocument contents'));
});

// n8n runs preSend once. makeRoutingRequest closes over the original ResultOptions
// for postReceive, so this harness deliberately ignores any alternate hook object.
function paginationHarness(parameters, responses, itemIndex = 0) {
	const ctx = context({ operation: 'work_orders_list', ...parameters }, itemIndex);
	const requestData = {
		options: {
			...buildRequest(operation(ctx.getNodeParameter('operation')), {
				queryParameters: { number: 'WO-77', offset: parameters.offset ?? 0 },
				returnAll: parameters.returnAll,
				limit: parameters.limit,
			}),
			baseURL: 'https://api.example.test/v3',
		},
		preSend: [prepareRequest],
		postReceive: [{ data: { parameterValue: undefined }, actions: [receiveResponse] }],
	};
	const originalPostReceive = requestData.postReceive;
	const calls = [];
	ctx.makeRoutingRequest = async (currentRequest) => {
		assert.equal(currentRequest, requestData, 'Use the original request context');
		calls.push(structuredClone(currentRequest.options));
		const response = responses[calls.length - 1];
		assert.ok(response, 'Unexpected extra request or automatic report polling');
		if (response instanceof Error) throw response;
		let items = [{ json: response.body }];
		for (const step of requestData.postReceive) {
			for (const action of step.actions) items = await action.call(ctx, items, response);
		}
		return items;
	};
	return { ctx, requestData, originalPostReceive, calls };
}

test('Return All advances offset, preserves filters, and ignores next-link hosts', async () => {
	const harness = paginationHarness(
		{ returnAll: true, offset: 8 },
		[
			fullResponse({
				count: 3,
				next: 'https://different.example.test/anything?offset=10',
				results: [{ id: 1 }, { id: 2 }],
			}),
			fullResponse({ count: 3, next: null, results: [{ id: 3 }] }),
		],
		5,
	);
	const result = await paginate.call(harness.ctx, harness.requestData);
	assert.deepEqual(
		result.map(({ json }) => json),
		[{ id: 1 }, { id: 2 }, { id: 3 }],
	);
	assert.ok(result.every(({ pairedItem }) => pairedItem.item === 5));
	assert.deepEqual(
		harness.calls.map(({ qs }) => qs),
		[
			{ number: 'WO-77', offset: 8, limit: 100 },
			{ number: 'WO-77', offset: 10, limit: 100 },
		],
	);
	assert.ok(
		harness.calls.every(
			({ baseURL, url }) => baseURL === 'https://api.example.test/v3' && url === '/work-orders/',
		),
	);
	assert.equal(harness.requestData.postReceive, harness.originalPostReceive);
});

test('limited pagination requests only the remaining count and stops at the user limit', async () => {
	const harness = paginationHarness({ returnAll: false, limit: 3 }, [
		fullResponse({ next: '?offset=2', results: [{ id: 1 }, { id: 2 }] }),
		fullResponse({ next: '?offset=4', results: [{ id: 3 }, { id: 4 }] }),
	]);
	const result = await paginate.call(harness.ctx, harness.requestData);
	assert.deepEqual(
		result.map(({ json }) => json.id),
		[1, 2, 3],
	);
	assert.deepEqual(
		harness.calls.map(({ qs }) => qs.limit),
		[3, 1],
	);
	assert.equal(harness.calls.length, 2);
});

test('empty pages stop pagination even when an inconsistent next link is present', async () => {
	const harness = paginationHarness({ returnAll: true }, [
		fullResponse({ next: '?offset=100', results: [] }),
	]);
	assert.deepEqual(await paginate.call(harness.ctx, harness.requestData), []);
	assert.equal(harness.calls.length, 1);
});

test('processing report responses stop pagination and return status without polling', async () => {
	const harness = paginationHarness({ returnAll: true }, [
		fullResponse({ status: 'pending', session_uuid: 'session-1' }, 202, { 'retry-after': '2' }),
	]);
	const result = await paginate.call(harness.ctx, harness.requestData);
	assert.equal(harness.calls.length, 1);
	assert.deepEqual(result[0].json, {
		status: 'pending',
		session_uuid: 'session-1',
		statusCode: 202,
		retryAfter: '2',
	});
});

test('an empty pending report stops pagination without reporting success', async () => {
	const harness = paginationHarness({ returnAll: true }, [fullResponse('', 202)]);
	const result = await paginate.call(harness.ctx, harness.requestData);
	assert.equal(harness.calls.length, 1);
	assert.deepEqual(result, [
		{ json: { statusCode: 202, retryAfter: null }, pairedItem: { item: 0 } },
	]);
	assert.equal(harness.requestData.postReceive, harness.originalPostReceive);
});

test('request errors propagate without retry and pagination restores response hooks', async () => {
	const failure = new Error('HTTP 429: rate limited');
	const harness = paginationHarness({ returnAll: true }, [failure]);
	await assert.rejects(
		paginate.call(harness.ctx, harness.requestData),
		(error) => error === failure,
	);
	assert.equal(harness.calls.length, 1);
	assert.equal(harness.requestData.postReceive, harness.originalPostReceive);
});

test('representative API errors retain HTTP code and item context', async () => {
	for (const statusCode of [400, 401, 403, 429, 500]) {
		await assert.rejects(
			receiveResponse.call(
				context({ operation: 'work_orders_create' }, 6),
				[],
				fullResponse({ detail: 'API rejected request' }, statusCode),
			),
			(error) =>
				error.name === 'NodeApiError' &&
				error.httpCode === String(statusCode) &&
				error.context.itemIndex === 6,
		);
	}
});

test('n8n resolves visible parameters without inserting omitted optional PATCH fields', () => {
	const { NodeHelpers } = require('n8n-workflow');
	const { Fieldhub } = require('../dist/nodes/Fieldhub/Fieldhub.node.js');
	const description = new Fieldhub().description;
	const resolve = (values) =>
		NodeHelpers.getNodeParameters(
			description.properties,
			values,
			true,
			false,
			{ typeVersion: 1 },
			description,
		);
	const patch = resolve({
		resource: 'workOrders',
		operation: 'work_orders_partial_update',
		pathId: 9,
	});
	assert.equal(patch.bodyMode, 'fields');
	assert.deepEqual(patch.additionalFields, {});
	assert.equal(Object.hasOwn(patch, 'bodyId'), false);
	assert.equal(Object.hasOwn(patch, 'bodySummary'), false);
	assert.equal(Object.hasOwn(patch, 'bodyJson'), false);
	const raw = resolve({
		resource: 'workOrders',
		operation: 'work_orders_create',
		bodyMode: 'json',
		bodyJson: JSON.stringify(createWorkOrder),
	});
	assert.equal(raw.bodyJson, JSON.stringify(createWorkOrder));
	assert.equal(Object.hasOwn(raw, 'bodyAccount'), false);
	assert.equal(Object.hasOwn(raw, 'additionalFields'), false);
	const all = resolve({ resource: 'workOrders', operation: 'work_orders_list', returnAll: true });
	assert.equal(Object.hasOwn(all, 'limit'), false);
	const limited = resolve({ resource: 'workOrders', operation: 'work_orders_list' });
	assert.equal(limited.returnAll, false);
	assert.equal(limited.limit, 50);
});

test('writable forms expose nullable enums, nested JSON editors, and descending ordering choices', () => {
	const { Fieldhub } = require('../dist/nodes/Fieldhub/Fieldhub.node.js');
	const properties = new Fieldhub().description.properties;
	const fields = (id) =>
		properties.filter((field) => field.displayOptions?.show?.operation?.includes(id));
	const additional = fields('work_orders_create').find(({ name }) => name === 'additionalFields');
	const billStatus = additional.options.find(({ name }) => name === 'billStatus');
	assert.equal(billStatus.type, 'options');
	assert.ok(billStatus.options.some(({ value }) => value === 'billable'));
	assert.equal(additional.options.find(({ name }) => name === 'details').type, 'json');
	assert.equal(additional.options.find(({ name }) => name === 'process').type, 'json');
	const filters = fields('work_orders_list').find(({ name }) => name === 'filters');
	assert.ok(
		filters.options
			.find(({ name }) => name === 'ordering')
			.options.some(({ value }) => value === '-id'),
	);
});

test('disabled OAuth2 and unsupported saved authentication modes fail before request construction', async () => {
	for (const typeVersion of [1, 1.1]) {
		for (const authentication of ['oAuth2', 'oauth2', 'unsupported']) {
			await assert.rejects(
				prepareRequest.call(
					context({ operation: 'work_orders_list', authentication }, 4, typeVersion),
					{ url: '/', baseURL: 'https://api.example.test/v3' },
				),
				(error) =>
					error.name === 'NodeOperationError' &&
					error.context.itemIndex === 4 &&
					/OAuth2 is temporarily disabled/.test(error.message),
			);
		}
		for (const parameters of [{}, { authentication: 'token' }]) {
			const request = await prepareRequest.call(
				context({ operation: 'work_orders_list', ...parameters }, 0, typeVersion),
				{ url: '/', baseURL: 'https://api.example.test/v3' },
			);
			assert.equal(request.method, 'GET');
		}
	}
});
