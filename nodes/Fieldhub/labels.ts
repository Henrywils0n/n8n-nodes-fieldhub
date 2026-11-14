import type { OperationDefinition } from './types';

/** Action captions use sentence case, retaining identifiers such as URL and API. */
function sentenceCase(label: string): string {
	const text = label
		.split(/(\s+)/)
		.map((word) => (/^[A-Z\d]+$/.test(word) ? word : word.toLowerCase()))
		.join('');
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function singularResource(resource: string): string {
	if (/ies$/.test(resource)) return resource.replace(/ies$/, 'y');
	if (/(statuses|processes|taxes)$/.test(resource)) return resource.slice(0, -2);
	return resource.replace(/s$/, '');
}

export function operationAction(operation: OperationDefinition, resourceName: string): string {
	const label = sentenceCase(operation.label);
	const resource = sentenceCase(resourceName).replace(/^[A-Z](?=[a-z])/, (letter) =>
		letter.toLowerCase(),
	);
	if (operation.label === 'Get Many') return `Get many ${resource}`;
	// Specific labels already name their target (including nested resources).
	if (
		!/^(Create|Get|Replace|Update|Delete|Archive|Unarchive|Resume|Terminate|Reverse|Void|Cancel|Assign|Unassign|Follow|Unfollow|Start|Quick Create)$/.test(
			operation.label,
		)
	)
		return label;
	const singular = singularResource(resource);
	return `${label} ${singular}`;
}

export function operationDescription(operation: OperationDefinition, resourceName: string): string {
	const action = operationAction(operation, resourceName);
	if (operation.label === 'Replace')
		return action.replace(/^Replace /, 'Replace all editable fields of the ');
	if (operation.label === 'Update')
		return action.replace(/^Update /, 'Update selected fields of the ');
	return action;
}
