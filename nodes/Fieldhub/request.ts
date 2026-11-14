import {
	NodeApiError,
	NodeOperationError,
	type DeclarativeRestApiSettings,
	type IDataObject,
	type IExecutePaginationFunctions,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';
import { operations } from './generated/catalog';
import { applyOutputSelection } from './output';
import {
	camelCase,
	isStringInputSchema,
	parameterName,
	parseJson,
	resolveSchema,
	validateValue,
	writableProperties,
} from './schema';
import type { ApiSchema, OperationDefinition } from './types';
import { normalizeBaseUrl } from './urls';

export { parameterName, resolveSchema } from './schema';
export { normalizeBaseUrl } from './urls';

export interface RequestValues {
	pathParameters?: Record<string, unknown>;
	queryParameters?: Record<string, unknown>;
	bodyMode?: 'fields' | 'json';
	bodyFields?: Record<string, unknown>;
	bodyJson?: unknown;
	returnAll?: boolean;
	limit?: number;
}

function fieldValue(value: unknown, input: ApiSchema, label: string): unknown {
	const schema = resolveSchema(input);
	if (isStringInputSchema(schema)) return value;
	if (
		schema.type === 'object' ||
		schema.type === 'array' ||
		schema.properties ||
		(!schema.type && !schema.enum)
	)
		return parseJson(value, label);
	return value;
}

export function buildRequest(
	operation: OperationDefinition,
	values: RequestValues,
): IHttpRequestOptions {
	let url = operation.path.replace(/^\/v3(?=\/)/, '');
	const query: Record<string, unknown> = {};
	for (const parameter of operation.parameters) {
		const source = parameter.in === 'path' ? values.pathParameters : values.queryParameters;
		let value = source?.[parameter.name];
		if (parameter.in === 'query' && parameter.name === 'limit' && operation.paginated) continue;
		if (value === undefined) {
			if (parameter.required) throw new Error(`${parameter.name} is required`);
			continue;
		}
		// Before API 10.4.32 this filter was documented as a comma-separated string.
		// Accept saved workflows without coercing other array parameters or JSON bodies.
		if (
			operation.id === 'storage_files_list' &&
			parameter.name === 'file_tags' &&
			typeof value === 'string' &&
			!value.trimStart().startsWith('[')
		) {
			if (value.trim() === '') value = [];
			else if (/^\s*-?\d+(?:\s*,\s*-?\d+)*\s*$/.test(value))
				value = value.split(',').map((part) => Number(part.trim()));
			else throw new Error('file_tags must contain comma-separated integer IDs or a JSON array');
		}
		value = fieldValue(value, parameter.schema, parameter.name);
		const parameterSchema = resolveSchema(parameter.schema);
		const validationSchema =
			parameter.name === 'ordering' && parameterSchema.enum
				? {
						...parameterSchema,
						enum: [
							...parameterSchema.enum,
							...parameterSchema.enum
								.filter((choice) => typeof choice === 'string' && !choice.startsWith('-'))
								.map((choice) => `-${choice}`),
						],
					}
				: parameter.schema;
		validateValue(value, validationSchema, parameter.name);
		if (parameter.in === 'path') {
			if (value === '' || value === null || value === '.' || value === '..')
				throw new Error(`${parameter.name} must be a valid identifier`);
			url = url.replace(`{${parameter.name}}`, encodeURIComponent(String(value)));
		} else if (parameter.in === 'query') {
			query[parameter.name] =
				Array.isArray(value) && parameter.explode === false ? value.join(',') : value;
		}
	}
	if (operation.paginated) {
		const limit = values.limit ?? 50;
		if (!values.returnAll && (!Number.isInteger(limit) || limit < 1))
			throw new Error('Limit must be a positive integer');
		if (query.offset !== undefined && (!Number.isInteger(query.offset) || Number(query.offset) < 0))
			throw new Error('Offset must be a non-negative integer');
		query.limit = values.returnAll ? 100 : Math.min(limit, 100);
		query.offset ??= 0;
	}
	if (
		query.period !== undefined &&
		query.group_by !== undefined &&
		operation.id.startsWith('income_statement_report')
	) {
		throw new Error('Period and Group By cannot be supplied together');
	}
	const request: IHttpRequestOptions = {
		url,
		method: operation.method,
		qs: query as IDataObject,
		arrayFormat: 'repeat',
		json: true,
		headers: { Accept: 'application/json' },
	};
	if (operation.body && operation.contentType !== 'application/octet-stream') {
		let body: unknown;
		if (values.bodyMode === 'json') {
			body = parseJson(values.bodyJson, 'Body');
		} else {
			const properties = Object.fromEntries(writableProperties(operation.body));
			body = Object.fromEntries(
				Object.entries(values.bodyFields ?? {})
					.filter(([, value]) => value !== undefined)
					.map(([key, value]) => [
						key,
						properties[key] ? fieldValue(value, properties[key], key) : value,
					]),
			);
		}
		if (operation.contentType === 'multipart/form-data') {
			// The API calls the binary part a URI in its schema; the upload hook supplies bytes.
			const schema = resolveSchema(operation.body);
			validateValue(
				body,
				{ ...schema, required: schema.required?.filter((name) => name !== 'file') },
				'Body',
			);
		} else {
			if (body === undefined && !operation.bodyRequired) return request;
			validateValue(body, operation.body, 'Body');
		}
		request.body = body as IDataObject;
		if (operation.contentType === 'application/json')
			request.headers!['Content-Type'] = 'application/json';
	}
	return request;
}

function currentOperation(context: IExecuteSingleFunctions): OperationDefinition {
	const id = context.getNodeParameter('operation') as string;
	const operation = operations.find((entry) => entry.id === id);
	if (!operation || operation.resource !== context.getNodeParameter('resource'))
		throw new Error('Select a valid FieldHub resource and operation');
	return operation;
}

export function readValues(
	context: IExecuteSingleFunctions,
	operation: OperationDefinition,
): RequestValues {
	const pathParameters: Record<string, unknown> = {};
	const queryParameters: Record<string, unknown> = {};
	const bodyFields: Record<string, unknown> = {};
	const filters = context.getNodeParameter('filters', {}) as Record<string, unknown>;
	for (const parameter of operation.parameters) {
		if (parameter.in === 'path')
			pathParameters[parameter.name] = context.getNodeParameter(
				parameterName('path', parameter.name),
			);
		else if (parameter.in === 'query' && !(operation.paginated && parameter.name === 'limit')) {
			queryParameters[parameter.name] = parameter.required
				? context.getNodeParameter(parameterName('query', parameter.name))
				: filters[camelCase(parameter.name)];
		}
	}
	const bodyMode =
		operation.contentType === 'multipart/form-data' ||
		operation.contentType === 'application/octet-stream'
			? 'fields'
			: (context.getNodeParameter('bodyMode', 'fields') as 'fields' | 'json');
	if (operation.body && bodyMode === 'fields') {
		const required = resolveSchema(operation.body).required ?? [];
		const additional = context.getNodeParameter('additionalFields', {}) as Record<string, unknown>;
		for (const [name] of writableProperties(operation.body)) {
			if (operation.contentType === 'multipart/form-data' && name === 'file') continue;
			bodyFields[name] = required.includes(name)
				? context.getNodeParameter(parameterName('body', name))
				: additional[camelCase(name)];
		}
	}
	return {
		pathParameters,
		queryParameters,
		bodyFields,
		bodyMode,
		bodyJson: bodyMode === 'json' ? context.getNodeParameter('bodyJson', '{}') : undefined,
		returnAll: operation.paginated
			? (context.getNodeParameter('returnAll', false) as boolean)
			: false,
		limit: operation.paginated ? (context.getNodeParameter('limit', 50) as number) : 50,
	};
}

export async function prepareRequest(
	this: IExecuteSingleFunctions,
	options: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	try {
		if (this.getNodeParameter('authentication', 'token') !== 'token')
			throw new Error(
				'OAuth2 is temporarily disabled. Choose API Token and a FieldHub API credential.',
			);
		const operation = currentOperation(this);
		const prepared = buildRequest(operation, readValues(this, operation));
		const request: IHttpRequestOptions = {
			...options,
			...prepared,
			baseURL: normalizeBaseUrl(options.baseURL),
			headers: { ...options.headers, ...prepared.headers },
			timeout: 30000,
			sendCredentialsOnCrossOriginRedirect: false,
			disableFollowRedirect: true,
			ignoreHttpStatusErrors: false,
		};
		// n8n's routing engine initializes body to {}; GET and bodyless actions must omit it.
		if (prepared.body === undefined) delete request.body;
		if (
			operation.contentType === 'application/octet-stream' ||
			operation.contentType === 'multipart/form-data'
		) {
			const property = this.getNodeParameter('binaryPropertyName', 'data') as string;
			const binary = this.helpers.assertBinaryData(property);
			const buffer = await this.helpers.getBinaryDataBuffer(property);
			request.json = false;
			if (operation.contentType === 'application/octet-stream') {
				request.body = buffer;
				request.headers!['Content-Type'] = 'application/octet-stream';
			} else {
				// Build the multipart message from n8n-managed bytes without a runtime dependency.
				const boundary = `fieldhub-${this.getItemIndex()}-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
				const parts: Buffer[] = [];
				for (const [name, value] of Object.entries((prepared.body ?? {}) as IDataObject)) {
					for (const entry of Array.isArray(value) ? value : [value]) {
						parts.push(
							Buffer.from(
								`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${String(entry)}\r\n`,
							),
						);
					}
				}
				const filename = (binary.fileName || 'upload').replace(/["\r\n\\]/g, '_');
				const mime = (binary.mimeType || 'application/octet-stream').replace(/[\r\n]/g, '');
				parts.push(
					Buffer.from(
						`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
					),
					buffer,
					Buffer.from(`\r\n--${boundary}--\r\n`),
				);
				request.body = Buffer.concat(parts);
				request.headers!['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
			}
		}
		return request;
	} catch (error) {
		throw new NodeOperationError(this.getNode(), error as Error, {
			itemIndex: this.getItemIndex(),
		});
	}
}

function responseBody(
	context: Pick<IExecuteSingleFunctions, 'getNode' | 'getItemIndex'>,
	response: IN8nHttpFullResponse,
): unknown {
	try {
		if (typeof response.body === 'string' && response.body.length > 0)
			return parseJson(response.body, 'API response');
		return response.body;
	} catch (error) {
		throw new NodeOperationError(context.getNode(), error as Error, {
			itemIndex: context.getItemIndex(),
		});
	}
}

function outputItems(body: unknown, itemIndex: number): INodeExecutionData[] {
	const values = Array.isArray(body) ? body : [body];
	return values.map((value) => ({
		json:
			value !== null && typeof value === 'object' && !Array.isArray(value)
				? (value as IDataObject)
				: { data: value as IDataObject[string] },
		pairedItem: { item: itemIndex },
	}));
}

export async function receiveResponse(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const itemIndex = this.getItemIndex();
	if (response.statusCode >= 400)
		throw new NodeApiError(
			this.getNode(),
			{ message: `FieldHub returned HTTP ${response.statusCode}`, statusCode: response.statusCode },
			{ itemIndex, httpCode: String(response.statusCode) },
		);
	const operation = currentOperation(this);
	const deleted = operation.method === 'DELETE' && this.getNode().typeVersion >= 1.1;
	// Accepted requests are still pending even when the API omits the body.
	if (response.statusCode === 202) {
		const body = response.body === '' || response.body == null ? {} : responseBody(this, response);
		return outputItems(
			{
				...(body as IDataObject),
				statusCode: 202,
				retryAfter: response.headers['retry-after'] ?? null,
			},
			itemIndex,
		);
	}
	if (response.statusCode === 204 || response.body === '' || response.body == null)
		return outputItems(deleted ? { deleted: true } : { success: true }, itemIndex);
	const body = responseBody(this, response);
	if (deleted) return outputItems({ deleted: true }, itemIndex);
	if (operation.paginated) {
		const envelope = body as { results?: unknown[] } | null;
		if (!envelope || !Array.isArray(envelope.results))
			throw new NodeOperationError(
				this.getNode(),
				'FieldHub returned an invalid paginated response',
				{ itemIndex },
			);
		return applyOutputSelection.call(this, outputItems(envelope.results, itemIndex), operation);
	}
	return applyOutputSelection.call(this, outputItems(body, itemIndex), operation);
}

/** n8n handles credentials and request errors; this hook only controls page traversal. */
export async function paginate(
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;
	const limit = returnAll ? Infinity : (this.getNodeParameter('limit', 50) as number);
	let offset = Number(requestData.options.qs?.offset ?? 0);
	const output: INodeExecutionData[] = [];
	const originalPostReceive = requestData.postReceive;
	let response: IN8nHttpFullResponse | undefined;
	// makeRoutingRequest uses the original ResultOptions for output processing.
	requestData.postReceive = [
		{
			data: { parameterValue: undefined },
			actions: [
				async function (items, received) {
					response = received;
					return await receiveResponse.call(this, items, received);
				},
			],
		},
	];
	try {
		do {
			requestData.options.qs = {
				...requestData.options.qs,
				offset,
				limit: Math.min(100, limit - output.length),
			};
			response = undefined;
			const page = await this.makeRoutingRequest(requestData);
			if (!response)
				throw new NodeOperationError(
					this.getNode(),
					'FieldHub pagination did not receive a response',
				);
			const received: IN8nHttpFullResponse = response;
			output.push(...page.slice(0, limit - output.length));
			if (received.statusCode === 202) break;
			const body = responseBody(this, received) as { next?: string | null; results?: unknown[] };
			if (!body.next || !body.results?.length || output.length >= limit) break;
			offset += body.results.length;
		} while (output.length < limit);
		return output;
	} finally {
		requestData.postReceive = originalPostReceive;
	}
}
