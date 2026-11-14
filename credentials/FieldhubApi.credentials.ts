import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { baseUrlExpression } from '../nodes/Fieldhub/urls';

export class FieldhubApi implements ICredentialType {
	name = 'fieldhubApi';

	displayName = 'FieldHub API';

	icon = {
		light: 'file:../nodes/Fieldhub/fieldhub.svg',
		dark: 'file:../nodes/Fieldhub/fieldhub.dark.svg',
	} as const;

	documentationUrl = 'https://github.com/Henrywils0n/n8n-nodes-fieldhub#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://api.example.com/v3',
			description:
				'FieldHub HTTPS API URL, with or without the /v3 suffix; no credentials, query, or fragment',
		},
		{
			displayName: 'API Token',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Token created in FieldHub under Profile → API Access Keys',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Token {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: baseUrlExpression,
			url: '/profile/',
			method: 'GET',
			timeout: 30000,
			disableFollowRedirect: true,
			maxRedirects: 0,
			ignoreHttpStatusErrors: false,
		},
	};
}
