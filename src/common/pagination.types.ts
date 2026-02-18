/**
 * Common Pagination Types
 * 
 * Standard pagination interfaces used across all SDK methods that return
 * paginated data (KeyValueStore queries, NFT lists, etc.)
 */

/**
 * Pagination parameters for requesting paginated data
 * 
 * @example
 * ```typescript
 * // Get first page (default)
 * await namespace.getRecords({ domain: 'example.xrd' });
 * 
 * // Get specific page
 * await namespace.getRecords({ domain: 'example.xrd', pagination: { page: 2 } });
 * ```
 */
export interface PaginationParamsI {
    /** Page number (1-indexed, defaults to 1) */
    page?: number;
}

/**
 * Pagination metadata returned with paginated responses
 * 
 * @example
 * ```typescript
 * const result = await namespace.getRecords({ domain: 'example.xrd' });
 * if (result.data) {
 *   console.log(`Page has ${result.data.pagination.current_page_count} items`);
 *   console.log(`Total: ${result.data.pagination.total_count} items`);
 *   if (result.data.pagination.next_page) {
 *     console.log(`More pages available`);
 *   }
 * }
 * ```
 */
export interface PaginationInfoI {
    /** Next page number, or null if this is the last page */
    next_page: number | null;
    /** Previous page number, or null if this is the first page */
    previous_page: number | null;
    /** Total count of items across all pages */
    total_count: number;
    /** Number of items in the current page */
    current_page_count: number;
}

