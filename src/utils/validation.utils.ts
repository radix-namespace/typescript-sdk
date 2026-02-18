/**
 * Domain Validation Utilities
 * 
 * Shared validation helpers for domain ownership and state checks.
 * Reduces code duplication across dispatchers.
 */

import { requestDomainDetails } from "../requests/account/domains";
import { transactionError } from "./response.utils";
import errors from "../mappings/errors";

import { InstancePropsI } from "../common/entities.types";
import { DomainDataI } from "../common/domain.types";
import { SdkTransactionResponseT } from "../common/response.types";


// ============================================================================
// Error Message Constants
// ============================================================================

export const DOMAIN_ERRORS = {
    NOT_FOUND: "Domain not found or not registered",
    NO_SUBREGISTRY: "Domain does not have a subregistry component",
    NOT_OWNER: (currentOwner: string | null) => 
        `Domain is not activated for this account. Current owner: ${currentOwner || 'none'}`
} as const;


// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidatedDomainI {
    domainDetails: DomainDataI;
}

export type DomainValidationResultT<T = never> = 
    | ValidatedDomainI 
    | { error: SdkTransactionResponseT<T> };


// ============================================================================
// Error Factory Types
// ============================================================================

/**
 * Error factory interface for domain validation errors.
 * Uses a flexible signature that accepts domain (required internally) and verbose.
 */
interface ErrorFactoryI {
    generic: (params: { domain: string; verbose: string | null }) => ReturnType<typeof errors.subregistry.generic>;
    notOwner?: (params: { domain: string; accountAddress: string; currentOwner: string }) => ReturnType<typeof errors.subregistry.notOwner>;
}


// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Validates domain ownership and state
 * 
 * This helper consolidates the common validation pattern used across dispatchers:
 * 1. Fetch domain details
 * 2. Check for errors
 * 3. Verify domain exists and has an ID
 * 4. Optionally verify subregistry exists
 * 5. Verify ownership matches the account
 * 
 * @param domain - Domain name to validate
 * @param accountAddress - Account address that should own the domain
 * @param sdkInstance - SDK instance for API calls
 * @param options.requireSubregistry - Whether to require a subregistry component
 * @param options.errorFactory - Error factory for generating typed errors
 * @returns Validated domain details or error response
 * 
 * @example
 * ```typescript
 * const result = await validateDomainOwnership({
 *     domain,
 *     accountAddress,
 *     sdkInstance,
 *     requireSubregistry: true,
 *     errorFactory: errors.subregistry
 * });
 * 
 * if ('error' in result) return result.error;
 * 
 * const { domainDetails } = result;
 * // Use domainDetails.id, domainDetails.subregistry_component_address, etc.
 * ```
 */
export async function validateDomainOwnership<T = never>({
    domain,
    accountAddress,
    sdkInstance,
    requireSubregistry = false,
    errorFactory
}: {
    domain: string;
    accountAddress: string;
    sdkInstance: InstancePropsI['sdkInstance'];
    requireSubregistry?: boolean;
    errorFactory: ErrorFactoryI;
}): Promise<DomainValidationResultT<T>> {

    // Fetch domain details
    const domainDetails = await requestDomainDetails(domain, { sdkInstance });

    // Check for fetch error
    if (domainDetails instanceof Error) {
        return {
            error: transactionError(errorFactory.generic({
                domain,
                verbose: `Failed to fetch domain details: ${domainDetails.message}`
            }))
        };
    }

    // Check if domain exists
    if (!domainDetails || !domainDetails.id) {
        return {
            error: transactionError(errorFactory.generic({
                domain,
                verbose: DOMAIN_ERRORS.NOT_FOUND
            }))
        };
    }

    // Check if subregistry is required
    if (requireSubregistry && !domainDetails.subregistry_component_address) {
        return {
            error: transactionError(errorFactory.generic({
                domain,
                verbose: DOMAIN_ERRORS.NO_SUBREGISTRY
            }))
        };
    }

    // Check ownership
    if (domainDetails.current_activated_owner?.toLowerCase() !== accountAddress.toLowerCase()) {
        const currentOwner = domainDetails.current_activated_owner || 'none';
        
        // Use specific notOwner error if available, otherwise use generic
        if ('notOwner' in errorFactory && errorFactory.notOwner) {
            return {
                error: transactionError(errorFactory.notOwner({
                    domain,
                    accountAddress,
                    currentOwner
                }))
            };
        } else {
            return {
                error: transactionError(errorFactory.generic({
                    domain,
                    verbose: DOMAIN_ERRORS.NOT_OWNER(currentOwner)
                }))
            };
        }
    }

    // All validations passed
    return { domainDetails };
}


/**
 * Type guard to check if validation result contains an error
 */
export function isValidationError<T>(
    result: DomainValidationResultT<T>
): result is { error: SdkTransactionResponseT<T> } {
    return 'error' in result;
}


