/** The OpenAPI subset used to build fields and validate submitted request values. */
export interface ApiSchema {
	$ref?: string;
	type?: string;
	format?: string;
	title?: string;
	description?: string;
	properties?: Record<string, ApiSchema>;
	items?: ApiSchema;
	required?: string[];
	readOnly?: boolean;
	writeOnly?: boolean;
	nullable?: boolean;
	deprecated?: boolean;
	enum?: unknown[];
	default?: unknown;
	example?: unknown;
	minimum?: number;
	maximum?: number;
	exclusiveMinimum?: boolean | number;
	exclusiveMaximum?: boolean | number;
	multipleOf?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	minItems?: number;
	maxItems?: number;
	uniqueItems?: boolean;
	minProperties?: number;
	maxProperties?: number;
	additionalProperties?: boolean | ApiSchema;
	allOf?: ApiSchema[];
	oneOf?: ApiSchema[];
	anyOf?: ApiSchema[];
	not?: ApiSchema;
	discriminator?: { propertyName: string; mapping?: Record<string, string> };
}

export interface ApiParameter {
	name: string;
	in: 'path' | 'query' | 'header' | 'cookie';
	required?: boolean;
	description?: string;
	schema: ApiSchema;
	style?: string;
	explode?: boolean;
}

export interface OperationDefinition {
	id: string;
	resource: string;
	label: string;
	description: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
	path: string;
	parameters: ApiParameter[];
	body?: ApiSchema;
	bodyRequired?: boolean;
	contentType?: string;
	paginated: boolean;
	responseIsArray?: boolean;
	responseSchema?: ApiSchema;
}

export interface ExcludedOperation {
	id: string;
	resource: string;
	method: OperationDefinition['method'];
	path: string;
	reason: string;
}
