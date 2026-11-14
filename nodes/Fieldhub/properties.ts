import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { operations, resources } from './generated/catalog';
import { operationAction, operationDescription } from './labels';
import { outputProperties } from './output';
import { paginate, prepareRequest, receiveResponse } from './request';
import {
	camelCase,
	fieldLabel,
	isStringInputSchema,
	parameterName,
	resolveSchema,
	writableProperties,
} from './schema';
import type { ApiSchema, OperationDefinition } from './types';

function inputField(
	name: string,
	apiName: string,
	input: ApiSchema,
	required = false,
	description?: string,
): INodeProperties {
	const schema = resolveSchema(input);
	const enumChoices = schema.enum?.filter((value) => value !== null);
	const field: INodeProperties = {
		displayName: fieldLabel(apiName),
		name,
		type: 'string',
		default: '',
		required,
		description: description || schema.description || `Value for ${apiName}`,
	};
	if (schema.type === 'boolean') {
		field.type = 'boolean';
		field.default = false;
		field.description = `Whether ${apiName.replace(/_/g, ' ')} is enabled`;
	} else if (
		enumChoices?.length &&
		enumChoices.every((value) => typeof value === 'string' || typeof value === 'number')
	) {
		field.type = 'options';
		const choices =
			apiName === 'ordering'
				? [
						...enumChoices,
						...enumChoices
							.filter((value) => typeof value === 'string' && !value.startsWith('-'))
							.map((value) => `-${value}`),
					]
				: enumChoices;
		field.options = choices
			.map((value) => ({
				name:
					apiName === 'ordering' && typeof value === 'string'
						? `${fieldLabel(value.replace(/^-/, ''))} (${value.startsWith('-') ? 'Descending' : 'Ascending'})`
						: fieldLabel(String(value)),
				value: value as string | number,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
		field.default = choices[0] as string | number;
	} else if (schema.type === 'integer' || schema.type === 'number') {
		field.type = 'number';
		field.default = 0;
		field.typeOptions = {
			...(schema.type === 'integer' ? { numberPrecision: 0 } : {}),
			...(schema.minimum !== undefined ? { minValue: schema.minimum } : {}),
			...(schema.maximum !== undefined ? { maxValue: schema.maximum } : {}),
		};
	} else if (
		!isStringInputSchema(schema) &&
		(schema.type === 'array' ||
			schema.type === 'object' ||
			schema.properties ||
			schema.oneOf ||
			schema.anyOf ||
			(!schema.type && !schema.enum))
	) {
		field.type = 'json';
		field.default = schema.type === 'array' ? '[]' : '{}';
		field.description = `${field.description}. Enter JSON or an expression returning the documented value`;
	} else if (schema.format === 'date') {
		field.placeholder = 'YYYY-MM-DD';
	} else if (schema.format === 'date-time') {
		field.placeholder = '2026-01-01T00:00:00Z';
	}
	if (schema.nullable) field.description += '. Use JSON body mode to explicitly send null';
	if (apiName === 'password' || apiName === 'confirm_password') {
		field.typeOptions = { ...field.typeOptions, password: true };
		field.description +=
			'. Literal values are stored in the workflow; use an expression for secrets';
	}
	return field;
}

function operationFields(operation: OperationDefinition): INodeProperties[] {
	const show = { resource: [operation.resource], operation: [operation.id] };
	const fields: INodeProperties[] = [];
	const filterOptions: INodeProperties[] = [];
	for (const parameter of operation.parameters) {
		if (parameter.in === 'path' || (parameter.in === 'query' && parameter.required)) {
			fields.push({
				...inputField(
					parameterName(parameter.in === 'path' ? 'path' : 'query', parameter.name),
					parameter.name,
					parameter.schema,
					true,
					parameter.description,
				),
				displayOptions: { show },
			});
		} else if (parameter.in === 'query' && !(operation.paginated && parameter.name === 'limit')) {
			const field = inputField(
				camelCase(parameter.name),
				parameter.name,
				parameter.schema,
				false,
				parameter.description,
			);
			if (operation.id === 'storage_files_list' && parameter.name === 'file_tags') {
				// Keep the pre-10.4.32 text field compatible with existing saved filters.
				field.type = 'string';
				field.default = '';
				field.placeholder = '1,2';
				field.description =
					'File tag IDs, separated by commas. Also accepts a JSON array or an expression returning an array of integer IDs.';
			}
			filterOptions.push(field);
		}
	}
	if (operation.paginated) {
		fields.push(
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: { show },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, numberPrecision: 0 },
				description: 'Max number of results to return',
				displayOptions: { show: { ...show, returnAll: [false] } },
			},
		);
	}
	if (filterOptions.length)
		fields.push({
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			placeholder: 'Add Filter',
			default: {},
			options: filterOptions.sort((a, b) => a.displayName.localeCompare(b.displayName)),
			displayOptions: { show },
		});
	const binary =
		operation.contentType === 'application/octet-stream' ||
		operation.contentType === 'multipart/form-data';
	if (operation.body && operation.contentType !== 'application/octet-stream') {
		const schema = resolveSchema(operation.body);
		const required = schema.required ?? [];
		const optional: INodeProperties[] = [];
		if (!binary) {
			fields.push({
				displayName: 'Body Input',
				name: 'bodyMode',
				type: 'options',
				noDataExpression: true,
				default: 'fields',
				options: [
					{ name: 'Fields', value: 'fields' },
					{ name: 'JSON', value: 'json' },
				],
				displayOptions: { show },
			});
			fields.push({
				displayName: 'Body (JSON)',
				name: 'bodyJson',
				type: 'json',
				default: '{}',
				required: operation.bodyRequired,
				description:
					'Complete request body. Replaces the form fields; read-only fields are not accepted.',
				displayOptions: { show: { ...show, bodyMode: ['json'] } },
			});
		}
		const formShow = binary ? show : { ...show, bodyMode: ['fields'] };
		for (const [name, fieldSchema] of writableProperties(operation.body)) {
			if (binary && name === 'file') continue;
			if (required.includes(name))
				fields.push({
					...inputField(parameterName('body', name), name, fieldSchema, true),
					displayOptions: { show: formShow },
				});
			else optional.push(inputField(camelCase(name), name, fieldSchema));
		}
		if (optional.length)
			fields.push({
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: optional.sort((a, b) => a.displayName.localeCompare(b.displayName)),
				displayOptions: { show: formShow },
			});
	}
	if (binary)
		fields.push({
			displayName: 'Input Binary Field',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			description: 'Name of the input binary field containing the file to upload',
			displayOptions: { show },
		});
	return [...fields, ...outputProperties(operation)];
}

export const properties: INodeProperties[] = [
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		default: 'token',
		options: [{ name: 'API Token', value: 'token' }],
		description: 'API Token is the supported authentication method; OAuth2 is temporarily disabled',
	},
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		default: 'workOrders',
		options: resources,
	},
	...resources.flatMap((resource): INodeProperties[] => {
		const resourceOperations = operations.filter(
			(operation) => operation.resource === resource.value,
		);
		const defaultOperation =
			resourceOperations.find((operation) => operation.method === 'GET')?.id ??
			resourceOperations[0].id;
		const options: INodePropertyOptions[] = resourceOperations.map((operation) => ({
			name: operation.label,
			value: operation.id,
			description: operationDescription(operation, resource.name),
			action: operationAction(operation, resource.name),
			routing: {
				request: { method: operation.method, url: operation.path.replace(/^\/v3(?=\/)/, '') },
				send: { preSend: [prepareRequest], ...(operation.paginated ? { paginate: true } : {}) },
				output: { postReceive: [receiveResponse] },
				...(operation.paginated ? { operations: { pagination: paginate } } : {}),
			},
		}));
		return [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: [resource.value] } },
				options,
				default: defaultOperation,
			},
			...resourceOperations.flatMap(operationFields),
		];
	}),
];
