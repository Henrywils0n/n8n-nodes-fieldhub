import { NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteSingleFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { fieldLabel, resolveSchema } from './schema';
import type { ApiSchema, OperationDefinition } from './types';

const unsafeFields = new Set(['__proto__', 'constructor', 'prototype']);
const identifiers = ['id', 'uuid', 'pk', 'identifier'];
const usefulFields = [
	...identifiers,
	'name',
	'display_name',
	'title',
	'summary',
	'number',
	'code',
	'reference',
	'status',
	'state',
	'description',
	'type',
	'account',
	'site',
	'email',
	'phone',
	'total',
	'amount',
	'balance',
	'quantity',
	'created',
	'created_at',
	'updated',
	'updated_at',
];

/** Fields belong to one output record, after the normal pagination/array split. */
export function responseFields(operation: OperationDefinition): Array<[string, ApiSchema]> {
	if (!operation.responseSchema) return [];
	let schema = resolveSchema(operation.responseSchema);
	if (operation.paginated) {
		const results = schema.properties?.results;
		if (!results) return [];
		schema = resolveSchema(results);
	}
	if (schema.type === 'array' && schema.items) schema = resolveSchema(schema.items);
	return Object.entries(schema.properties ?? {}).filter(
		([name, field]) => !unsafeFields.has(name) && !resolveSchema(field).writeOnly,
	);
}

export function outputProperties(operation: OperationDefinition): INodeProperties[] {
	const fields = responseFields(operation);
	if (fields.length <= 10) return [];
	const show = {
		resource: [operation.resource],
		operation: [operation.id],
		'@version': [{ _cnd: { gte: 1.1 } }],
	};
	return [
		{
			displayName: 'Simplify',
			name: 'simplify',
			type: 'boolean',
			default: true,
			description: 'Whether to return a simplified version of the response instead of the raw data',
			displayOptions: { show: { ...show, '@tool': [false] } },
		},
		{
			displayName: 'Output',
			name: 'output',
			type: 'options',
			default: 'simplified',
			noDataExpression: true,
			options: [
				{
					name: 'Simplified',
					value: 'simplified',
					description: 'Return up to 10 useful fields per record',
				},
				{ name: 'Raw', value: 'raw', description: 'Return all response fields' },
				{
					name: 'Selected Fields',
					value: 'selectedFields',
					description: 'Return chosen fields and the record identifier',
				},
			],
			displayOptions: { show: { ...show, '@tool': [true] } },
		},
		{
			displayName: 'Fields',
			name: 'outputFields',
			type: 'multiOptions',
			default: [],
			description: 'Fields to return. The record identifier is always included when available.',
			options: fields
				.map(([name]) => ({ name: fieldLabel(name), value: name }))
				.sort((a, b) => a.name.localeCompare(b.name)),
			displayOptions: { show: { ...show, '@tool': [true], output: ['selectedFields'] } },
		},
	];
}

type OutputContext = Pick<IExecuteSingleFunctions, 'getNode' | 'getNodeParameter'>;

/** Apply only to successful record responses; pending/empty response metadata is handled by the caller. */
export function applyOutputSelection(
	this: OutputContext,
	items: INodeExecutionData[],
	operation: OperationDefinition,
): INodeExecutionData[] {
	const node = this.getNode();
	const fields = responseFields(operation);
	// Version 1 never changes the shape of an existing workflow's response.
	if (node.typeVersion < 1.1 || fields.length <= 10) return items;
	// n8n's native @tool display condition uses the same Tool suffix.
	const mode = node.type.endsWith('Tool')
		? this.getNodeParameter('output', 'simplified')
		: this.getNodeParameter('simplify', true)
			? 'simplified'
			: 'raw';
	if (mode === 'raw') return items;
	if (mode !== 'simplified' && mode !== 'selectedFields')
		throw new NodeOperationError(node, 'Choose a valid Output option');
	const fieldNames = new Set(fields.map(([name]) => name));
	let selected: string[];
	if (mode === 'selectedFields') {
		const requested = this.getNodeParameter('outputFields', []);
		if (
			!Array.isArray(requested) ||
			requested.some((key) => typeof key !== 'string' || !fieldNames.has(key))
		)
			throw new NodeOperationError(
				node,
				'Choose output fields from the documented response fields',
			);
		selected = [...new Set(requested as string[])];
	} else {
		const scalarFields = fields
			.filter(([, field]) => {
				const schema = resolveSchema(field);
				return schema.type !== 'object' && schema.type !== 'array' && !schema.properties;
			})
			.map(([name]) => name);
		selected = [
			...new Set([
				...usefulFields.filter((name) => fieldNames.has(name)),
				...scalarFields,
				...fieldNames,
			]),
		];
	}
	return items.map((item) => {
		const identifier = identifiers.find((name) =>
			Object.prototype.hasOwnProperty.call(item.json, name),
		);
		const keys = [...new Set([...(identifier ? [identifier] : []), ...selected])].filter((name) =>
			Object.prototype.hasOwnProperty.call(item.json, name),
		);
		const retained = mode === 'simplified' ? keys.slice(0, 10) : keys;
		const json: IDataObject = Object.fromEntries(retained.map((name) => [name, item.json[name]]));
		return { ...item, json };
	});
}
