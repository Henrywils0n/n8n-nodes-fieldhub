import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { properties } from './properties';
import { baseUrlExpression } from './urls';

export class Fieldhub implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FieldHub',
		name: 'fieldhub',
		icon: { light: 'file:fieldhub.svg', dark: 'file:fieldhub.dark.svg' },
		group: ['transform'],
		version: [1, 1.1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage FieldHub accounts, work orders, inventory, billing, and reports',
		defaults: { name: 'FieldHub' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'fieldhubApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: baseUrlExpression,
			headers: { Accept: 'application/json' },
			timeout: 30000,
		},
		properties,
	};
}
