import { UserError } from 'n8n-workflow';

// Keep this transport-policy check identical in node code and n8n expressions.
// URL parsing itself remains the HTTP client's responsibility in expressions,
// where the URL global is unavailable. Disallow parser-ambiguous backslashes
// and control characters as well as plaintext transport and URL credentials.
const httpsUrlPattern = /^https:\/\/[^/?#@\s\\]+(?:\/[^?#\s\\]*)?$/i;

function hasControlCharacters(value: string): boolean {
	return value
		.split('')
		.some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

function urlError(label: string): string {
	return `${label} must be an HTTPS URL without credentials, a query, or a fragment`;
}

export function normalizeBaseUrl(value: unknown): string {
	if (typeof value !== 'string' || !value.trim())
		throw new UserError('API URL is required in the FieldHub credential');
	const trimmed = value.trim();
	if (!httpsUrlPattern.test(trimmed) || hasControlCharacters(trimmed) || !URL.canParse(trimmed))
		throw new UserError(urlError('API URL'));
	return trimmed.replace(/\/+$/, '').replace(/(?:\/v3)+$/, '') + '/v3';
}

// n8n's legacy expression evaluator suppresses ordinary JavaScript errors.
// Its supported toNumber() extension produces an ExpressionExtensionError,
// which all n8n expression engines propagate. Preserve that error type and give
// it an actionable message, so an invalid credential cannot resolve to null.
function expressionError(message: string): string {
	return `try { 'Invalid FieldHub URL'.toNumber(); } catch (error) { error.message = ${message}; throw error; }`;
}

export const baseUrlExpression = `={{ (() => {
	const value = $credentials.baseUrl;
	if (typeof value !== 'string' || !value.trim()) {
		${expressionError(JSON.stringify('API URL is required in the FieldHub credential'))}
	}
	const trimmed = value.trim();
	if (!${httpsUrlPattern}.test(trimmed) || (${hasControlCharacters.toString()})(trimmed)) {
		${expressionError(JSON.stringify(urlError('API URL')))}
	}
	return trimmed.replace(/\\/+$/, '').replace(/(?:\\/v3)+$/, '') + '/v3';
})() }}`;

// CredentialsHelper applies missing defaults and resolves hidden expressions
// before native OAuth authorization, callback exchange, and refresh. A new
// guard field also covers existing saved authUrl/accessTokenUrl values without
// renaming them or overriding n8n's OAuth authentication/refresh implementation.
export const oauthUrlValidationExpression = `={{ (() => {
	const fields = [[$self.baseUrl, 'API URL'], [$self.authUrl, 'Authorization URL'], [$self.accessTokenUrl, 'Access Token URL']];
	for (const [value, label] of fields) {
		if (typeof value !== 'string' || !${httpsUrlPattern}.test(value.trim()) || (${hasControlCharacters.toString()})(value.trim())) {
			${expressionError("label + ' must be an HTTPS URL without credentials, a query, or a fragment'")}
		}
	}
	return true;
})() }}`;
