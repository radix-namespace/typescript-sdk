import Decimal from "decimal.js";
import { ComponentAddressString, ResourceAddressString } from "./entities.types";
import { ResourceDetailsI } from "./resource.types";
import { PaginationInfoI } from "./pagination.types";

/**
 * Domain NFT Data
 * 
 * Represents a Domain NFT as defined in the Radix Namespace blueprint.
 * Each domain now has its own dedicated subregistry component for managing
 * subdomains and records.
 * 
 * Reference: core-contracts/src/model.rs - Domain struct
 */
export interface DomainDataI {
    /** NFT ID (NonFungibleLocalId) - hash-based unique identifier */
    id: string;
    
    /** Domain name (e.g., "example.xrd") */
    name: string;
    
    /** 
     * Current activated owner address
     * null if domain has not been activated yet (requires calling activate_domain_ownership)
     */
    current_activated_owner: string | null;
    
    /** 
     * Bond information (enriched with resource details from Gateway API)
     * 
     * @example
     * ```typescript
     * domain.bond.resource.name      // "Fake USD"
     * domain.bond.resource.symbol    // "fUSD"
     * domain.bond.resource.icon_url  // "https://..."
     * domain.bond.amount             // Decimal("250")
     * ```
     */
    bond: {
        /** 
         * Full resource details with flattened metadata
         * Follows Radix metadata standards
         * Reference: https://docs.radixdlt.com/docs/metadata-for-wallet-display
         */
        resource: ResourceDetailsI;
        /** Bond amount as Decimal */
        amount: Decimal;
    };
    
    /** 
     * Dedicated subregistry component address for this domain
     * Each domain gets its own component that manages its subdomains and records
     */
    subregistry_component_address: ComponentAddressString;
    
    /** QR code image URL for the domain */
    key_image_url: string;

    /** Timestamp when domain was created/registered (milliseconds since epoch) */
    created_timestamp: number;
    
    /** 
     * Registrar that brokered the domain sale
     * null for imported domains
     * Reference: core-contracts/src/model.rs - Domain.issuer_registrar_id
     */
    issuer_registrar_id: string | null;
    
    // ===== SDK Enrichment Fields =====
    // These are added by the SDK, not from the NFT data
    
    /** List of subdomains (populated separately via subregistry queries) */
    subdomains?: SubDomainDataI[];
    
    /** Total number of subdomains for this domain (queried from subregistry) */
    subdomain_count?: number;
    
    /** Total number of records for this domain (queried from subregistry) */
    record_count?: number;
}

/**
 * Subdomain Record Data
 * 
 * Represents a subdomain stored in a DomainSubregistry component.
 * Subdomains are stored in the parent domain's dedicated subregistry.
 * 
 * Reference: core-contracts/src/model.rs - SubdomainRecord struct
 */
export interface SubDomainDataI {
    /** 
     * Subdomain name only (without root domain)
     * Example: "blog" (not "blog.example.xrd")
     */
    name: string;
    
    /** 
     * Full subdomain name including root domain
     * Example: "blog.example.xrd"
     */
    full_name: string;
    
    /** Timestamp when subdomain was created (milliseconds since epoch) */
    created_timestamp: number;
    
    /** Timestamp when subdomain was last updated (milliseconds since epoch) */
    updated_timestamp: number;
    
    /** 
     * Custom metadata key-value pairs
     * Arbitrary metadata that can be attached to subdomains
     */
    metadata: Record<string, string>;
    
    // ===== SDK Enrichment Fields =====
    
    /** Reference to the root domain (populated by SDK) */
    root_domain?: DomainDataI;
    
    /** QR code or image URL (if applicable) */
    key_image_url?: string;
}

// ===== Paginated Response Types =====

export interface PaginatedDomainsResponseI {
    domains: DomainDataI[];
    pagination: PaginationInfoI;
}

export interface PaginatedSubdomainsResponseI {
    subdomains: SubDomainDataI[];
    pagination: PaginationInfoI;
    root_domain_name: string;
}

// ===== Domain Status Types =====

/**
 * Domain availability status
 * Reference: core-contracts/src/model.rs - DomainStatus enum
 */
export type DomainStatusT = 
    | 'available'      // Can be registered by anyone
    | 'taken'          // Currently registered/bonded
    | 'reserved';      // Reserved for specific claimant

export interface DomainStatusInfoI {
    domain: string;
    status: DomainStatusT;
    /** Component address of the reserved claimant (only set when status is 'reserved') */
    reserved_for?: string;
}

// ===== Reserved Domain Types =====

/**
 * A reserved domain claim entry from the reserved_domain_claims KVS
 */
export interface ReservedDomainClaimI {
    /** Reserved domain name (e.g., "example.xrd") */
    domain: string;
    /** Account address designated as claimant */
    claimant: string;
}

/**
 * Response for listing reserved domains claimable by an account
 */
export interface ReservedDomainsResponseI {
    /** Reserved domain claims matching the queried account */
    claims: ReservedDomainClaimI[];
    /** Total number of reserved domains in the system */
    total_reserved: number;
}

// ===== Account Settings / Reverse Resolution Types =====

/**
 * Account Settings Result
 * 
 * Result of looking up an account's settings (primary domain and discovery).
 * Includes authenticity verification to ensure the primary domain is still
 * owned by the account.
 */
export interface AccountSettingsResultI {
    /** The primary domain name (can be root or subdomain) */
    primaryDomain: string;
    
    /** Whether domain discovery is enabled for this account */
    discoveryEnabled: boolean;
    
    /** 
     * Whether the primary domain is still authentically owned by the account
     * False if the domain has been transferred or unbonded
     */
    isAuthentic: boolean;
    
    /** The account address that was looked up */
    accountAddress: string;
    
    /** 
     * Domain details if authentic and available
     * null if not authentic or details couldn't be fetched
     */
    domainDetails: DomainDataI | null;
}

