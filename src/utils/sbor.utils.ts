import { ProgrammaticScryptoSborValue } from "@radixdlt/babylon-gateway-api-sdk";

/**
 * Result type for parsing operations
 */
export type ParseResult<T> = 
    | { success: true; value: T }
    | { success: false; error: string };

/**
 * Parse a resource address from various SBOR representations
 * 
 * Handles:
 * - Direct string: "resource_..."
 * - Own<ResourceManager>: { value: "resource_..." }
 * - Nested: { value: { value: "resource_..." } }
 * 
 * @example
 * ```typescript
 * const result = parseResourceAddress(fieldValue);
 * if (result.success) {
 *   console.log(result.value); // "resource_..."
 * }
 * ```
 */
export function parseResourceAddress(value: unknown): ParseResult<string> {
    if (!value) {
        return { success: false, error: 'Value is null or undefined' };
    }
    
    // Handle direct string values
    if (typeof value === 'string') {
        return { success: true, value };
    }
    
    // Handle object with nested value properties
    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        
        // Handle Own<ResourceManager> or similar structures
        if (obj.value) {
            if (typeof obj.value === 'string') {
                return { success: true, value: obj.value };
            }
            // Check nested value
            if (typeof obj.value === 'object' && obj.value !== null) {
                const nested = obj.value as Record<string, unknown>;
                if (nested.value && typeof nested.value === 'string') {
                    return { success: true, value: nested.value };
                }
            }
        }
        
        // Handle resource_address field
        if (obj.resource_address && typeof obj.resource_address === 'string') {
            return { success: true, value: obj.resource_address };
        }
    }
    
    return { success: false, error: 'Could not extract resource address from value' };
}

/**
 * Parse a component address from Global<T> SBOR representation
 * 
 * Handles:
 * - Direct string: "component_..."
 * - Global: { value: "component_..." }
 * 
 * @example
 * ```typescript
 * const result = parseComponentAddress(fieldValue);
 * if (result.success) {
 *   console.log(result.value); // "component_..."
 * }
 * ```
 */
export function parseComponentAddress(value: unknown): ParseResult<string> {
    if (!value) {
        return { success: false, error: 'Value is null or undefined' };
    }
    
    if (typeof value === 'string') {
        return { success: true, value };
    }
    
    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        if (obj.value && typeof obj.value === 'string') {
            return { success: true, value: obj.value };
        }
    }
    
    return { success: false, error: 'Could not extract component address from value' };
}

/**
 * Parse an array of strings from Vec<String> SBOR representation
 * 
 * Handles:
 * - Direct array: ["tag1", "tag2"]
 * - Fields array: { fields: [{ value: "tag1" }, { value: "tag2" }] }
 * 
 * @example
 * ```typescript
 * const result = parseStringArray(fieldValue);
 * if (result.success) {
 *   console.log(result.value); // ["tag1", "tag2"]
 * }
 * ```
 */
export function parseStringArray(value: unknown): ParseResult<string[]> {
    if (!value) {
        return { success: true, value: [] };
    }
    
    // Handle direct array values
    if (Array.isArray(value)) {
        const filtered = value.filter((item): item is string => typeof item === 'string');
        return { success: true, value: filtered };
    }

    // Handle fields array from programmatic JSON
    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        if (obj.fields && Array.isArray(obj.fields)) {
            const parsed = obj.fields
                .map((field: unknown) => {
                    if (typeof field === 'string') return field;
                    if (typeof field === 'object' && field !== null) {
                        const fieldObj = field as Record<string, unknown>;
                        if (fieldObj.value) return fieldObj.value;
                    }
                    return field;
                })
                .filter((item: unknown): item is string => typeof item === 'string');
            
            return { success: true, value: parsed };
        }
    }
    
    return { success: false, error: 'Could not parse as string array' };
}

/**
 * Parse a boolean from SBOR representation
 * 
 * Handles:
 * - Direct boolean: true/false
 * - String boolean: "true"/"false"
 * - Truthy/falsy values
 * 
 * @example
 * ```typescript
 * const result = parseBoolean(fieldValue);
 * if (result.success) {
 *   console.log(result.value); // true or false
 * }
 * ```
 */
export function parseBoolean(value: unknown): ParseResult<boolean> {
    if (typeof value === 'boolean') {
        return { success: true, value };
    }
    
    if (typeof value === 'string') {
        return { success: true, value: value === 'true' };
    }
    
    if (value === null || value === undefined) {
        return { success: true, value: false };
    }
    
    return { success: true, value: Boolean(value) };
}

/**
 * Parse a string from SBOR representation
 * 
 * Handles:
 * - Direct string: "value"
 * - String kind: { kind: "String", value: "value" }
 * 
 * @example
 * ```typescript
 * const result = parseString(fieldValue);
 * if (result.success) {
 *   console.log(result.value); // "value"
 * }
 * ```
 */
export function parseString(value: unknown): ParseResult<string> {
    if (typeof value === 'string') {
        return { success: true, value };
    }
    
    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        if (obj.kind === 'String' && typeof obj.value === 'string') {
            return { success: true, value: obj.value };
        }
    }
    
    return { success: false, error: 'Could not parse as string' };
}

/**
 * Helper to extract and parse a field from component state
 * 
 * @example
 * ```typescript
 * const domainResource = parseField(
 *   componentState,
 *   'domain_resource',
 *   parseResourceAddress
 * );
 * if (domainResource) {
 *   console.log(domainResource); // "resource_..."
 * }
 * ```
 */
export function parseField<T>(
    componentState: { fields: Array<{ field_name: string; value?: unknown }> },
    fieldName: string,
    parser: (value: unknown) => ParseResult<T>
): T | null {
    const field = componentState.fields.find(f => f.field_name === fieldName);
    if (!field || field.value === undefined) {
        return null;
    }
    
    const result = parser(field.value);
    return result.success ? result.value : null;
}


/**
 * Parse a u64 value from programmatic SBOR
 */
export function parseSborU64(value: ProgrammaticScryptoSborValue): ParseResult<number> {
    if (value.kind === 'U64') {
        return { success: true, value: parseInt(value.value, 10) };
    }
    return { success: false, error: `Expected U64, got ${value.kind}` };
}

/**
 * Parse a Decimal value from programmatic SBOR as string (for precision)
 */
export function parseSborDecimal(value: ProgrammaticScryptoSborValue): ParseResult<string> {
    if (value.kind === 'Decimal') {
        return { success: true, value: value.value };
    }
    return { success: false, error: `Expected Decimal, got ${value.kind}` };
}

/**
 * Parse an Instant from programmatic SBOR
 * Returns unix timestamp in seconds
 */
export function parseSborInstant(value: ProgrammaticScryptoSborValue | undefined): ParseResult<number> {
    if (!value) {
        return { success: false, error: 'Value is undefined' };
    }

    // Instant is stored as I64 seconds since Unix epoch
    if (value.kind === 'I64') {
        return { success: true, value: parseInt(value.value, 10) };
    }

    return { success: false, error: `Expected I64 for Instant, got ${value.kind}` };
}

/**
 * Parse an Option<Instant> from programmatic SBOR
 * Returns unix timestamp in seconds or null for None
 */
export function parseSborOptionInstant(value: ProgrammaticScryptoSborValue | undefined): ParseResult<number | null> {
    if (!value) {
        return { success: true, value: null };
    }
    
    // Option<T> comes as Enum with variants None (0) and Some (1)
    if (value.kind === 'Enum') {
        // None variant - check by name since variant_id is a string
        if (value.variant_name === 'None' || value.variant_id === '0') {
            return { success: true, value: null };
        }
        // Some variant - extract inner value
        if (value.variant_name === 'Some' || value.variant_id === '1') {
            const innerValue = value.fields?.[0];
            if (innerValue?.kind === 'I64') {
                // Instant is stored as seconds since Unix epoch
                return { success: true, value: parseInt(innerValue.value, 10) };
            }
        }
    }
    
    // Direct I64 value (non-optional case)
    if (value.kind === 'I64') {
        return { success: true, value: parseInt(value.value, 10) };
    }
    
    return { success: true, value: null };
}

/**
 * Parse a HashMap from programmatic SBOR into a Record
 * 
 * @param mapValue - The SBOR Map value
 * @param valueParser - Parser function for the map values
 * @returns Record with string keys and parsed values
 */
export function parseSborHashMap<T>(
    mapValue: ProgrammaticScryptoSborValue | undefined,
    valueParser: (v: ProgrammaticScryptoSborValue) => ParseResult<T>
): ParseResult<Record<string, T>> {
    const result: Record<string, T> = {};
    
    if (!mapValue) {
        return { success: true, value: result };
    }
    
    if (mapValue.kind !== 'Map') {
        return { success: false, error: `Expected Map, got ${mapValue.kind}` };
    }

    for (const entry of mapValue.entries || []) {
        const keyJson = entry.key;
        const valueJson = entry.value;
        
        // Extract key - typically a Reference (ResourceAddress) or String
        let key: string;
        if (keyJson.kind === 'Reference') {
            key = keyJson.value;
        } else if (keyJson.kind === 'String') {
            key = keyJson.value;
        } else {
            continue; // Skip unknown key types
        }
        
        const parsed = valueParser(valueJson);
        if (parsed.success) {
            result[key] = parsed.value;
        }
    }
    
    return { success: true, value: result };
}

/**
 * Exported namespace for convenient access to all parsers
 */
export const Sbor = {
    parseResourceAddress,
    parseComponentAddress,
    parseStringArray,
    parseBoolean,
    parseString,
    parseField,
    parseSborU64,
    parseSborDecimal,
    parseSborInstant,
    parseSborOptionInstant,
    parseSborHashMap,
};

