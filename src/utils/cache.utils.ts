/**
 * Cache Management Utilities
 * 
 * Centralized cache management for the RNS SDK.
 * Provides a unified way to clear all caches when needed
 * (e.g., when switching networks or during testing).
 */

import { clearResourceDetailsCache } from '../requests/resource/details';
import { clearAcceptedBondTokensCache } from './balance.utils';

/**
 * Clears all SDK caches
 * 
 * Use this when:
 * - Switching between networks (mainnet/stokenet)
 * - Running tests that need fresh data
 * - Forcing the SDK to refetch all cached data
 * 
 * @example
 * ```typescript
 * import { clearAllCaches } from '@radixnamespace/typescript-sdk';
 * 
 * // After switching networks
 * clearAllCaches();
 * ```
 */
export function clearAllCaches(): void {
    clearResourceDetailsCache();
    clearAcceptedBondTokensCache();
}

/**
 * Clears only the resource details cache
 * 
 * Resource details (name, symbol, icon, etc.) are cached per resource address.
 * Clear this if resource metadata has changed on-ledger.
 */
export { clearResourceDetailsCache } from '../requests/resource/details';

/**
 * Clears only the accepted bond tokens cache
 * 
 * Accepted payment resources are cached after the first fetch.
 * Clear this if the RNS Core component's accepted resources have changed.
 */
export { clearAcceptedBondTokensCache } from './balance.utils';

