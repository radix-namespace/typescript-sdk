import { PaginationInfoI } from "./pagination.types";
import { ResourceAddressString } from "./entities.types";

/**
 * Import Domain NFT Data
 * 
 * Represents an Import Domain NFT from the accepted imports system.
 * These domains can be imported to the Radix Namespace using `importAcceptedDomain()`.
 * 
 * Import domains are identified by a hash of the domain name and contain
 * metadata about the original domain including deposit amounts and primary domain references.
 * 
 * Reference: core-contracts/src/model.rs - ImportDomain struct
 */
export interface ImportDomainI {
    /** Domain name (e.g., "example.xrd") */
    name: string;
    
    /** NFT ID (hash of domain name in bytes format) */
    id: string;
    
    /** 
     * Optional component address
     * In the import system, domains can reference a component address
     */
    address: string | null;
    
    /** Creation timestamp (milliseconds since epoch) */
    created_timestamp: number;
    
    /** 
     * Last valid timestamp if set (milliseconds since epoch)
     * null means no expiry
     */
    last_valid_timestamp: number | null;
    
    /**
     * Deposit amount info (if any deposit was made)
     * Tuple of (ResourceAddress, Decimal amount as string)
     */
    deposit_amount: { resource: ResourceAddressString; amount: string } | null;
    
    /**
     * Primary domain reference (NonFungibleLocalId)
     * References the primary domain NFT if this import is linked to one
     */
    primary_domain: string | null;
    
    /** Domain key image URL */
    key_image_url: string;
}

/**
 * Paginated Import Domains Response
 * 
 * Used when querying import domains owned by an account.
 * Follows the same pagination pattern as domain queries.
 */
export interface PaginatedImportDomainsI {
    /** Array of import domain data */
    domains: ImportDomainI[];
    
    /** Pagination metadata */
    pagination: PaginationInfoI;
}

