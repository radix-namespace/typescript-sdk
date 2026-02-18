import { PaginationInfoI } from "./pagination.types";

/**
 * Record Context Types
 * 
 * Records are stored in DomainSubregistry components as:
 * context -> directive -> value (nested HashMap structure)
 * 
 * Contexts organize records into logical groups.
 */
export type ContextT = 
    | "receivers"    // Payment/receiving addresses
    | "delegation"   // Delegation information
    | "navigation"   // URLs and navigation links
    | "social"       // Social media handles
    | "discovery"    // Discovery/search metadata
    | "widgets"      // Widget configurations
    | string;        // Custom contexts allowed

/**
 * Record Item
 * 
 * Represents a single record entry from a DomainSubregistry component.
 * Records are stored as context-directive-value triplets.
 * 
 * Records are retrieved from the domain's subregistry component,
 * not from a central storage location.
 * 
 * Reference: core-contracts/src/domain_subregistry.rs
 */
export interface RecordItemI {
    /** 
     * Record context (e.g., "social", "receivers")
     * Max 25 alphanumeric characters + underscore
     */
    context: string;
    
    /** 
     * Record directive/key within the context (e.g., "twitter", "wallet_address")
     * Max 180 characters
     */
    directive: string;
    
    /** 
     * Record value
     * Max 500 characters
     * Can be null if record doesn't exist
     */
    value: string | null;
    
    // ===== SDK Enrichment Fields =====
    
    /** Composite record ID for SDK tracking (e.g., "context:directive") */
    record_id?: string;
    
    /** Domain name this record belongs to */
    domain_name?: string;
    
    /** Whether this is a subdomain record */
    is_subdomain?: boolean;
}

/**
 * Record operation docket properties
 * Used when querying or validating records
 */
export interface DocketPropsI {
    /** Record context */
    context: ContextT | string;
    
    /** Record directive (optional for context-wide operations) */
    directive?: string;
    
}

/**
 * Record creation/update docket
 * Used when creating or updating records
 */
export interface RecordDocketI extends DocketPropsI {
    /** Record value */
    value: string;
}

/**
 * Record Entry for batch creation
 * 
 * Used with createRecords() for setting multiple records in one transaction.
 * Maps to set_records_batch in DomainSubregistry.
 */
export interface RecordEntryI {
    /** Record context (e.g., "social", "receivers") */
    context: string;
    
    /** Record directive/key within the context (e.g., "twitter", "wallet_address") */
    directive: string;
    
    /** Record value */
    value: string;
}

/**
 * Record Reference for batch deletion
 * 
 * Used with deleteRecords() for removing multiple records in one transaction.
 * Maps to delete_records_batch in DomainSubregistry.
 */
export interface RecordRefI {
    /** Record context */
    context: string;
    
    /** Record directive */
    directive: string;
}

/**
 * Record query result from subregistry
 */
export interface RecordQueryResultI {
    /** Domain or subdomain name */
    name: string;
    
    /** Records organized by context */
    records: Record<string, Record<string, string>>;
    
    /** Total record count */
    record_count: number;
}

/**
 * Context records result
 * All records within a specific context
 */
export interface ContextRecordsI {
    /** Context name */
    context: string;
    
    /** Map of directive -> value */
    directives: Record<string, string>;
}

/**
 * Paginated Records Response
 * 
 * Used when querying records from a domain's subregistry with pagination support.
 */
export interface PaginatedRecordsResponseI {
    /** Array of record items */
    records: RecordItemI[];
    
    /** Domain name these records belong to */
    domain_name: string;
    
    /** Pagination metadata */
    pagination: PaginationInfoI;
}
