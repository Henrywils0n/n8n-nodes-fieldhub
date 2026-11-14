import { jsonParse } from 'n8n-workflow';
import { schemas } from './generated/catalog';
import type { ApiSchema } from './types';

export function resolveSchema(input: ApiSchema, seen = new Set<string>()): ApiSchema {
	let schema = input;
	if (input.$ref) {
		if (seen.has(input.$ref)) return { type: 'object' };
		seen.add(input.$ref);
		const name = input.$ref.split('/').pop()!;
		const referenced = schemas[name];
		if (!referenced) throw new Error(`Unknown API schema: ${name}`);
		schema = { ...resolveSchema(referenced, seen), ...input };
		delete schema.$ref;
	}
	if (schema.allOf) {
		const parts = schema.allOf.map((part) => resolveSchema(part, new Set(seen)));
		const properties = Object.assign(
			{},
			...parts.map((part) => part.properties),
			schema.properties,
		);
		const required = [
			...new Set(parts.flatMap((part) => part.required ?? []).concat(schema.required ?? [])),
		];
		schema = {
			...Object.assign({}, ...parts),
			...schema,
			...(Object.keys(properties).length ? { properties } : {}),
			...(required.length ? { required } : {}),
		};
		delete schema.allOf;
	}
	return schema;
}

/** Keep plain-text inputs stable when the API describes strings as a union. */
export function isStringInputSchema(input: ApiSchema): boolean {
	const schema = resolveSchema(input);
	if (schema.type === 'string') return true;
	const alternatives = schema.oneOf ?? schema.anyOf;
	return Boolean(
		alternatives?.length &&
			alternatives.every((alternative) => resolveSchema(alternative).type === 'string'),
	);
}

export function camelCase(name: string): string {
	return name
		.replace(/[^a-zA-Z0-9]+(.)?/g, (_match, letter: string) => (letter ? letter.toUpperCase() : ''))
		.replace(/^./, (letter) => letter.toLowerCase());
}

export function parameterName(prefix: string, name: string): string {
	const suffix = camelCase(name);
	return prefix + suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

export function fieldLabel(name: string): string {
	if (name === 'rate_escalation_date') return 'Rate Lock Until Date';
	return name
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (letter) => letter.toUpperCase())
		.replace(/\bId\b/g, 'ID')
		.replace(/\bUrl\b/g, 'URL');
}

export function writableProperties(input: ApiSchema): Array<[string, ApiSchema]> {
	return Object.entries(resolveSchema(input).properties ?? {})
		.map(([name, schema]): [string, ApiSchema] => [name, resolveSchema(schema)])
		.filter(([, schema]) => !schema.readOnly);
}

export function parseJson(value: unknown, label: string): unknown {
	if (typeof value !== 'string') return value;
	return jsonParse(value, { errorMessage: `${label} must contain valid JSON` });
}

function jsonEqual(left: unknown, right: unknown): boolean {
	if (left === right) return true;
	if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
	if (Array.isArray(left) !== Array.isArray(right)) return false;
	const leftObject = left as Record<string, unknown>;
	const rightObject = right as Record<string, unknown>;
	const leftKeys = Object.keys(leftObject);
	return (
		leftKeys.length === Object.keys(rightObject).length &&
		leftKeys.every(
			(key) =>
				Object.prototype.hasOwnProperty.call(rightObject, key) &&
				jsonEqual(leftObject[key], rightObject[key]),
		)
	);
}

function isCalendarDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const [, yearText, monthText, dayText] = match;
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	const monthLengths = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return month >= 1 && month <= 12 && day >= 1 && day <= monthLengths[month - 1];
}

function isDateTime(value: string): boolean {
	const match =
		/^(\d{4}-\d{2}-\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/.exec(
			value,
		);
	if (!match || !isCalendarDate(match[1])) return false;
	return (
		Number(match[2]) <= 23 &&
		Number(match[3]) <= 59 &&
		Number(match[4]) <= 59 &&
		(match[6] === undefined || (Number(match[6]) <= 23 && Number(match[7]) <= 59))
	);
}

/** Validate supplied values only; never insert defaults into a PATCH body. */
export function validateValue(value: unknown, input: ApiSchema, label: string, depth = 0): void {
	if (depth > 40) throw new Error(`${label} is nested too deeply`);
	const schema = resolveSchema(input);
	if (schema.readOnly) throw new Error(`${label} is read-only`);
	if (value === null) {
		if (schema.nullable || schema.enum?.includes(null)) return;
		throw new Error(`${label} cannot be null`);
	}
	for (const mode of ['oneOf', 'anyOf'] as const) {
		const candidates = schema[mode];
		if (!candidates) continue;
		const matching = candidates.filter((candidate) => {
			try {
				validateValue(value, candidate, label, depth + 1);
				return true;
			} catch {
				return false;
			}
		}).length;
		if (matching === 0 || (mode === 'oneOf' && matching !== 1))
			throw new Error(`${label} does not match an allowed value type`);
	}
	if (schema.not) {
		let matches = true;
		try {
			validateValue(value, schema.not, label, depth + 1);
		} catch {
			matches = false;
		}
		if (matches) throw new Error(`${label} matches a forbidden value type`);
	}
	if (schema.enum && !schema.enum.some((choice) => jsonEqual(choice, value)))
		throw new Error(`${label} must be one of the documented choices`);
	if (schema.type === 'object' || schema.properties) {
		if (Object.prototype.toString.call(value) !== '[object Object]')
			throw new Error(`${label} must be an object`);
		const object = value as Record<string, unknown>;
		const supplied = Object.entries(object).filter(([, child]) => child !== undefined);
		if (schema.minProperties !== undefined && supplied.length < schema.minProperties)
			throw new Error(`${label} has too few properties`);
		if (schema.maxProperties !== undefined && supplied.length > schema.maxProperties)
			throw new Error(`${label} has too many properties`);
		for (const key of schema.required ?? []) {
			if (schema.properties?.[key] && resolveSchema(schema.properties[key]).readOnly) continue;
			if (!Object.prototype.hasOwnProperty.call(object, key) || object[key] === undefined)
				throw new Error(`${label}.${key} is required`);
		}
		for (const [key, child] of supplied) {
			const property =
				schema.properties && Object.prototype.hasOwnProperty.call(schema.properties, key)
					? schema.properties[key]
					: undefined;
			if (property) validateValue(child, property, `${label}.${key}`, depth + 1);
			else if (schema.additionalProperties === false)
				throw new Error(`${label}.${key} is not a documented property`);
			else if (typeof schema.additionalProperties === 'object')
				validateValue(child, schema.additionalProperties, `${label}.${key}`, depth + 1);
		}
	} else if (schema.type === 'array') {
		if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
		if (schema.minItems !== undefined && value.length < schema.minItems)
			throw new Error(`${label} has too few items`);
		if (schema.maxItems !== undefined && value.length > schema.maxItems)
			throw new Error(`${label} has too many items`);
		if (
			schema.uniqueItems &&
			value.some((item, index) =>
				value.slice(0, index).some((previous) => jsonEqual(item, previous)),
			)
		)
			throw new Error(`${label} must contain unique items`);
		if (schema.items)
			value.forEach((item, index) =>
				validateValue(item, schema.items!, `${label}[${index}]`, depth + 1),
			);
	} else if (schema.type === 'integer' || schema.type === 'number') {
		if (
			typeof value !== 'number' ||
			!Number.isFinite(value) ||
			(schema.type === 'integer' && !Number.isInteger(value))
		)
			throw new Error(`${label} must be ${schema.type === 'integer' ? 'an integer' : 'a number'}`);
		if (schema.type === 'integer' && !Number.isSafeInteger(value))
			throw new Error(`${label} exceeds the safe integer range and would lose precision`);
		if (schema.minimum !== undefined && value < schema.minimum)
			throw new Error(`${label} must be at least ${schema.minimum}`);
		if (schema.maximum !== undefined && value > schema.maximum)
			throw new Error(`${label} must be at most ${schema.maximum}`);
		const exclusiveMinimum =
			typeof schema.exclusiveMinimum === 'number'
				? schema.exclusiveMinimum
				: schema.exclusiveMinimum
					? schema.minimum
					: undefined;
		const exclusiveMaximum =
			typeof schema.exclusiveMaximum === 'number'
				? schema.exclusiveMaximum
				: schema.exclusiveMaximum
					? schema.maximum
					: undefined;
		if (exclusiveMinimum !== undefined && value <= exclusiveMinimum)
			throw new Error(`${label} must be greater than ${exclusiveMinimum}`);
		if (exclusiveMaximum !== undefined && value >= exclusiveMaximum)
			throw new Error(`${label} must be less than ${exclusiveMaximum}`);
		if (schema.multipleOf !== undefined && schema.multipleOf > 0) {
			const quotient = value / schema.multipleOf;
			if (
				Math.abs(quotient - Math.round(quotient)) >
				Number.EPSILON * Math.max(1, Math.abs(quotient)) * 4
			)
				throw new Error(`${label} must be a multiple of ${schema.multipleOf}`);
		}
	} else if (schema.type === 'boolean') {
		if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean`);
	} else if (schema.type === 'string') {
		if (typeof value !== 'string') throw new Error(`${label} must be a string`);
		const length = [...value].length;
		if (schema.minLength !== undefined && length < schema.minLength)
			throw new Error(`${label} is too short`);
		if (schema.maxLength !== undefined && length > schema.maxLength)
			throw new Error(`${label} is too long`);
		if (schema.pattern && !new RegExp(schema.pattern).test(value))
			throw new Error(`${label} has an invalid format`);
		// A basic email shape check makes the documented email/empty-string union disjoint.
		// FieldHub remains responsible for its complete address validation policy.
		if (
			schema.format === 'email' &&
			!/^(?:"(?:[^"\\\r\n]|\\[^\r\n])+"|[^\s@"\\]+)@[^\s@]+$/u.test(value)
		)
			throw new Error(`${label} must be an email address`);
		if (schema.format === 'date' && !isCalendarDate(value))
			throw new Error(`${label} must be a valid date using YYYY-MM-DD`);
		if (schema.format === 'date-time' && !isDateTime(value))
			throw new Error(`${label} must be an ISO date-time with a timezone`);
	}
}
