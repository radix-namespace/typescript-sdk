import NamespaceSDK from "..";
import { State, StateEntityDetailsResponseComponentDetails } from "@radixdlt/babylon-gateway-api-sdk";

import { NetworkT } from "./gateway.types";

// simplified config - just the main component address
export type ComponentReferencesT = {
    rnsCore: string | null;
};

// entity structure with auto-discovered resources
export type EntityStructT = {
    rnsCore: string | null;
};

export interface InstancePropsI {
    sdkInstance: NamespaceSDK;
}

export type EntitiesConfigT = {

    [key in NetworkT]: EntityStructT;

};

export interface ComponentDetailsI {

    kind: string;
    type_name: string;
    field_name: string;
    value: string;

}

export interface ComponentDetailsI {

    kind: string;
    type_name: string;
    field_name: string;
    value: string;

}

export interface ComponentCommonI {
    rootAddr: string;
}

/**
 * Radix Namespace Expansion Interface
 * 
 * Auto-discovered component state from the Radix Namespace blueprint.
 * All fields are populated from the component state via Gateway API queries.
 * 
 */
export interface NamespaceCoreExpansionI {
    // ===== NFT Resource Addresses =====
    // These are the main resources managed by Radix Namespace
    
    /** Domain NFT resource address (NonFungibleResourceManager) */
    domainResource: ResourceAddressString;
    
    /** Import domain NFT resource address (for accepted domain imports) */
    importDomainResource: ResourceAddressString;
    
    
    // ===== Badge Resource Addresses =====
    // Badges for admin, configuration, and service providers
    
    /** 
     * Admin badge resource (burned after initialization to make system immutable)
     * May be null if already burned
     */
    adminBadgeResource: ResourceAddressString;
    
    /** 
     * Config badge resource for address discovery/reverse resolution
     * Soulbound NFT that stores primary domain for each address
     */
    configBadgeResource: ResourceAddressString;
    
    /** 
     * Registrar badge resource for domain service providers
     * NFT badge that tracks fee collection and domain registrations
     */
    registrarBadgeResource: ResourceAddressString;
    
    
    // ===== Internal KeyValueStore Addresses =====
    // These KVStores hold the component's state data
    
    /** 
     * Bond vaults KeyValueStore address
     * Structure: KeyValueStore<ResourceAddress, Vault>
     * Holds bonded stablecoins for each accepted payment resource
     */
    bondVaults: KeyValueStoreAddressString;
    
    /** 
     * Domain registry KeyValueStore address
     * Structure: KeyValueStore<String, NonFungibleLocalId>
     * Maps domain names to their current NFT IDs (e.g., "example.xrd" -> NFT ID)
     */
    domainRegistry: KeyValueStoreAddressString;
    
    /** 
     * Registrar statistics KeyValueStore address
     * Structure: KeyValueStore<NonFungibleLocalId, RegistrarStats>
     * Tracks performance stats for each registrar (domains bonded, fees earned)
     */
    registrarStats: KeyValueStoreAddressString;
    
    /** 
     * Registrar fee vaults KeyValueStore address
     * Structure: KeyValueStore<(NonFungibleLocalId, ResourceAddress), Vault>
     * Stores collected fees for each registrar per payment resource
     */
    registrarFeeVaults: KeyValueStoreAddressString;
    
    
    /**
     * Reserved domain claims KeyValueStore address
     * Structure: KeyValueStore<String, ComponentAddress>
     * Maps reserved domain names to their designated claimant addresses
     */
    reservedDomainClaims: KeyValueStoreAddressString;
    
    /**
     * Domain counter key (used for sequential NFT ID generation)
     */
    domainCounterKey: number;
    
    /**
     * Account locker component address
     * Stores reserved domain NFTs for claimants
     */
    accountLocker: ComponentAddressString;
    
    /**
     * Registrar counter key (used for sequential registrar badge ID generation)
     */
    registrarCounterKey: number;
    
    /**
     * Accepted imports used KeyValueStore address
     * Structure: KeyValueStore<NonFungibleLocalId, bool>
     * Tracks which import domain NFTs have already been used
     */
    acceptedImportsUsed: KeyValueStoreAddressString;
    
    
    // ===== Component Metadata =====
    
    /** 
     * dApp definition account address (optional)
     * Created during instantiation, links all subregistries to the main dApp
     */
    dappDefinition: ComponentAddressString | null;
    
    /** 
     * Registration gate flag
     * false: Only admin can register domains (pre-launch)
     * true: Public registrations enabled (after admin badge burned)
     */
    isRegistrationActive: boolean;
    
    /**
     * Price ladder for domain registration
     * Structure: Record<character_length, required_bond_units>
     * 
     * Default ladder from Scrypto:
     * - "1": "2250" (1 char: 2,250 units)
     * - "2": "240"  (2 char: 240 units)
     * - "3": "120"  (3 char: 120 units)
     * - "4": "40"   (4 char: 40 units)
     * - Missing lengths default to "4" (4 units)
     * 
     */
    priceLadder: Record<string, DecimalString>;
    
    
    // ===== Subregistry Templates =====
    // Metadata templates applied to all spawned domain subregistry components
    
    subregistryConfig: {
        /** Template name for subregistry components (e.g., "RNS Domain Subregistry") */
        name: string;
        
        /** Template description for subregistry components */
        description: string;
        
        /** Template tags for subregistry components (e.g., ["rns", "subregistry"]) */
        tags: string[];
        
        /** Template icon URL for subregistry components */
        iconUrl: string;
    };
    
    
    // ===== Payment Configuration =====
    
    /** 
     * List of accepted stablecoin resource addresses for domain payments
     * Populated from bond_vaults KeyValueStore keys
     * Example: [fUSD_address, sUSD_address]
     */
    acceptedPaymentResources: ResourceAddressString[];
}

// ===== Type Aliases for Semantic Clarity =====
// These provide better documentation and type safety for Radix addresses

/** Radix resource address (e.g., "resource_tdx_...") */
export type ResourceAddressString = string;

/** Radix component address (e.g., "component_tdx_...") */
export type ComponentAddressString = string;

/** Radix KeyValueStore address (e.g., "internal_keyvaluestore_tdx_...") */
export type KeyValueStoreAddressString = string;

/** Decimal value represented as string for precision (e.g., "250.00") */
export type DecimalString = string;

export type ExpansionI = NamespaceCoreExpansionI;

export type ExpansionFunctionT<T = StateEntityDetailsResponseComponentDetails> = (componentDetails: T, state?: State, network?: NetworkT) => Promise<ExpansionI> | ExpansionI;

export interface ComponentStateI {
    fields: Array<{
        field_name: string;
        value?: unknown;  // Parsed by SBOR utilities in sbor.utils.ts
    }>;
}

// expanded components type
export type ExpandedComponentsT = {
    rnsCore: NamespaceCoreExpansionI & ComponentCommonI;
};

// entities type - single expanded rnsCore component
export type EntitiesT = {
    rnsCore: NamespaceCoreExpansionI & ComponentCommonI;
};

