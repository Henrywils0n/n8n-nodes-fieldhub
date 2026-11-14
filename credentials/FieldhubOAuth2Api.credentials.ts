import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
import { baseUrlExpression, oauthUrlValidationExpression } from '../nodes/Fieldhub/urls';

export class FieldhubOAuth2Api implements ICredentialType {
	name = 'fieldhubOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'FieldHub OAuth2 API';

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
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://example.com/oauth2/authorize/',
			description:
				'HTTPS OAuth2 authorization endpoint on the FieldHub main domain; no credentials, query, or fragment',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://example.com/oauth2/token/',
			description:
				'HTTPS OAuth2 token and refresh endpoint on the FieldHub main domain; no credentials, query, or fragment',
		},
		{
			displayName: 'FieldHub URL Validation',
			name: 'fieldhubUrlValidation',
			type: 'hidden',
			default: oauthUrlValidationExpression,
		},
		{
			displayName: 'Scopes',
			name: 'fieldhubScopes',
			type: 'string',
			default: '',
			placeholder: 'workOrder:view workOrder:edit',
			description:
				'Space-separated FieldHub OAuth scopes; leave empty only if your application supports default scopes',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			// n8n uses "scopes" for project permissions; keep OAuth input separate.
			// Recompute when n8n clears the cached native scope on reconnect.
			default: '={{$self["fieldhubScopes"] ?? ""}}',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
	];

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
