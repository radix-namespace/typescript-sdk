import Decimal from "decimal.js";
import { ResourceAddressString } from "./entities.types";
import { ResourceDetailsI } from "./resource.types";
import { PaginationInfoI } from "./pagination.types";

/**
 * Registrar Details
 * 
 * Represents the business information for a domain service provider.
 * Each registrar receives a unique NFT badge for authentication.
 * 
 * Reference: core-contracts/src/model.rs - RegistrarInfo struct
 */
export interface RegistrarDetailsI {
    /** NonFungibleLocalId of the registrar badge */
    id: string;
    
    /** Business or service name (1-100 characters) */
    name: string;
    
    /** Public URL to registrar logo/icon */
    icon_url: string;
    
    /** Public URL to registrar's website */
    website_url: string;
    
    /** Fee percentage (e.g., 10 = 10%, 0.5 = 0.5%, 200 = 200%) */
    fee_percentage: Decimal;
    
    /** Timestamp when registrar was created (milliseconds since epoch) */
    created_at: number;
    
    /** Timestamp when registrar metadata was last updated (milliseconds since epoch) */
    updated_at: number;
}

/**
 * Registrar Fee Vault Entry
 * 
 * Represents accumulated fees for a specific registrar and payment resource.
 * Fees are stored in per-registrar vaults on the RNS Core component.
 */
export interface RegistrarFeeVaultI {
    /** Payment resource address (e.g., fUSD, sUSD) */
    resource_address: ResourceAddressString;
    
    /** 
     * Accumulated fee amount available for withdrawal
     * Represented as Decimal for precision
     */
    amount: Decimal;
    
    /** 
     * Enriched resource details (name, symbol, icon, etc.)
     * Populated via Gateway API query
     */
    resource: ResourceDetailsI;
}

/**
 * Paginated Registrar Fees Response
 * 
 * Used when querying fee vaults for a registrar across multiple payment resources.
 * Follows the same pagination pattern as domain/subdomain queries.
 */
export interface PaginatedRegistrarFeesI {
    /** Array of fee vault entries */
    fees: RegistrarFeeVaultI[];
    
    /** Pagination metadata */
    pagination: PaginationInfoI;
}

/**
 * Paginated Registrars Response
 * 
 * Used when querying all registrar badge IDs with pagination support.
 */
export interface PaginatedRegistrarsResponseI {
    /** Array of registrar badge IDs */
    registrar_ids: string[];
    
    /** Pagination metadata */
    pagination: PaginationInfoI;
}

/**
 * Registrar Statistics
 * 
 * Detailed performance statistics for a registrar, tracking domain registrations
 * and fee accumulation over time.
 * 
 * Reference: core-contracts/src/model.rs - RegistrarStats struct
 */
export interface RegistrarStatsI {
    /** 
     * Current active domain count per bond resource
     * Maps ResourceAddress -> count of domains currently bonded with that resource
     */
    domains_bonded: Record<string, number>;
    
    /** 
     * Lifetime total domains registered through this registrar
     * Cumulative count across all resources
     */
    domains_bonded_cumulative: number;
    
    /** 
     * Lifetime total fees earned per resource
     * Maps ResourceAddress -> total Decimal amount ever earned (as string for precision)
     */
    fees_earned_cumulative: Record<string, string>;
    
    /** 
     * Current available fees per resource (not yet withdrawn)
     * Maps ResourceAddress -> Decimal amount available to withdraw (as string for precision)
     */
    fees_earned_current: Record<string, string>;
    
    /** 
     * Timestamp of last fee withdrawal (milliseconds since epoch)
     * null if fees have never been withdrawn
     */
    last_withdrawal: number | null;
}
