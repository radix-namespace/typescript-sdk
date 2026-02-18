import { ErrorI } from "./response.types";

/**
 * Standard validation result type
 * Used by all validation utility functions for consistency
 */
export interface UtilValidationT {
    isValid: boolean;
    errors?: ErrorI[];
}

/**
 * Helper to create a valid validation result
 */
export function validResult(): UtilValidationT {
    return { isValid: true };
}

/**
 * Helper to create an invalid validation result
 */
export function invalidResult(error: ErrorI): UtilValidationT {
    return { isValid: false, errors: [error] };
}