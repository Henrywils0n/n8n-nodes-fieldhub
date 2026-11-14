import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schemaSource = 'api/fieldhub-openapi.json';
const sourcePath = resolve(root, schemaSource);
const source = await readFile(sourcePath, 'utf8');
const api = JSON.parse(source);
const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const check = process.argv.includes('--check');

// These operations are present in the published schema, but its descriptions
// explicitly prohibit use. Keep them in the inventory without generating actions.
const exclusions = {
	materials_alternative_prices_retrieve: {
		method: 'GET',
		path: '/v3/materials/alternative-prices/{id}/',
		reason: 'The API documentation marks this endpoint as access forbidden to any.',
	},
	storage_files_update: {
		method: 'PUT',
		path: '/v3/storage/files/{id}/',
		reason: 'The API documentation marks this endpoint as access forbidden to any.',
	},
	work_orders_create_from_inspection_create: {
		method: 'POST',
		path: '/v3/work-orders/create-from-inspection/',
		reason: 'The API documentation states that this endpoint is currently not in use.',
	},
};

// Deliberate UI names for irregular summaries and meaningful API actions.
// The operation IDs and HTTP methods always remain identical to the snapshot.
const labels = {
	contracts_types_retrieve: 'Get Type',
	entries_simple_create: 'Create Simple Entry',
	accounts_contacts_link_create: 'Link Contact',
	accounts_sites_link_create: 'Link Site',
	accounts_sites_unlink_create: 'Unlink Site',
	accounts_quick_create: 'Quick Create',
	flows_timeline_list: 'Get Timeline Records',
	flows_timeline_record_types_retrieve: 'Get Timeline Record Types',
	flows_next_action_date_partial_update: 'Set Next Action Date',
	income_statement_report_rows: 'Get Report Rows',
	income_statement_report_status: 'Get Report Status',
	income_statement_report_feed: 'Get Report Feed',
	inspections_retrieve: 'Get Inspection',
	inspections_frequencies_retrieve: 'Get Frequency',
	inspections_types_retrieve: 'Get Type',
	materials_extended_list: 'Get Many Extended Materials',
	opportunities_quick_create: 'Quick Create',
	storage_files_create: 'Create File Metadata',
	storage_files_download_retrieve: 'Get File Download URL',
	storage_files_upload_update: 'Upload File Bytes',
	storage_files_partial_update: 'Update File Metadata',
	sitesystems_destroy: 'Archive Site System',
	work_order_job_costing: 'Get Work Order Job Costing',
	work_orders_job_costing_list: 'Get Many Job Costing Records',
	work_orders_status_create: 'Change Status',
	work_orders_time_logs_timeline_retrieve: 'Get Timeline',
	work_orders_types_problem_resolution_codes_retrieve: 'Get Problem/Resolution Codes',
};

function invariant(condition, message) {
	if (!condition) throw new Error(message);
}

function camelCase(value) {
	return value
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.replace(/[^a-z0-9]+(.)/g, (_, letter) => letter.toUpperCase());
}

function titleCase(value) {
	return value
		.replace(/TimeLine/g, 'Timeline')
		.replace(/UnArchive/g, 'Unarchive')
		.replace(/\burl\b/gi, 'URL')
		.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function operationLabel(operation, method) {
	if (labels[operation.operationId]) return labels[operation.operationId];
	const summary = (operation.summary || operation.operationId.replace(/_/g, ' ')).trim();
	const replace = method === 'PUT' ? 'Replace' : 'Update';
	let label = summary
		.replace(/^List(?: of)?(?:\s|$)/i, 'Get Many ')
		.replace(/\sList$/i, '')
		.replace(/^(?:Retrieve|Detail)(?:\s|$)/i, 'Get ')
		.replace(/\s(?:Retrieve|Detail)$/i, '')
		.replace(/^(?:Partial Update|Patch|Modify|Update)(?:\s|$)/i, `${replace} `)
		.replace(/^(?:Destroy)(?:\s|$)/i, 'Delete ');
	if (/\sList$/i.test(summary)) label = `Get Many ${label}`;
	if (/\s(?:Retrieve|Detail)$/i.test(summary)) label = `Get ${label}`;
	if (
		/\s(?:Partial Update|Update)$/i.test(summary) &&
		!/^(?:Partial Update|Update)\b/i.test(summary)
	) {
		label = `${replace} ${label.replace(/\s(?:Partial Update|Update)$/i, '')}`;
	}
	if (/\sCreate$/i.test(summary)) label = `Create ${label.replace(/\sCreate$/i, '')}`;
	if (method === 'GET' && !/^Get\b/i.test(label)) {
		label = `${operation.operationId.endsWith('_list') ? 'Get Many' : 'Get'} ${label}`;
	}
	return titleCase(label.trim());
}

function dereference(value, visited = new Set()) {
	if (!value?.$ref) return value;
	invariant(!visited.has(value.$ref), `Circular top-level reference: ${value.$ref}`);
	const tokens = value.$ref
		.slice(2)
		.split('/')
		.map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
	invariant(value.$ref.startsWith('#/'), `External references are unsupported: ${value.$ref}`);
	const target = tokens.reduce((object, key) => object?.[key], api);
	invariant(target, `Missing reference ${value.$ref}`);
	visited.add(value.$ref);
	return {
		...dereference(target, visited),
		...Object.fromEntries(Object.entries(value).filter(([key]) => key !== '$ref')),
	};
}

function selectedContent(content = {}) {
	const type =
		[
			'application/json',
			'application/octet-stream',
			'multipart/form-data',
			'application/x-www-form-urlencoded',
		].find((candidate) => content[candidate]) ?? Object.keys(content)[0];
	return type ? { type, schema: content[type].schema } : undefined;
}

function verifyReferences(value) {
	if (!value || typeof value !== 'object') return;
	if (value.$ref) dereference(value);
	for (const child of Object.values(value)) verifyReferences(child);
}

invariant(
	api.info.version === '10.4.32',
	'Update the reviewed baseline before changing the schema version',
);
verifyReferences(api);
const activeTags = [
	...new Set(
		Object.values(api.paths).flatMap((path) =>
			methods.flatMap((method) => path[method]?.tags || []),
		),
	),
].sort((a, b) => a.localeCompare(b, 'en'));
const resources = activeTags.map((name) => ({ name, value: camelCase(name) }));
invariant(resources.length === 52, `Expected 52 resources, found ${resources.length}`);
invariant(
	new Set(resources.map((resource) => resource.value)).size === resources.length,
	'Duplicate resource ID',
);

const operations = [];
const excludedOperations = [];
const ids = new Set();
for (const [path, pathItem] of Object.entries(api.paths)) {
	for (const method of methods) {
		const operation = pathItem[method];
		if (!operation) continue;
		const id = operation.operationId;
		invariant(id && !ids.has(id), `Missing or duplicate operation ID at ${method} ${path}`);
		ids.add(id);
		invariant(operation.tags?.length === 1, `Expected one resource tag for ${id}`);
		const resource = camelCase(operation.tags[0]);
		const httpMethod = method.toUpperCase();
		invariant(httpMethod !== 'OPTIONS', `n8n does not support the OPTIONS method for ${id}`);
		if (exclusions[id]) {
			const excluded = exclusions[id];
			invariant(
				excluded.path === path && excluded.method === httpMethod,
				`Excluded endpoint changed: ${id}`,
			);
			excludedOperations.push({ id, resource, ...excluded });
			continue;
		}
		const parameters = [...(pathItem.parameters || []), ...(operation.parameters || [])].map(
			(parameter) => dereference(parameter),
		);
		const parameterMap = new Map(
			parameters.map((parameter) => [`${parameter.in}:${parameter.name}`, parameter]),
		);
		for (const [, name] of path.matchAll(/\{([^}]+)\}/g)) {
			invariant(parameterMap.has(`path:${name}`), `Missing path parameter ${name} in ${id}`);
		}
		const body = dereference(operation.requestBody);
		const bodyContent = selectedContent(body?.content);
		const success = Object.entries(operation.responses || {})
			.filter(([status]) => /^2\d\d$/.test(status))
			.sort(([left], [right]) => left.localeCompare(right))[0];
		const response = selectedContent(dereference(success?.[1])?.content);
		const responseSchema = dereference(response?.schema);
		const paginated = Boolean(
			responseSchema?.properties?.results && responseSchema?.properties?.count,
		);
		invariant(
			!paginated || ['limit', 'offset'].every((name) => parameterMap.has(`query:${name}`)),
			`Unexpected pagination shape in ${id}`,
		);
		operations.push({
			id,
			resource,
			label: operationLabel(operation, httpMethod),
			description: (operation.description || operation.summary || '').trim(),
			method: httpMethod,
			path,
			parameters: [...parameterMap.values()].map(
				({ name, in: location, required, description, schema, style, explode }) => ({
					name,
					in: location,
					...(required === undefined ? {} : { required }),
					...(description === undefined ? {} : { description }),
					schema: schema || {},
					...(style === undefined ? {} : { style }),
					...(explode === undefined ? {} : { explode }),
				}),
			),
			...(bodyContent
				? {
						body: bodyContent.schema || {},
						bodyRequired: Boolean(body.required),
						contentType: bodyContent.type,
					}
				: {}),
			paginated,
			...(responseSchema?.type === 'array' ? { responseIsArray: true } : {}),
			...(response?.schema ? { responseSchema: response.schema } : {}),
		});
	}
}
invariant(ids.size === 284, `Expected 284 documented operations, found ${ids.size}`);
invariant(
	operations.length === 281 && excludedOperations.length === 3,
	'Unexpected operation coverage',
);
for (const resource of resources) {
	const entries = operations.filter((operation) => operation.resource === resource.value);
	invariant(entries.length, `Resource has no usable operation: ${resource.name}`);
	invariant(
		new Set(entries.map((operation) => operation.label)).size === entries.length,
		`Duplicate action labels in ${resource.name}`,
	);
}

const catalog = {
	schemaVersion: api.info.version,
	schemaSource,
	schemaSha256: createHash('sha256').update(source).digest('hex'),
	resources,
	operations,
	excludedOperations,
	schemas: api.components.schemas,
};

const wrapper = `// Generated by scripts/generate.mjs. Do not edit by hand.
import type { ApiSchema, ExcludedOperation, OperationDefinition } from '../types';
import catalog from './catalog.json';

export const schemaVersion: string = catalog.schemaVersion;
export const schemaSource: string = catalog.schemaSource;
export const schemaSha256: string = catalog.schemaSha256;
export const resources: Array<{ name: string; value: string }> = catalog.resources;
export const operations: OperationDefinition[] = catalog.operations as OperationDefinition[];
export const excludedOperations: ExcludedOperation[] =
	catalog.excludedOperations as ExcludedOperation[];
export const schemas: Record<string, ApiSchema> = catalog.schemas as Record<string, ApiSchema>;
`;
const docs = [
	'# FieldHub operation coverage',
	'',
	`Generated from the checked-in FieldHub OpenAPI ${api.info.version} snapshot (\`${schemaSource}\`). Run \`npm run generate\` after deliberately updating the checked-in snapshot.`,
	'',
	`All ${ids.size} documented operations are inventoried: **${operations.length} actions across ${resources.length} resources**, with three documented exclusions. Names below are the operation labels shown in n8n; operation IDs remain the stable values stored in workflows. All paths retain the API version prefix.`,
	'',
	'## Unavailable endpoints',
	'',
	'| Resource | Operation ID | Method | Path | Reason |',
	'| --- | --- | --- | --- | --- |',
	...excludedOperations.map(
		(operation) =>
			`| ${resources.find((resource) => resource.value === operation.resource).name} | \`${operation.id}\` | ${operation.method} | \`${operation.path}\` | ${operation.reason} |`,
	),
	'',
	...resources.flatMap((resource) => [
		`## ${resource.name}`,
		'',
		'| Action | Method | Path | Operation ID | Paginated |',
		'| --- | --- | --- | --- | --- |',
		...operations
			.filter((operation) => operation.resource === resource.value)
			.map(
				(operation) =>
					`| ${operation.label} | ${operation.method} | \`${operation.path}\` | \`${operation.id}\` | ${operation.paginated ? 'Yes' : ''} |`,
			),
		'',
	]),
].join('\n');

const outputs = new Map([
	['nodes/Fieldhub/generated/catalog.json', `${JSON.stringify(catalog, null, '\t')}\n`],
	['nodes/Fieldhub/generated/catalog.ts', wrapper],
	['docs/operations.md', docs],
]);
for (const [relativePath, content] of outputs) {
	const target = resolve(root, relativePath);
	if (check) {
		const existing = await readFile(target, 'utf8').catch(() => '');
		invariant(existing === content, `${relativePath} is stale; run npm run generate`);
	} else {
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, content, 'utf8');
	}
}
console.log(
	`${check ? 'Verified' : 'Generated'} ${resources.length} resources, ${operations.length} actions, ${excludedOperations.length} exclusions (${operations.filter((operation) => operation.paginated).length} paginated).`,
);
