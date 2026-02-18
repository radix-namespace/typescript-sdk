/**
 * Type guards and utilities for working with Radix Gateway API programmatic JSON types.
 * 
 * The Gateway API returns SBOR values as a discriminated union (ProgrammaticScryptoSborValue).
 * These utilities provide type-safe access to specific value types.
 */

import { NetworkT } from "../common/gateway.types";

import {
    ProgrammaticScryptoSborValue,
    ProgrammaticScryptoSborValueString,
    ProgrammaticScryptoSborValueTuple,
    ProgrammaticScryptoSborValueReference,
    ProgrammaticScryptoSborValueDecimal,
    ProgrammaticScryptoSborValueU32,
    ProgrammaticScryptoSborValueBool,
    ProgrammaticScryptoSborValueEnum,
    FungibleResourcesCollectionItemVaultAggregated,
    NonFungibleResourcesCollectionItemVaultAggregated
} from "@radixdlt/babylon-gateway-api-sdk";


// ============================================================================
// Type Guards for ProgrammaticScryptoSborValue variants
// ============================================================================

/**
 * Type guard for String SBOR values
 */
export function isStringValue(value: ProgrammaticScryptoSborValue | unknown): value is ProgrammaticScryptoSborValueString {
    return (
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        (value as ProgrammaticScryptoSborValueString).kind === 'String'
    );
}

/**
 * Type guard for Tuple SBOR values (structs with fields)
 */
export function isTupleValue(value: ProgrammaticScryptoSborValue | unknown): value is ProgrammaticScryptoSborValueTuple {
    return (
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        (value as ProgrammaticScryptoSborValueTuple).kind === 'Tuple' &&
        'fields' in value &&
        Array.isArray((value as ProgrammaticScryptoSborValueTuple).fields)
    );
}

/**
 * Type guard for Reference SBOR values (addresses)
 */
export function isReferenceValue(value: ProgrammaticScryptoSborValue | unknown): value is ProgrammaticScryptoSborValueReference {
    return (
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        (value as ProgrammaticScryptoSborValueReference).kind === 'Reference'
    );
}

/**
 * Type guard for Decimal SBOR values
 */
export function isDecimalValue(value: ProgrammaticScryptoSborValue | unknown): value is ProgrammaticScryptoSborValueDecimal {
    return (
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        (value as ProgrammaticScryptoSborValueDecimal).kind === 'Decimal'
    );
}

/**
 * Type guard for U32 SBOR values
 */
export function isU32Value(value: ProgrammaticScryptoSborValue | unknown): value is ProgrammaticScryptoSborValueU32 {
    return (
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        (value as ProgrammaticScryptoSborValueU32).kind === 'U32'
    );
}

/**
 * Type guard for Bool SBOR values
 */
export function isBoolValue(value: ProgrammaticScryptoSborValue | unknown): value is ProgrammaticScryptoSborValueBool {
    return (
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        (value as ProgrammaticScryptoSborValueBool).kind === 'Bool'
    );
}

/**
 * Type guard for Enum SBOR values
 */
export function isEnumValue(value: ProgrammaticScryptoSborValue | unknown): value is ProgrammaticScryptoSborValueEnum {
    return (
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        (value as ProgrammaticScryptoSborValueEnum).kind === 'Enum'
    );
}

/**
 * Type guard for checking if a value has fields (like Tuple or Enum)
 */
export function hasFields(value: unknown): value is { fields: ProgrammaticScryptoSborValue[] } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'fields' in value &&
        Array.isArray((value as { fields: unknown }).fields)
    );
}


// ============================================================================
// Field extraction utilities
// ============================================================================

/**
 * Finds a field by name in a Tuple or Enum's fields array
 */
export function findFieldByName(
    fields: ProgrammaticScryptoSborValue[],
    fieldName: string
): ProgrammaticScryptoSborValue | undefined {
    return fields.find(
        (f) => 'field_name' in f && f.field_name === fieldName
    );
}

/**
 * Gets string value from a field, returning undefined if not a string type
 */
export function getFieldStringValue(field: ProgrammaticScryptoSborValue | undefined): string | undefined {
    if (!field) return undefined;
    if (isStringValue(field)) return field.value;
    if ('value' in field && typeof (field as { value: unknown }).value === 'string') {
        return (field as { value: string }).value;
    }
    return undefined;
}

/**
 * Gets numeric value from a U32 field
 */
export function getFieldU32Value(field: ProgrammaticScryptoSborValue | undefined): number | undefined {
    if (!field) return undefined;
    if (isU32Value(field)) return parseInt(field.value);
    if ('value' in field) {
        const val = (field as { value: unknown }).value;
        if (typeof val === 'string') return parseInt(val);
        if (typeof val === 'number') return val;
    }
    return undefined;
}


// ============================================================================
// Vault type guards for aggregated resources
// ============================================================================

/**
 * Type guard for FungibleResourcesCollectionItemVaultAggregated
 * Checks for the presence of 'vaults' property which indicates vault aggregation
 */
export function isFungibleVaultAggregated(
    resource: unknown
): resource is FungibleResourcesCollectionItemVaultAggregated {
    return (
        typeof resource === 'object' &&
        resource !== null &&
        'vaults' in resource &&
        typeof (resource as FungibleResourcesCollectionItemVaultAggregated).vaults === 'object'
    );
}

/**
 * Type guard for NonFungibleResourcesCollectionItemVaultAggregated
 * Checks for the presence of 'vaults' property which indicates vault aggregation
 */
export function isNonFungibleVaultAggregated(
    resource: unknown
): resource is NonFungibleResourcesCollectionItemVaultAggregated {
    return (
        typeof resource === 'object' &&
        resource !== null &&
        'vaults' in resource &&
        typeof (resource as NonFungibleResourcesCollectionItemVaultAggregated).vaults === 'object'
    );
}


// ============================================================================
// Gateway API base path utilities
// ============================================================================

const gatewayBasePaths: Record<NetworkT, string> = {
    mainnet: 'https://mainnet.radixdlt.com',
    stokenet: 'https://stokenet.radixdlt.com'
};

/**
 * Gets the Gateway API base path for a given network
 */
export function getBasePath(network: NetworkT): string {
    return gatewayBasePaths[network];
}

