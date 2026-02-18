import { RadixDappToolkit } from "@radixdlt/radix-dapp-toolkit";

import { EventCallbacksI } from "./transaction.types";
import { InstancePropsI } from "./entities.types";
import { RecordDocketI, DocketPropsI, RecordEntryI, RecordRefI } from "./record.types";
import { DomainDataI, SubDomainDataI } from "./domain.types";


export interface DispatcherPropsI extends InstancePropsI {

    rdt: RadixDappToolkit;
    callbacks?: EventCallbacksI;

}

/**
 * Domain Registration Props
 * Registers and bonds a domain
 */
export interface RegistrationDispatcherPropsI extends DispatcherPropsI {
    /** Domain name to register (e.g., "example.xrd") */
    domain: string;
    
    /** Account address registering the domain */
    accountAddress: string;
    
    /** 
     * Payment resource address (stablecoin)
     * If not provided, uses the first accepted payment resource from RNS config
     */
    paymentResource?: string;
    
    /**
     * Registrar badge ID (NonFungibleLocalId)
     * The registrar through which the domain will be registered
     */
    registrarId: string;
}

export interface ActivationDispatcherPropsI extends DispatcherPropsI {

    domainDetails: DomainDataI;
    accountAddress: string;

}

export interface SubdomainDispatcherPropsI extends DispatcherPropsI {

    subdomain: string;
    rootDomainDetails: DomainDataI;
    accountAddress: string;

}

export interface CreateRecordDispatcherPropsI extends DispatcherPropsI {

    accountAddress: string;
    domainDetails: DomainDataI | SubDomainDataI;
    docket: RecordDocketI;

}

export interface AmendRecordDispatcherPropsI extends DispatcherPropsI {

    accountAddress: string;
    domainDetails: DomainDataI | SubDomainDataI;
    docket: RecordDocketI;

}

export interface DeleteRecordDispatcherPropsI extends DispatcherPropsI {

    accountAddress: string;
    domainDetails: DomainDataI | SubDomainDataI;
    docket: DocketPropsI;

}

export interface DeleteRecordDispatcherByIdPropsI extends DispatcherPropsI {

    accountAddress: string;
    domainDetails: DomainDataI | SubDomainDataI;
    recordId: string;

}

/**
 * Domain Transfer Props
 * Transfers a domain NFT to a new owner
 */
export interface TransferDispatcherPropsI extends DispatcherPropsI {
    /** Domain name to transfer (e.g., "example.xrd") */
    domain: string;
    
    /** Current owner's account address */
    fromAddress: string;
    
    /** New owner's account address */
    destinationAddress: string;
    
    /** Optional transfer preferences */
    preferences?: TransferPreferencesI;
}

/**
 * Transfer Preferences
 */
export interface TransferPreferencesI {
    /**
     * Whether to spawn a new subregistry before transfer (clean slate)
     * If true, creates a new empty subregistry for the domain
     * If false (default), keeps existing records and subdomains
     */
    cleanTransfer?: boolean;
}

/**
 * Domain Unbond Props
 * Unbonds a domain and withdraws the bonded USD stable value
 */
export interface UnbondDispatcherPropsI extends DispatcherPropsI {
    /** Domain name to unbond (e.g., "example.xrd") */
    domain: string;
    
    /** Account address holding the domain */
    accountAddress: string;
    
    /**
     * Whether to preserve subregistry data (records and subdomains)
     * If true, subregistry data is preserved (can be reclaimed if re-registered)
     * If false (default), subregistry data is cleared
     */
    preserveSubregistryData?: boolean;
}

/**
 * Domain Rebond Props
 * 
 * Rebonds a domain with a different accepted payment resource.
 * Returns the old bond and any change from the new payment.
 */
export interface RebondDispatcherPropsI extends DispatcherPropsI {
    /** Domain name to rebond (e.g., "example.xrd") */
    domain: string;
    
    /** Account address holding the domain */
    accountAddress: string;
    
    /**
     * New payment resource address (stablecoin) to bond with
     * Must be an accepted payment resource
     */
    newPaymentResource: string;
}

/**
 * Update Account Settings Props
 * 
 * Unified interface for managing account RNS settings:
 * - Set or change primary domain
 * - Toggle discovery settings
 */
export interface UpdateAccountSettingsDispatcherPropsI extends DispatcherPropsI {
    /** Account address to update settings for */
    accountAddress: string;
    
    /** 
     * Domain name to set as primary (can be root or subdomain)
     * If provided, creates/updates config badge and sets this as primary domain
     */
    primaryDomain?: string;
    
    /**
     * Whether to enable domain discovery
     * - When setting primaryDomain: defaults to false (privacy-first)
     * - When only toggling discovery: required, updates existing config badge
     */
    enableDiscovery?: boolean;
}

/**
 * Import Accepted Domain Props
 * 
 * Imports an accepted domain into the Radix Namespace system.
 * The import domain NFT stays in the user's account (proof-based).
 */
export interface ImportDomainDispatcherPropsI extends DispatcherPropsI {
    /** Domain name to import (e.g., "example.xrd") */
    domain: string;
    
    /** Account address holding the import domain */
    accountAddress: string;
    
    /**
     * Payment resource address (stablecoin)
     * If not provided, uses the first accepted payment resource
     */
    paymentResource?: string;
}

/**
 * Claim from AccountLocker Props
 * 
 * Claims domain NFTs from the Radix Namespace AccountLocker.
 * Used when reserved domain claims or other operations stored NFTs in the locker
 * because the direct deposit to the claimant's account was rejected.
 */
export interface ClaimFromLockerDispatcherPropsI extends DispatcherPropsI {
    /** Account address to claim NFTs for (must be the stored claimant) */
    accountAddress: string;
    
    /**
     * Optional specific NFT IDs to claim.
     * If not provided, claims up to 100 domain NFTs by amount.
     */
    nftIds?: string[];
}

/**
 * Claim Reserved Domain Props
 * 
 * Claims a reserved domain for the designated claimant account.
 * Only the account that has been assigned the reservation can claim it.
 */
export interface ClaimReservedDomainDispatcherPropsI extends DispatcherPropsI {
    /** Reserved domain name to claim (e.g., "example.xrd") */
    domain: string;
    
    /** Claimant account address (must match the reserved claimant) */
    accountAddress: string;
    
    /**
     * Payment resource address (stablecoin)
     * If not provided, uses the first accepted payment resource
     */
    paymentResource?: string;
}

/**
 * Create Records (Batch) Props
 * 
 * Creates multiple records in a single transaction by calling set_records_batch
 * on the domain's DomainSubregistry component.
 */
export interface CreateRecordsDispatcherPropsI extends DispatcherPropsI {
    /** Account address creating the records */
    accountAddress: string;
    
    /** Domain or subdomain details */
    domainDetails: DomainDataI | SubDomainDataI;
    
    /** Array of records to create */
    records: RecordEntryI[];
}

/**
 * Delete Records (Batch) Props
 *
 * Deletes multiple records in a single transaction by calling delete_records_batch
 * on the domain's DomainSubregistry component.
 */
export interface DeleteRecordsDispatcherPropsI extends DispatcherPropsI {
    /** Account address deleting the records */
    accountAddress: string;
    
    /** Domain or subdomain details */
    domainDetails: DomainDataI | SubDomainDataI;
    
    /** Array of record references to delete */
    records: RecordRefI[];
}

/**
 * Delete Context Records Props
 * 
 * Deletes all records within a context in a single transaction by calling
 * delete_context_records on the domain's DomainSubregistry component.
 */
export interface DeleteContextRecordsDispatcherPropsI extends DispatcherPropsI {
    /** Account address deleting the records */
    accountAddress: string;
    
    /** Domain or subdomain details */
    domainDetails: DomainDataI | SubDomainDataI;
    
    /** Context to delete all records from */
    context: string;
}

/**
 * Update Subregistry Icon Props
 * 
 * Updates the icon_url metadata on the domain's DomainSubregistry component.
 */
export interface UpdateSubregistryIconDispatcherPropsI extends DispatcherPropsI {
    /** Domain name (e.g., "example.xrd") */
    domain: string;
    
    /** New icon URL */
    iconUrl: string;
    
    /** Account address holding the domain */
    accountAddress: string;
}

/**
 * Update Subregistry Dapp Definition Props
 * 
 * Updates the dapp_definition metadata on the domain's DomainSubregistry component.
 */
export interface UpdateSubregistryDappDefinitionDispatcherPropsI extends DispatcherPropsI {
    /** Domain name (e.g., "example.xrd") */
    domain: string;
    
    /** New dApp definition address */
    dappDefinitionAddress: string;
    
    /** Account address holding the domain */
    accountAddress: string;
}

/**
 * Update Domain Resource Props
 * 
 * Updates the domain resource address on the domain's DomainSubregistry component.
 * Used when the subregistry needs to recognize a new domain NFT resource.
 */
export interface UpdateDomainResourceDispatcherPropsI extends DispatcherPropsI {
    /** Domain name (e.g., "example.xrd") */
    domain: string;
    
    /** New domain resource address */
    newDomainResourceAddress: string;
    
    /** Account address holding the domain */
    accountAddress: string;
}

/**
 * Replace Subregistry Props
 * 
 * Spawns a new empty subregistry for the domain, replacing the current one.
 * The old subregistry is orphaned and becomes inaccessible.
 */
export interface ReplaceSubregistryDispatcherPropsI extends DispatcherPropsI {
    /** Domain name (e.g., "example.xrd") */
    domain: string;
    
    /** Account address holding the domain */
    accountAddress: string;
}