import { GatewayApiClient, State, Status, Stream, Transaction } from '@radixdlt/babylon-gateway-api-sdk';
import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import Decimal from 'decimal.js';

import { requestDomainStatus } from './requests/domain/status';
import { requestReservedDomains } from './requests/domain/reserved';
import { requestRecords, resolveRecord } from './requests/domain/records';
import { requestAccountDomains, requestDomainDetails, requestDomainEntityDetails, getSubdomains } from './requests/account/domains';
import { requestAccountImportDomains } from './requests/account/imports';
import { requestAccountSettings } from './requests/account/account-settings';
import { requestAllRegistrars } from './requests/registrar/list';
import { requestRegistrarDetails } from './requests/registrar/details';
import { requestRegistrarStats } from './requests/registrar/stats';
import { requestRegistrarFeeBalances } from './requests/registrar/fee-balances';
import { dispatchDomainRegistration } from './dispatchers/domain/registration';
import { dispatchRecordCreation } from './dispatchers/record/create-record';
import { dispatchRecordDeletion, dispatchRecordDeletionById } from './dispatchers/record/delete-record';
import { dispatchRecordAmendment } from './dispatchers/record/amend-record';
import { dispatchCreateRecords } from './dispatchers/record/create-records';
import { dispatchDeleteRecords } from './dispatchers/record/delete-records';
import { dispatchDeleteContextRecords } from './dispatchers/record/delete-context';
import { dispatchDomainActivation } from './dispatchers/domain/activation';
import { dispatchSubdomainCreation } from './dispatchers/domain/subdomain-creation';
import { dispatchSubdomainDeletion } from './dispatchers/domain/subdomain-deletion';
import { dispatchDomainTransfer } from './dispatchers/domain/transfer';
import { dispatchDomainUnbond } from './dispatchers/domain/unbond';
import { dispatchDomainRebond } from './dispatchers/domain/rebond';
import { dispatchImportDomain } from './dispatchers/domain/import-domain';
import { dispatchUpdateAccountSettings } from './dispatchers/account/account-settings';
import { dispatchClaimReservedDomain } from './dispatchers/domain/claim-reserved';
import { dispatchClaimFromLocker } from './dispatchers/account/claim-from-locker';
import { dispatchRegistrarRegistration } from './dispatchers/registrar/registration';
import { dispatchRegistrarUpdate } from './dispatchers/registrar/update';
import { dispatchRegistrarBurn } from './dispatchers/registrar/burn';
import { dispatchRegistrarWithdrawFees } from './dispatchers/registrar/withdraw-fees';
import { dispatchUpdateSubregistryIcon, dispatchUpdateSubregistryDappDefinition, dispatchUpdateDomainResource, dispatchReplaceSubregistry } from './dispatchers/domain/subregistry-management';

import config from './entities.config';
import errors from './mappings/errors';
import { parameterProcessMap } from './mappings/sdk-processors';

import { expandComponents } from './utils/entity.utils';
import { getBasePath } from './utils/gateway.utils';
import { deriveDomainType, deriveRootDomain, validateDomain, validateSubdomain } from './utils/domain.utils';
import { generateAuthCheckProps, retrievalError, retrievalResponse, transactionError } from './utils/response.utils';
import { validateAccountAddress } from './utils/address.utils';
import { ProcessParameters, requireDependencies } from './decorators/sdk.decorators';
import type { RegistrarDetailsI } from './common/registrar.types';

import { EventCallbacksI } from './common/transaction.types';
import { DocketPropsI, RecordItemI, PaginatedRecordsResponseI, RecordEntryI, RecordRefI } from './common/record.types';
import { DomainDataI, SubDomainDataI, PaginatedDomainsResponseI, PaginatedSubdomainsResponseI, AccountSettingsResultI, ReservedDomainsResponseI } from './common/domain.types';
import { ImportDomainI, PaginatedImportDomainsI } from './common/import.types';
import { PaginationParamsI, PaginationInfoI } from './common/pagination.types';
import { PaginatedRegistrarsResponseI, PaginatedRegistrarFeesI, RegistrarStatsI } from './common/registrar.types';
import { RecordDocketI, ContextT } from './common/record.types';
import { CheckAuthenticityResponseT, DomainAttributesResponseT, SdkTransactionResponseT, RecordListResponseT, ResolvedRecordResponseT, ErrorI, ErrorStackI, SdkResponseT, TransactionFeedbackStackI, TransactionFeedbackI, RegistrationCostBreakdownI, ResolvedRecordI } from './common/response.types';
import { getCostBreakdown } from './utils/pricing.utils';
import { getAccountBondBalances, getAcceptedBondTokensWithMetadata, checkAccountBondAffordability, AccountBondBalancesResultI, BondAffordabilityResultI } from './utils/balance.utils';
import { ResourceDetailsI } from './common/resource.types';
import { EntitiesT } from './common/entities.types';
import { NetworkT } from './common/gateway.types';
import { UtilValidationT } from './common/util.types';
import { TransferPreferencesI } from './common/dispatcher.types';

// SDK Configuration
export type {
    NamespaceSDKConfigI
};

// Domain Types
export type {
    DomainDataI,
    SubDomainDataI,
    PaginatedDomainsResponseI,
    PaginatedSubdomainsResponseI,
    DomainAttributesResponseT,
    CheckAuthenticityResponseT,
    AccountSettingsResultI
};

// Pagination Types
export type {
    PaginationParamsI,
    PaginationInfoI
} from './common/pagination.types';

// Record Types
export type {
    RecordItemI,
    RecordDocketI,
    RecordEntryI,
    RecordRefI,
    DocketPropsI,
    RecordListResponseT,
    ResolvedRecordResponseT,
    PaginatedRecordsResponseI,
    ContextT
};

// Response & Error Types
export type {
    SdkResponseT,
    SdkTransactionResponseT,
    ErrorI,
    ErrorStackI,
    TransactionFeedbackStackI,
    TransactionFeedbackI,
    RegistrationCostBreakdownI,
    ResolvedRecordI
};

// Transaction Types
export type {
    EventCallbacksI,
    TransferPreferencesI
};

// Utility Types
export type {
    NetworkT,
    UtilValidationT
};

// Balance Types
export type {
    AccountBondBalancesResultI,
    ResourceBalanceInfoI,
    BondAffordabilityResultI,
    SufficientBalanceInfoI,
    InsufficientBalanceInfoI
} from './utils/balance.utils';

// Registrar Types
export type {
    RegistrarDetailsI,
    RegistrarStatsI,
    RegistrarFeeVaultI,
    PaginatedRegistrarFeesI,
    PaginatedRegistrarsResponseI
} from './common/registrar.types';

// Entity Types
export type {
    EntitiesT,
    NamespaceCoreExpansionI,
    ComponentCommonI,
    ResourceAddressString,
    ComponentAddressString,
    KeyValueStoreAddressString,
    DecimalString
} from './common/entities.types';

// Resource Types (canonical export)
export type {
    ResourceDetailsI,
    ResourceTypeT
} from './common/resource.types';

// Domain & Record Types
export type {
    DomainStatusT,
    DomainStatusInfoI,
    ReservedDomainClaimI,
    ReservedDomainsResponseI
} from './common/domain.types';

// Import Domain Types
export type {
    ImportDomainI,
    PaginatedImportDomainsI
} from './common/import.types';

// Domain Status Types
export type {
    StatusI
} from './common/status.types';

export type {
    RecordQueryResultI,
    ContextRecordsI
} from './common/record.types';

// Cache utilities
export { clearAllCaches, clearResourceDetailsCache, clearAcceptedBondTokensCache } from './utils/cache.utils';

interface NamespaceSDKConfigI {

    gateway?: GatewayApiClient;
    rdt?: RadixDappToolkit;
    network?: NetworkT;

}

@ProcessParameters(parameterProcessMap)
export default class NamespaceSDK {

    network: NetworkT;
    rdt: RadixDappToolkit;
    state: State;
    transaction: Transaction;
    status: Status;
    stream: Stream;
    entities: EntitiesT;

    constructor({ gateway, rdt, network = 'mainnet' }: NamespaceSDKConfigI) {

        this.network = network;
        this.rdt = rdt;
        this.initGateway({ gateway });

    }

    /**
     * Fetch SDK dependencies (entities from RNS Core component)
     * 
     * Called automatically by @requireDependencies decorator before method execution.
     * Can also be called manually to pre-load entities (useful in tests or for eager loading).
     * 
     * Uses instance-level memoization - only fetches once per SDK instance.
     * 
     * @example
     * ```typescript
     * const namespace = new NamespaceSDK({ network: 'stokenet' });
     * await namespace.fetchDependencies(); // Pre-load entities
     * console.log(namespace.entities); // Now available
     * ```
     */
    public async fetchDependencies(): Promise<void> {

        await this.dAppEntities();

    }

    private initGateway({ gateway, gatewayEndpoint }: { gateway?: GatewayApiClient; gatewayEndpoint?: string; }): void {

        const gatewayInstance = gateway ?? GatewayApiClient.initialize({
            basePath: gatewayEndpoint ?? getBasePath(this.network),
            applicationName: 'The Radix Name Service'
        });

        const { status, state, transaction, stream } = gatewayInstance;

        this.state = state;
        this.status = status;
        this.transaction = transaction;
        this.stream = stream;

    }

    private checkInitialized(): void {

        if (!this.state || !this.status || !this.transaction || !this.stream) {
            throw new Error('RNS SDK: The RNS SDK is not fully initialized.');
        }
    }

    private checkEntitiesLoaded(): void {

        this.checkInitialized();
        
        if (!this.entities || !this.entities.rnsCore) {
            throw new Error('RNS SDK: Entities not loaded. Please call fetchDependencies() first.');
        }
    }

    private async dAppEntities(): Promise<EntitiesT> {

        try {

            if (!this.entities) {

                // Auto-discover all resources from the RNS Core component
                const namespaceCoreAddress = config[this.network].rnsCore;

                if (!namespaceCoreAddress) {
                    throw new Error(`Radix Namespace component address not configured for network: ${this.network}`);
                }

                this.entities = await expandComponents(namespaceCoreAddress, this.state, this.network);

            }

            return this.entities;

        } catch (error) {
            throw new Error(`RNS SDK: Could not fetch RNS entities: ${error instanceof Error ? error.message : String(error)}`);
        }

    }

    /**
     * Get Domain Status
     * 
     * Checks the status of a domain name to determine if it's available for registration,
     * already registered, or invalid.
     * 
     * @category Domain Queries
     * @param options - The options object
     * @param options.domain - Domain name to check (e.g., "example.xrd")
     * @returns Domain status including availability, registration details, and attributes
     * 
     * @example
     * ```typescript
     * const status = await namespace.getDomainStatus({ domain: 'example.xrd' });
     * 
     * if (status.data?.status === 'available') {
     *   console.log('Domain is available for registration!');
     * } else if (status.data?.status === 'registered') {
     *   console.log('Domain is taken');
     * }
     * ```
     */
    @requireDependencies('read-only')
    async getDomainStatus({ domain }: { domain: string }): Promise<SdkResponseT<DomainAttributesResponseT>> {

        const attributes = await requestDomainStatus(domain, { sdkInstance: this });

        if (attributes instanceof Error)
            return retrievalError(errors.domain.generic({ domain, verbose: attributes.message }));

        return retrievalResponse(attributes);

    }

    /**
     * Get Domain Details
     * 
     * Retrieves comprehensive details for a registered domain or subdomain,
     * including owner, subregistry address, and records KeyValueStore address.
     * 
     * Includes an authenticity check to verify the domain is legitimately owned.
     * 
     * @category Domain Queries
     * @param options - The options object
     * @param options.domain - Domain or subdomain name (e.g., "example.xrd" or "blog.example.xrd")
     * @returns Domain details including name, ID, owner, and subregistry info
     * 
     * @example
     * ```typescript
     * const details = await namespace.getDomainDetails({ domain: 'example.xrd' });
     * 
     * if (details.data) {
     *   console.log(`Owner: ${details.data.current_activated_owner}`);
     *   console.log(`NFT ID: ${details.data.id}`);
     * }
     * ```
     */
    @requireDependencies('read-only')
    async getDomainDetails({ domain }: { domain: string }): Promise<SdkResponseT<DomainDataI | SubDomainDataI>> {

        const details = await requestDomainEntityDetails(domain, { sdkInstance: this });

        if (details instanceof Error)
            return retrievalError(errors.domain.generic({ domain, verbose: details.message }));
        if (!details)
            return retrievalError(errors.domain.empty({ domain }));

        const authCheckProps = generateAuthCheckProps({ domain, details });
        const isAuthentic = await this.checkAuthenticity(authCheckProps);

        if (!isAuthentic)
            return retrievalError(errors.account.authenticityMismatch({ domain: authCheckProps.domain }));

        return retrievalResponse(details);

    }

    /**
     * Get Records
     * 
     * Retrieves all records for a domain with pagination support.
     * Records are stored in a context:directive format (e.g., "social:twitter").
     * 
     * @category Domain Queries
     * @param options - The options object
     * @param options.domain - Domain or subdomain name
     * @param options.pagination - Optional pagination parameters
     * @returns Paginated list of records with their context, directive, and value
     * 
     * @example
     * ```typescript
     * const records = await namespace.getRecords({
     *   domain: 'example.xrd',
     *   pagination: { page: 1 }
     * });
     * 
     * records.data?.records.forEach(record => {
     *   console.log(`${record.context}:${record.directive} = ${record.value}`);
     * });
     * ```
     */
    @requireDependencies('read-only')
    async getRecords({ domain, pagination }: { domain: string; pagination?: PaginationParamsI }): Promise<SdkResponseT<PaginatedRecordsResponseI>> {

        const details = await requestDomainEntityDetails(domain, { sdkInstance: this });

        if (details instanceof Error)
            return retrievalError(errors.domain.generic({ domain, verbose: details.message }));
        if (!details)
            return retrievalError(errors.domain.empty({ domain }));

        const authCheckProps = generateAuthCheckProps({ domain, details });
        const isAuthentic = await this.checkAuthenticity(authCheckProps);

        if (!isAuthentic)
            return retrievalError(errors.account.authenticityMismatch({ domain: authCheckProps.domain }));

        const records = await requestRecords(domain, { sdkInstance: this }, pagination);

        if (records instanceof Error)
            return retrievalError(errors.record.retrieval({ domain, verbose: records.message }));

        return retrievalResponse(records);

    }

    /**
     * Resolve Record
     * 
     * Resolves a specific record by its context and directive combination.
     * Use this for targeted lookups when you know the exact record you need.
     * 
     * @category Domain Queries
     * @param options - The options object
     * @param options.domain - Domain or subdomain name
     * @param options.docket - Record identifier with context and directive
     * @returns The resolved record value
     * 
     * @example
     * ```typescript
     * // Resolve XRD receiver address
     * const record = await namespace.resolveRecord({
     *   domain: 'alice.xrd',
     *   docket: { context: 'receivers', directive: 'xrd' }
     * });
     * 
     * if (record.data?.value) {
     *   console.log(`Send XRD to: ${record.data.value}`);
     * }
     * ```
     */
    @requireDependencies('read-only')
    async resolveRecord({ domain, docket }: { domain: string; docket: DocketPropsI }): Promise<SdkResponseT<ResolvedRecordResponseT>> {

        const details = await requestDomainEntityDetails(domain, { sdkInstance: this });

        if (details instanceof Error)
            return retrievalError(errors.account.authenticityMismatch({ domain, verbose: details.message }));

        const authCheckProps = generateAuthCheckProps({ domain, details });
        const isAuthentic = await this.checkAuthenticity(authCheckProps);

        if (!isAuthentic)
            return retrievalError(errors.account.authenticityMismatch({ domain: authCheckProps.domain }));

        const record = await resolveRecord(domain, { context: docket.context, directive: docket.directive }, { sdkInstance: this });

        if (record instanceof Error)
            return retrievalError(errors.record.retrieval({ domain, verbose: record.message }));

        return retrievalResponse(record);

    }

    /**
     * Get Account Domains
     * 
     * Retrieves all domains owned by an account with pagination support.
     * Returns both root domains and subdomains held by the account.
     * 
     * @category Domain Queries
     * @param options - The options object
     * @param options.accountAddress - Radix account address to query
     * @param options.pagination - Optional pagination parameters
     * @returns Paginated list of domains owned by the account
     * 
     * @example
     * ```typescript
     * const domains = await namespace.getAccountDomains({
     *   accountAddress: 'account_rdx...',
     *   pagination: { page: 1 }
     * });
     * 
     * console.log(`Account owns ${domains.data?.pagination.total_count} domains`);
     * domains.data?.domains.forEach(d => console.log(d.name));
     * ```
     */
    @requireDependencies('read-only')
    async getAccountDomains({ accountAddress, pagination }: { accountAddress: string; pagination?: PaginationParamsI }): Promise<SdkResponseT<PaginatedDomainsResponseI>> {

        const accountDomains = await requestAccountDomains(accountAddress, { sdkInstance: this }, pagination);

        if (accountDomains instanceof Error)
            return retrievalError(errors.account.retrieval({ accountAddress, verbose: accountDomains.message }));

        return retrievalResponse(accountDomains);

    }

    /**
     * Get Account Import Domains
     * 
     * Lists all accepted import domains owned by an account.
     * Use this to discover which domains can be imported into the Radix Namespace.
     * 
     * Once discovered, use existing utilities to check costs and import:
     * - `utils.getCostBreakdown({ domain })` - Calculate bond required
     * - `utils.checkAccountBondAffordability()` - Check if account can afford
     * - `importAcceptedDomain({ domain })` - Import each domain
     * 
     * @category Domain Import
     * @param options - The options object
     * @param options.accountAddress - Account address to query
     * @param options.pagination - Optional pagination parameters
     * @returns Paginated list of import domains
     * 
     * @example
     * ```typescript
     * // Discover import domains
     * const imports = await namespace.getAccountImportDomains({ 
     *   accountAddress: 'account_rdx...' 
     * });
     * 
     * if (imports.data.domains.length > 0) {
     *   console.log(`Found ${imports.data.domains.length} domains to import`);
     *   
     *   // Import each domain
     *   for (const domain of imports.data.domains) {
     *     await namespace.importAcceptedDomain({ 
     *       domain: domain.name, 
     *       accountAddress: 'account_rdx...' 
     *     });
     *   }
     * }
     * ```
     */
    @requireDependencies('read-only')
    async getAccountImportDomains({ accountAddress, pagination }: { accountAddress: string; pagination?: PaginationParamsI }): Promise<SdkResponseT<PaginatedImportDomainsI>> {

        const importDomains = await requestAccountImportDomains({ accountAddress, sdkInstance: this, pagination });

        if (importDomains instanceof Error)
            return retrievalError(errors.account.retrieval({ accountAddress, verbose: importDomains.message }));

        return retrievalResponse(importDomains);

    }

    /**
     * Check Authenticity
     * 
     * Verifies that a domain is legitimately owned by the claimed account.
     * Use this to validate domain ownership before trusting domain data.
     * 
     * @category Domain Queries
     * @param options - The options object
     * @param options.domain - Domain name to verify
     * @param options.accountAddress - Account address claiming ownership
     * @returns Authenticity status indicating if the account truly owns the domain
     * 
     * @example
     * ```typescript
     * const check = await namespace.checkAuthenticity({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...'
     * });
     * 
     * if (check.data?.isAuthentic) {
     *   console.log('Domain ownership verified!');
     * }
     * ```
     */
    @requireDependencies('read-only')
    async checkAuthenticity({ domain, accountAddress }: { domain: string; accountAddress: string }): Promise<SdkResponseT<CheckAuthenticityResponseT>> {

        const accountDomainsResponse = await requestAccountDomains(accountAddress, { sdkInstance: this });

        if (accountDomainsResponse instanceof Error)
            return retrievalError(errors.account.retrieval({ accountAddress, verbose: accountDomainsResponse.message }));

        const isAuthentic = accountDomainsResponse.domains?.find((interestDomain: DomainDataI) => interestDomain.name === domain)?.current_activated_owner === accountAddress;

        return retrievalResponse({ isAuthentic });

    }

    /**
     * Get Account Settings (Primary Domain & Discovery)
     * 
     * Retrieves the RNS configuration for an account, including primary domain and
     * discovery settings. Use this for account owners to view their own settings.
     * 
     * The method:
     * 1. Checks if the account has a config badge (soulbound NFT)
     * 2. Reads the config badge metadata for the primary domain and discovery status
     * 3. Verifies the primary domain is still owned by the same account (authenticity check)
     * 
     * @category Account Settings
     * @param options - The options object
     * @param options.accountAddress - Account address to look up
     * @returns Account settings with primary domain, discovery status, and authenticity
     * 
     * @example
     * ```typescript
     * const result = await namespace.getAccountSettings({
     *   accountAddress: 'account_...'
     * });
     * 
     * if (result.data) {
     *   console.log(`Primary domain: ${result.data.primaryDomain}`);
     *   console.log(`Discovery enabled: ${result.data.discoveryEnabled}`);
     *   console.log(`Is authentic: ${result.data.isAuthentic}`);
     * 
     *   if (!result.data.isAuthentic) {
     *     console.warn('Primary domain is no longer owned by this account');
     *   }
     * } else {
     *   console.log('No settings configured for this account');
     * }
     * ```
     */
    @requireDependencies('read-only')
    async getAccountSettings({ accountAddress }: { accountAddress: string }): Promise<SdkResponseT<AccountSettingsResultI | null>> {

        const accountSettings = await requestAccountSettings(accountAddress, { sdkInstance: this });

        if (accountSettings instanceof Error)
            return retrievalError(errors.account.retrieval({ accountAddress, verbose: accountSettings.message }));

        return retrievalResponse(accountSettings);

    }

    /**
     * Get Subdomains
     * 
     * Retrieves all subdomains under a parent domain with pagination support.
     * 
     * @category Domain Queries
     * @param options - The options object
     * @param options.domain - Parent domain name (e.g., "example.xrd")
     * @param options.pagination - Optional pagination parameters
     * @returns Paginated list of subdomains under the parent domain
     * 
     * @example
     * ```typescript
     * const subdomains = await namespace.getSubdomains({
     *   domain: 'example.xrd',
     *   pagination: { page: 1 }
     * });
     * 
     * subdomains.data?.subdomains.forEach(sub => {
     *   console.log(`${sub.name} - created by ${sub.created_by}`);
     * });
     * ```
     */
    @requireDependencies('read-only')
    async getSubdomains({ domain, pagination }: { domain: string; pagination?: PaginationParamsI }): Promise<SdkResponseT<PaginatedSubdomainsResponseI>> {

        const subdomains = await getSubdomains(domain, { sdkInstance: this }, pagination);

        if (subdomains instanceof Error)
            return retrievalError(errors.domain.generic({ domain, verbose: subdomains.message }));

        return retrievalResponse(subdomains);

    }

    /**
     * Register Domain
     * 
     * Registers a new domain through a registrar. Requires payment of the bond amount
     * plus registrar fee. The bond is refundable when the domain is unbonded.
     * 
     * @category Domain Transactions
     * @param options - The options object
     * @param options.domain - Domain name to register (e.g., "example.xrd")
     * @param options.accountAddress - Account to receive the domain NFT
     * @param options.registrarId - Registrar badge ID to register through
     * @param options.paymentResource - Optional payment resource (defaults to first accepted)
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.registerDomain({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...',
     *   registrarId: '1',
     *   callbacks: {
     *     onSuccess: () => console.log('Domain registered!')
     *   }
     * });
     * ```
     */
    @requireDependencies('full')
    async registerDomain({ domain, accountAddress, paymentResource, registrarId, callbacks }: { domain: string; accountAddress: string; paymentResource?: string; registrarId: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const attributes = await requestDomainStatus(domain, { sdkInstance: this });

        if (attributes instanceof Error)
            return transactionError(errors.registration.generic({ domain, verbose: attributes.message }));
        if (attributes.status === 'taken')
            return transactionError(errors.domain.unavailable({ domain }));
        if (attributes.status === 'reserved')
            return transactionError(errors.domain.unavailable({ domain, verbose: `Domain is reserved for a specific claimant.` }));

        return dispatchDomainRegistration({
            sdkInstance: this,
            domain,
            rdt: this.rdt,
            accountAddress,
            paymentResource,
            registrarId,
            callbacks
        });

    }

    /**
     * Claim Reserved Domain
     * 
     * Claims a domain that has been reserved for your account. Only the designated
     * claimant can claim a reserved domain. No registrar is needed.
     * 
     * @category Domain Transactions
     * @param options - The options object
     * @param options.domain - Reserved domain name to claim (e.g., "example.xrd")
     * @param options.accountAddress - Claimant account address (must match reservation)
     * @param options.paymentResource - Optional payment resource (defaults to first accepted)
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.claimReservedDomain({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...'
     * });
     * ```
     */
    @requireDependencies('full')
    async claimReservedDomain({ domain, accountAddress, paymentResource, callbacks }: { domain: string; accountAddress: string; paymentResource?: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchClaimReservedDomain({
            sdkInstance: this,
            rdt: this.rdt,
            domain,
            accountAddress,
            paymentResource,
            callbacks
        });

    }

    /**
     * Get Reserved Domains
     * 
     * Lists all reserved domain claims that the specified account is eligible to claim.
     * Queries the reserved_domain_claims KeyValueStore and filters by account address.
     * 
     * Use this to discover which domains are reserved for you before calling claimReservedDomain.
     * 
     * @category Domain Queries
     * @param options - The options object
     * @param options.accountAddress - Account address to check reserved claims for
     * @returns Reserved domains claimable by the account, plus total reserved count
     * 
     * @example
     * ```typescript
     * const result = await namespace.getReservedDomains({
     *   accountAddress: 'account_rdx...'
     * });
     * 
     * if (result.data && result.data.claims.length > 0) {
     *   console.log(`You can claim ${result.data.claims.length} reserved domains:`);
     *   result.data.claims.forEach(claim => {
     *     console.log(`  - ${claim.domain}`);
     *   });
     * } else {
     *   console.log('No reserved domains for this account');
     * }
     * ```
     */
    @requireDependencies('read-only')
    async getReservedDomains({ accountAddress }: { accountAddress: string }): Promise<SdkResponseT<ReservedDomainsResponseI>> {

        const reserved = await requestReservedDomains(accountAddress, { sdkInstance: this });

        if (reserved instanceof Error)
            return retrievalError(errors.account.retrieval({ accountAddress, verbose: reserved.message }));

        return retrievalResponse(reserved);

    }

    /**
     * Claim Domain NFTs from Account Locker
     * 
     * Claims domain NFTs that are stored in the Radix Namespace AccountLocker.
     * This is needed when a reserved domain was claimed but the direct deposit
     * to the claimant's account was rejected (e.g., due to account deposit rules).
     * 
     * The AccountLocker verifies account ownership by reading the claimant
     * account's owner role and asserting against it.
     * 
     * **Two modes:**
     * - If `nftIds` is provided: Claims those specific domain NFTs
     * - If `nftIds` is omitted: Claims up to 100 domain NFTs stored for the account
     * 
     * @category Domain Transactions
     * @param options - The options object
     * @param options.accountAddress - Account to claim domain NFTs for
     * @param options.nftIds - Optional specific NFT IDs to claim
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * // Claim all stored domain NFTs from the locker
     * const result = await namespace.claimFromLocker({
     *   accountAddress: 'account_rdx...'
     * });
     * 
     * // Claim specific domain NFTs by ID
     * const result = await namespace.claimFromLocker({
     *   accountAddress: 'account_rdx...',
     *   nftIds: ['<nft-id-1>', '<nft-id-2>']
     * });
     * ```
     */
    @requireDependencies('full')
    async claimFromLocker({ accountAddress, nftIds, callbacks }: { accountAddress: string; nftIds?: string[]; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchClaimFromLocker({
            sdkInstance: this,
            rdt: this.rdt,
            accountAddress,
            nftIds,
            callbacks
        });

    }

    /**
     * Activate Domain
     * 
     * Activates a domain to enable record management and other operations.
     * A domain must be activated before records can be created or modified.
     * 
     * @category Domain Transactions
     * @param options - The options object
     * @param options.domain - Domain name to activate
     * @param options.accountAddress - Account holding the domain
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.activateDomain({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...'
     * });
     * ```
     */
    @requireDependencies('full')
    async activateDomain({ domain, accountAddress, callbacks }: { domain: string; accountAddress: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const domainDetails = await requestDomainDetails(domain, { sdkInstance: this });

        if (domainDetails instanceof Error)
            return transactionError(errors.domain.generic({ domain, verbose: domainDetails.message }));
        if (!domainDetails)
            return transactionError(errors.domain.empty({ domain }));

        return dispatchDomainActivation({
            sdkInstance: this,
            domainDetails,
            accountAddress,
            rdt: this.rdt,
            callbacks
        });

    }

    /**
     * Create Subdomain
     * 
     * Creates a subdomain under a root domain you own.
     * Subdomains share the parent domain's subregistry.
     * 
     * @category Subdomains
     * @param options - The options object
     * @param options.subdomain - Full subdomain name (e.g., "blog.example.xrd")
     * @param options.accountAddress - Account holding the parent domain
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.createSubdomain({
     *   subdomain: 'blog.example.xrd',
     *   accountAddress: 'account_rdx...'
     * });
     * ```
     */
    @requireDependencies('full')
    async createSubdomain({ subdomain, accountAddress, callbacks }: { subdomain: string; accountAddress: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const rootDomainDetails = await requestDomainDetails(deriveRootDomain(subdomain), { sdkInstance: this });

        if (rootDomainDetails instanceof Error)
            return transactionError(errors.domain.generic({ domain: rootDomainDetails.name, verbose: rootDomainDetails.message }));
        if (!rootDomainDetails)
            return transactionError(errors.domain.empty({ domain: rootDomainDetails.name }));

        return dispatchSubdomainCreation({
            sdkInstance: this,
            subdomain,
            rootDomainDetails,
            rdt: this.rdt,
            accountAddress,
            callbacks
        });

    }

    /**
     * Delete Subdomain
     * 
     * Deletes a subdomain from a root domain you own.
     * The subdomain's records are also removed.
     * 
     * @category Subdomains
     * @param options - The options object
     * @param options.subdomain - Full subdomain name (e.g., "blog.example.xrd")
     * @param options.accountAddress - Account holding the parent domain
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.deleteSubdomain({
     *   subdomain: 'blog.example.xrd',
     *   accountAddress: 'account_rdx...'
     * });
     * ```
     */
    @requireDependencies('full')
    async deleteSubdomain({ subdomain, accountAddress, callbacks }: { subdomain: string; accountAddress: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const rootDomainDetails = await requestDomainDetails(deriveRootDomain(subdomain), { sdkInstance: this });

        if (rootDomainDetails instanceof Error)
            return transactionError(errors.domain.generic({ domain: rootDomainDetails.name, verbose: rootDomainDetails.message }));
        if (!rootDomainDetails)
            return transactionError(errors.domain.empty({ domain: rootDomainDetails.name }));

        return dispatchSubdomainDeletion({
            sdkInstance: this,
            subdomain,
            rootDomainDetails,
            rdt: this.rdt,
            accountAddress,
            callbacks
        });

    }

    /**
     * Create Record
     * 
     * Creates a single record on a domain. Records use context:directive format
     * (e.g., "social:twitter", "receivers:xrd").
     * 
     * @category Record Management
     * @param options - The options object
     * @param options.domain - Domain or subdomain to create the record on
     * @param options.accountAddress - Account holding the domain
     * @param options.docket - Record data including context, directive, and value
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.createRecord({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...',
     *   docket: {
     *     context: 'social',
     *     directive: 'twitter',
     *     value: '@example'
     *   }
     * });
     * ```
     */
    @requireDependencies('full')
    async createRecord({ domain, accountAddress, docket, callbacks }: { domain: string; accountAddress: string; docket: RecordDocketI; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const domainDetails = await requestDomainEntityDetails(domain, { sdkInstance: this });

        if (domainDetails instanceof Error)
            return transactionError(errors.domain.generic({ domain, verbose: domainDetails.message }));
        if (!domainDetails)
            return transactionError(errors.domain.empty({ domain }));

        return dispatchRecordCreation({
            sdkInstance: this,
            rdt: this.rdt,
            accountAddress,
            domainDetails,
            docket,
            callbacks
        });

    }

    /**
     * Amend Record
     * 
     * Updates an existing record's value. The record must already exist.
     * 
     * @category Record Management
     * @param options - The options object
     * @param options.domain - Domain or subdomain containing the record
     * @param options.accountAddress - Account holding the domain
     * @param options.docket - Record data with updated value
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.amendRecord({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...',
     *   docket: {
     *     context: 'social',
     *     directive: 'twitter',
     *     value: '@newhandle'
     *   }
     * });
     * ```
     */
    @requireDependencies('full')
    async amendRecord({ domain, accountAddress, docket, callbacks }: { domain: string; accountAddress: string; docket: RecordDocketI; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const domainDetails = await requestDomainEntityDetails(domain, { sdkInstance: this });

        if (domainDetails instanceof Error)
            return transactionError(errors.domain.generic({ domain, verbose: domainDetails.message }));
        if (!domainDetails)
            return transactionError(errors.domain.empty({ domain }));

        return dispatchRecordAmendment({
            sdkInstance: this,
            rdt: this.rdt,
            accountAddress,
            domainDetails,
            docket,
            callbacks
        });

    }

    /**
     * Delete Record
     * 
     * Deletes a record by its context and directive.
     * 
     * @category Record Management
     * @param options - The options object
     * @param options.domain - Domain or subdomain containing the record
     * @param options.accountAddress - Account holding the domain
     * @param options.docket - Record identifier with context and directive
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.deleteRecord({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...',
     *   docket: { context: 'social', directive: 'twitter' }
     * });
     * ```
     */
    @requireDependencies('full')
    async deleteRecord({ domain, accountAddress, docket, callbacks }: { domain: string; accountAddress: string; docket: DocketPropsI; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const domainDetails = await requestDomainEntityDetails(domain, { sdkInstance: this });

        if (domainDetails instanceof Error)
            return transactionError(errors.domain.generic({ domain, verbose: domainDetails.message }));
        if (!domainDetails)
            return transactionError(errors.domain.empty({ domain }));

        return dispatchRecordDeletion({
            sdkInstance: this,
            rdt: this.rdt,
            accountAddress,
            domainDetails,
            docket,
            callbacks
        });

    }

    /**
     * Delete Record By ID
     * 
     * Deletes a record using its unique ID instead of context/directive.
     * 
     * @category Record Management
     * @param options - The options object
     * @param options.domain - Domain or subdomain containing the record
     * @param options.accountAddress - Account holding the domain
     * @param options.recordId - Unique record ID
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.deleteRecordById({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...',
     *   recordId: '<record-id>'
     * });
     * ```
     */
    @requireDependencies('full')
    async deleteRecordById({ domain, accountAddress, recordId, callbacks }: { domain: string; accountAddress: string; recordId: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const domainDetails = await requestDomainEntityDetails(domain, { sdkInstance: this });

        if (domainDetails instanceof Error)
            return transactionError(errors.domain.generic({ domain, verbose: domainDetails.message }));
        if (!domainDetails)
            return transactionError(errors.domain.empty({ domain }));

        return dispatchRecordDeletionById({
            sdkInstance: this,
            rdt: this.rdt,
            accountAddress,
            domainDetails,
            recordId,
            callbacks
        });

    }

    /**
     * Create Records (Batch)
     * 
     * Creates multiple records in a single transaction using set_records_batch.
     * More efficient than multiple createRecord calls.
     * 
     * @category Record Management
     * @param options - The options object
     * @param options.domain - Domain or subdomain to set records on
     * @param options.accountAddress - Account address setting the records
     * @param options.records - Array of records to create (context, directive, value)
     * @param options.callbacks - Optional transaction callbacks
     * @returns Transaction response
     * 
     * @example
     * ```typescript
     * const result = await namespace.createRecords({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...',
     *   records: [
     *     { context: 'social', directive: 'twitter', value: '@example' },
     *     { context: 'social', directive: 'github', value: 'example' }
     *   ]
     * });
     * ```
     */
    @requireDependencies('full')
    async createRecords({ domain, accountAddress, records, callbacks }: { domain: string; accountAddress: string; records: RecordEntryI[]; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const domainDetails = await requestDomainEntityDetails(domain, { sdkInstance: this });

        if (domainDetails instanceof Error)
            return transactionError(errors.domain.generic({ domain, verbose: domainDetails.message }));
        if (!domainDetails)
            return transactionError(errors.domain.empty({ domain }));

        return dispatchCreateRecords({
            sdkInstance: this,
            rdt: this.rdt,
            accountAddress,
            domainDetails,
            records,
            callbacks
        });

    }

    /**
     * Delete Records (Batch)
     * 
     * Deletes multiple records in a single transaction using delete_records_batch.
     * More efficient than multiple deleteRecord calls.
     * 
     * @category Record Management
     * @param options - The options object
     * @param options.domain - Domain or subdomain to delete records from
     * @param options.accountAddress - Account address deleting the records
     * @param options.records - Array of record keys to delete (context, directive)
     * @param options.callbacks - Optional transaction callbacks
     * @returns Transaction response
     * 
     * @example
     * ```typescript
     * const result = await namespace.deleteRecords({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...',
     *   records: [
     *     { context: 'social', directive: 'twitter' },
     *     { context: 'social', directive: 'github' }
     *   ]
     * });
     * ```
     */
    @requireDependencies('full')
    async deleteRecords({ domain, accountAddress, records, callbacks }: { domain: string; accountAddress: string; records: RecordRefI[]; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const domainDetails = await requestDomainEntityDetails(domain, { sdkInstance: this });

        if (domainDetails instanceof Error)
            return transactionError(errors.domain.generic({ domain, verbose: domainDetails.message }));
        if (!domainDetails)
            return transactionError(errors.domain.empty({ domain }));

        return dispatchDeleteRecords({
            sdkInstance: this,
            rdt: this.rdt,
            accountAddress,
            domainDetails,
            records,
            callbacks
        });

    }

    /**
     * Delete Context Records
     * 
     * Removes all records within a specific context in a single transaction.
     * Useful for clearing an entire category of records at once.
     * 
     * @category Record Management
     * @param options - The options object
     * @param options.domain - Domain or subdomain to delete context records from
     * @param options.accountAddress - Account address deleting the records
     * @param options.context - Context to delete all records from (e.g., "social", "receivers")
     * @param options.callbacks - Optional transaction callbacks
     * @returns Transaction response
     * 
     * @example
     * ```typescript
     * // Delete ALL social records at once
     * const result = await namespace.deleteContextRecords({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_rdx...',
     *   context: 'social'
     * });
     * ```
     */
    @requireDependencies('full')
    async deleteContextRecords({ domain, accountAddress, context, callbacks }: { domain: string; accountAddress: string; context: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        const domainDetails = await requestDomainEntityDetails(domain, { sdkInstance: this });

        if (domainDetails instanceof Error)
            return transactionError(errors.domain.generic({ domain, verbose: domainDetails.message }));
        if (!domainDetails)
            return transactionError(errors.domain.empty({ domain }));

        return dispatchDeleteContextRecords({
            sdkInstance: this,
            rdt: this.rdt,
            accountAddress,
            domainDetails,
            context,
            callbacks
        });

    }

    /**
     * Transfer Domain
     * 
     * Transfers a domain to another account. Can optionally deactivate
     * and clear records before transfer.
     * 
     * @category Domain Transactions
     * @param options - The options object
     * @param options.domain - Domain name to transfer
     * @param options.fromAddress - Current owner's account address
     * @param options.destinationAddress - New owner's account address
     * @param options.preferences - Optional transfer preferences (deactivate, clear records)
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.transferDomain({
     *   domain: 'example.xrd',
     *   fromAddress: 'account_rdx...',
     *   destinationAddress: 'account_rdx...',
     *   preferences: {
     *     deactivateBeforeTransfer: true,
     *     clearRecords: true
     *   }
     * });
     * ```
     */
    @requireDependencies('full')
    async transferDomain({ domain, fromAddress, destinationAddress, preferences, callbacks }: { domain: string; fromAddress: string; destinationAddress: string; preferences?: TransferPreferencesI; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchDomainTransfer({
            sdkInstance: this,
            rdt: this.rdt,
            domain,
            fromAddress,
            destinationAddress,
            preferences,
            callbacks
        });

    }

    /**
     * Unbond Domain
     * 
     * Unbonds a domain and withdraws the bonded USD stable value back to your account.
     * The domain NFT is deposited into the RNS Core component.
     * 
     * You can choose whether to preserve or destroy the domain's subregistry data
     * (records and subdomains) during unbonding.
     * 
     * @category Domain Transactions
     * @param options - The options object
     * @param options.domain - Domain name to unbond (e.g., "example.xrd")
     * @param options.accountAddress - Account holding the domain
     * @param options.preserveSubregistryData - Whether to preserve subregistry data (default: false)
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * // Unbond and clear all data
     * const result = await namespace.unbondDomain({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_...'
     * });
     * 
     * // Unbond but preserve records/subdomains
     * const result = await namespace.unbondDomain({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_...',
     *   preserveSubregistryData: true
     * });
     * ```
     */
    @requireDependencies('full')
    async unbondDomain({ domain, accountAddress, preserveSubregistryData, callbacks }: { domain: string; accountAddress: string; preserveSubregistryData?: boolean; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchDomainUnbond({
            sdkInstance: this,
            rdt: this.rdt,
            domain,
            accountAddress,
            preserveSubregistryData,
            callbacks
        });

    }

    /**
     * Rebond Domain
     * 
     * Rebonds a domain with a different accepted payment resource without losing the domain.
     * Returns the old bond and any change from the new payment.
     * 
     * This allows users to swap their bond resource (e.g., from fUSD to sUSD)
     * while keeping their domain registered.
     * 
     * **How it works:**
     * - Proves ownership of the domain NFT
     * - Withdraws the new payment resource from your account
     * - Calls rebond on RNS Core with proof and new payment
     * - Returns the old bond to your account
     * - Returns any excess payment as change
     * 
     * @category Domain Transactions
     * @param options - The options object
     * @param options.domain - Domain name to rebond (e.g., "example.xrd")
     * @param options.accountAddress - Account holding the domain
     * @param options.newPaymentResource - New payment resource address to bond with (must be accepted)
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * // Rebond a domain with a different stablecoin
     * const result = await namespace.rebondDomain({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_...',
     *   newPaymentResource: 'resource_new_stablecoin...'
     * });
     * 
     * if (result.feedback) {
     *   console.log('Rebond successful:', result.feedback.messages[0].details);
     *   // Old bond returned to account, domain now bonded with new resource
     * }
     * ```
     */
    @requireDependencies('full')
    async rebondDomain({ domain, accountAddress, newPaymentResource, callbacks }: { domain: string; accountAddress: string; newPaymentResource: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchDomainRebond({
            sdkInstance: this,
            rdt: this.rdt,
            domain,
            accountAddress,
            newPaymentResource,
            callbacks
        });

    }

    /**
     * Import Accepted Domain
     * 
     * Imports an accepted domain into the Radix Namespace system. The import domain NFT
     * stays in the user's account (only a proof is presented), and a new domain NFT is
     * issued with a dedicated subregistry component.
     * 
     * **Key differences from regular registration:**
     * - No registrar required (no registrar fees)
     * - Uses existing import domain NFT proof as input
     * - Import domain NFT stays in user's account
     * - Payment covers only the bond amount (refundable on unbond)
     * 
     * @category Domain Transactions
     * @param options - The options object
     * @param options.domain - Domain name to import (e.g., "example.xrd")
     * @param options.accountAddress - Account holding the import domain
     * @param options.paymentResource - Optional payment resource (defaults to first accepted)
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * // Import an accepted domain (uses default payment resource)
     * const result = await namespace.importAcceptedDomain({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_...'
     * });
     * 
     * // Import with specific payment resource
     * const result = await namespace.importAcceptedDomain({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_...',
     *   paymentResource: 'resource_...'
     * });
     * ```
     */
    @requireDependencies('full')
    async importAcceptedDomain({ domain, accountAddress, paymentResource, callbacks }: { domain: string; accountAddress: string; paymentResource?: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchImportDomain({
            sdkInstance: this,
            rdt: this.rdt,
            domain,
            accountAddress,
            paymentResource,
            callbacks
        });

    }

    // ===== Subregistry Management Methods =====

    /**
     * Update Subregistry Icon
     * 
     * Updates the icon_url metadata on the domain's DomainSubregistry component.
     * This allows domain owners to customize the icon displayed for their subregistry.
     * 
     * @category Subregistry Management
     * @param options - The options object
     * @param options.domain - Domain name (e.g., "example.xrd")
     * @param options.iconUrl - New icon URL
     * @param options.accountAddress - Account holding the domain
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.updateSubregistryIcon({
     *   domain: 'example.xrd',
     *   iconUrl: 'https://example.com/icon.png',
     *   accountAddress: 'account_...'
     * });
     * ```
     */
    @requireDependencies('full')
    async updateSubregistryIcon({ domain, iconUrl, accountAddress, callbacks }: { domain: string; iconUrl: string; accountAddress: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchUpdateSubregistryIcon({
            sdkInstance: this,
            rdt: this.rdt,
            domain,
            iconUrl,
            accountAddress,
            callbacks
        });

    }

    /**
     * Update Subregistry Dapp Definition
     * 
     * Updates the dapp_definition metadata on the domain's DomainSubregistry component.
     * This allows domain owners to link their subregistry to a dApp definition account.
     * 
     * @category Subregistry Management
     * @param options - The options object
     * @param options.domain - Domain name (e.g., "example.xrd")
     * @param options.dappDefinitionAddress - New dApp definition address
     * @param options.accountAddress - Account holding the domain
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.updateSubregistryDappDefinition({
     *   domain: 'example.xrd',
     *   dappDefinitionAddress: 'account_dapp_def...',
     *   accountAddress: 'account_...'
     * });
     * ```
     */
    @requireDependencies('full')
    async updateSubregistryDappDefinition({ domain, dappDefinitionAddress, accountAddress, callbacks }: { domain: string; dappDefinitionAddress: string; accountAddress: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchUpdateSubregistryDappDefinition({
            sdkInstance: this,
            rdt: this.rdt,
            domain,
            dappDefinitionAddress,
            accountAddress,
            callbacks
        });

    }

    /**
     * Update Domain Resource
     * 
     * Updates the domain resource address on the domain's DomainSubregistry component.
     * This is used when the subregistry needs to recognize a new domain NFT resource
     * (e.g., after importing a domain from an accepted resource).
     * 
     * **Warning:** This is an advanced operation. Only use if you understand the implications
     * of changing the domain resource address on a subregistry.
     * 
     * @category Subregistry Management
     * @param options - The options object
     * @param options.domain - Domain name (e.g., "example.xrd")
     * @param options.newDomainResourceAddress - New domain resource address
     * @param options.accountAddress - Account holding the domain
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.updateDomainResource({
     *   domain: 'example.xrd',
     *   newDomainResourceAddress: 'resource_...',
     *   accountAddress: 'account_...'
     * });
     * ```
     */
    @requireDependencies('full')
    async updateDomainResource({ domain, newDomainResourceAddress, accountAddress, callbacks }: { domain: string; newDomainResourceAddress: string; accountAddress: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchUpdateDomainResource({
            sdkInstance: this,
            rdt: this.rdt,
            domain,
            newDomainResourceAddress,
            accountAddress,
            callbacks
        });

    }

    /**
     * Replace Subregistry
     * 
     * Spawns a new empty subregistry for the domain, replacing the current one.
     * The old subregistry is orphaned (no longer referenced by the domain NFT).
     * All existing records and subdomains in the old subregistry become inaccessible.
     * 
     * **Security:** The old subregistry remains locked to the original domain name -
     * other domains cannot attach to or interact with it.
     * 
     * **Warning:** This is irreversible. All existing records and subdomains will be lost.
     * 
     * @category Subregistry Management
     * @param options - The options object
     * @param options.domain - Domain name (e.g., "example.xrd")
     * @param options.accountAddress - Account holding the domain
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.replaceSubregistry({
     *   domain: 'example.xrd',
     *   accountAddress: 'account_...'
     * });
     * ```
     */
    @requireDependencies('full')
    async replaceSubregistry({ domain, accountAddress, callbacks }: { domain: string; accountAddress: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchReplaceSubregistry({
            sdkInstance: this,
            rdt: this.rdt,
            domain,
            accountAddress,
            callbacks
        });

    }

    /**
     * Update Account Settings
     * 
     * Unified method for managing account RNS settings:
     * - Set or change primary domain
     * - Toggle discovery settings
     * 
     * **Privacy-first:** Discovery defaults to `false` when setting a primary domain.
     * Users must explicitly opt-in to be discoverable via reverse resolution.
     * 
     * @category Account Settings
     * @param options - The options object
     * @param options.accountAddress - Account to update settings for
     * @param options.primaryDomain - Domain to set as primary (root or subdomain). Creates/updates config badge.
     * @param options.enableDiscovery - Whether to enable discovery. Defaults to false when setting primaryDomain.
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * // Set primary domain (discovery disabled by default - privacy first)
     * const result = await namespace.updateAccountSettings({
     *   accountAddress: 'account_...',
     *   primaryDomain: 'example.xrd'
     * });
     * 
     * // Set primary domain AND enable discovery (opt-in)
     * const result = await namespace.updateAccountSettings({
     *   accountAddress: 'account_...',
     *   primaryDomain: 'example.xrd',
     *   enableDiscovery: true
     * });
     * 
     * // Set a subdomain as primary
     * const result = await namespace.updateAccountSettings({
     *   accountAddress: 'account_...',
     *   primaryDomain: 'blog.example.xrd'
     * });
     * 
     * // Toggle discovery only (requires existing config badge)
     * const result = await namespace.updateAccountSettings({
     *   accountAddress: 'account_...',
     *   enableDiscovery: true
     * });
     * ```
     */
    @requireDependencies('full')
    async updateAccountSettings({ accountAddress, primaryDomain, enableDiscovery, callbacks }: { accountAddress: string; primaryDomain?: string; enableDiscovery?: boolean; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchUpdateAccountSettings({
            sdkInstance: this,
            rdt: this.rdt,
            accountAddress,
            primaryDomain,
            enableDiscovery,
            callbacks
        });

    }

    /**
     * Resolve Account Domain (Reverse Resolution)
     * 
     * Performs reverse resolution to find the primary domain for an account address.
     * **This method respects the discovery flag** - it will only return the domain if
     * discovery is enabled by the account owner.
     * 
     * Use this for third-party lookups where you want to respect user privacy settings.
     * Use `getAccountSettings` if you need to see all config data regardless of
     * discovery settings (e.g., for the account owner's own UI).
     * 
     * @category Account Settings
     * @param options - The options object
     * @param options.accountAddress - Account address to resolve
     * @returns Domain name if found and discovery enabled, null otherwise
     * 
     * @example
     * ```typescript
     * const domain = await namespace.resolveAccountDomain({
     *   accountAddress: 'account_...'
     * });
     * 
     * if (domain.data) {
     *   console.log(`This account goes by: ${domain.data}`);
     * } else {
     *   console.log('No discoverable domain for this account');
     * }
     * ```
     */
    @requireDependencies('read-only')
    async resolveAccountDomain({ accountAddress }: { accountAddress: string }): Promise<SdkResponseT<string | null>> {

        // Reuse getAccountSettings to avoid duplicating account lookup logic
        const settings = await this.getAccountSettings({ accountAddress });

        // Pass through any errors from getAccountSettings
        if (settings.errors)
            return settings as SdkResponseT<string | null>;

        // No settings configured for this account
        if (!settings.data)
            return retrievalResponse(null);

        // Check if discovery is enabled - respect user privacy
        if (!settings.data.discoveryEnabled)
            return retrievalResponse(null);

        // Check if the domain is still authentic (owned by the account)
        if (!settings.data.isAuthentic)
            return retrievalResponse(null);

        return retrievalResponse(settings.data.primaryDomain);

    }

    /**
     * Register as a Registrar (Domain Service Provider)
     * 
     * Registers your service as a domain registrar, allowing you to collect fees
     * from domain registrations. Returns a unique registrar badge NFT for authentication.
     * 
     * Fee calculation: Fees are calculated as a percentage of the domain's base price
     * (e.g., 10% of a 4 USD domain = 0.4 USD fee). No upper limit on percentages.
     * 
     * @category Registrar System
     * @param options - The options object
     * @param options.name - Business or service name (1-100 characters)
     * @param options.iconUrl - Public URL to your registrar logo/icon
     * @param options.websiteUrl - Public URL to your registrar's website
     * @param options.feePercentage - Fee percentage (1 = 1%, 0.5 = 0.5%, 200 = 200%)
     * @param options.accountAddress - Account to receive the registrar badge
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.registerAsRegistrar({
     *   name: 'My Domain Service',
     *   iconUrl: 'https://radixnameservice.com/logo.png',
     *   websiteUrl: 'https://radixnameservice.com',
     *   feePercentage: new Decimal(2.5), // 2.5% fee
     *   accountAddress: 'account_...'
     * });
     * ```
     */
    @requireDependencies('full')
    async registerAsRegistrar({ name, iconUrl, websiteUrl, feePercentage, accountAddress, callbacks }: { name: string; iconUrl: string; websiteUrl: string; feePercentage: Decimal; accountAddress: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchRegistrarRegistration({
            sdkInstance: this,
            name,
            iconUrl,
            websiteUrl,
            feePercentage,
            accountAddress,
            rdt: this.rdt,
            callbacks
        });

    }

    /**
     * Update Registrar Metadata
     * 
     * Updates business information for your registrar service.
     * All fields are optional - only provided fields will be updated.
     * Requires proof of registrar badge ownership.
     * 
     * @category Registrar System
     * @param options - The options object
     * @param options.registrarId - Your registrar badge ID
     * @param options.accountAddress - Account holding the registrar badge
     * @param options.name - Optional new business name (1-100 characters)
     * @param options.iconUrl - Optional new icon URL
     * @param options.websiteUrl - Optional new website URL
     * @param options.feePercentage - Optional new fee percentage (>= 0)
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * const result = await namespace.updateRegistrar({
     *   registrarId: '1',  // SDK handles formatting automatically
     *   accountAddress: 'account_...',
     *   feePercentage: new Decimal(3), // Update only fee to 3%
     * });
     * ```
     */
    @requireDependencies('full')
    async updateRegistrar({ registrarId, accountAddress, name, iconUrl, websiteUrl, feePercentage, callbacks }: { registrarId: string; accountAddress: string; name?: string; iconUrl?: string; websiteUrl?: string; feePercentage?: Decimal; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchRegistrarUpdate({
            sdkInstance: this,
            registrarId,
            accountAddress,
            name,
            iconUrl,
            websiteUrl,
            feePercentage,
            rdt: this.rdt,
            callbacks
        });

    }

    /**
     * Burn Registrar Badge 
     * Note: Any unwithdrawn fees will be locked in the contract forever.
     * 
     * **Before burning**: Withdraw all accumulated fees using `withdrawRegistrarFees()`.
     * 
     * @category Registrar System
     * @param options - The options object
     * @param options.registrarId - Your registrar badge ID to burn
     * @param options.accountAddress - Account holding the registrar badge
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * // 1. First withdraw all fees
     * await namespace.withdrawRegistrarFees({ registrarId, resourceAddress, accountAddress });
     * 
     * // 2. Then burn the badge (irreversible!)
     * const result = await namespace.burnRegistrarBadge({
     *   registrarId: '1',  // SDK handles formatting automatically
     *   accountAddress: 'account_...'
     * });
     * ```
     */
    @requireDependencies('full')
    async burnRegistrarBadge({ registrarId, accountAddress, callbacks }: { registrarId: string; accountAddress: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchRegistrarBurn({
            sdkInstance: this,
            registrarId,
            accountAddress,
            rdt: this.rdt,
            callbacks
        });

    }

    /**
     * Get All Registrars
     * 
     * Retrieves registered domain service providers (registrars) in the RNS system.
     * Returns paginated registrar badge IDs.
     * Use `getRegistrarDetails()` to fetch full metadata for a specific registrar.
     * 
     * @category Registrar System
     * @param options - The options object
     * @param options.pagination - Optional pagination parameters
     * @returns Paginated registrar badge IDs
     * 
     * @example
     * ```typescript
     * const result = await namespace.getAllRegistrars();
     * if (result.data) {
     *   console.log(`Found ${result.data.pagination.total_count} registrars`);
     *   result.data.registrar_ids.forEach(badgeId => console.log(badgeId));
     * }
     * ```
     */
    @requireDependencies('read-only')
    async getAllRegistrars({ pagination }: { pagination?: PaginationParamsI } = {}): Promise<SdkResponseT<PaginatedRegistrarsResponseI>> {

        const result = await requestAllRegistrars({ sdkInstance: this }, pagination);

        if (result instanceof Error)
            return retrievalError({
                code: 'GATEWAY_ERROR',
                error: 'Failed to fetch registrars',
                verbose: result.message
            });

        return retrievalResponse(result);

    }

    /**
     * Get Registrar Details
     * 
     * Retrieves full metadata for a specific registrar including name, URLs, and fee percentage.
     * 
     * @category Registrar System
     * @param options - The options object
     * @param options.registrarId - The registrar badge ID
     * @returns Registrar metadata including name, iconUrl, websiteUrl, and feePercentage
     * 
     * @example
     * ```typescript
     * const result = await namespace.getRegistrarDetails({ 
     *   registrarId: '1'  // SDK handles formatting automatically
     * });
     * if (result.data) {
     *   console.log(`Registrar: ${result.data.name}`);
     *   console.log(`Fee: ${result.data.feePercentage}%`);
     * }
     * ```
     */
    @requireDependencies('read-only')
    async getRegistrarDetails({ registrarId }: { registrarId: string }): Promise<SdkResponseT<RegistrarDetailsI>> {

        const details = await requestRegistrarDetails({
            registrarId,
            sdkInstance: this
        });

        if (details instanceof Error)
            return retrievalError({
                code: details.message.includes('not found') ? 'NOT_FOUND' : 'GATEWAY_ERROR',
                error: 'Failed to fetch registrar details',
                verbose: `Registrar ID: ${registrarId}. ${details.message}`
            });

        return retrievalResponse(details);

    }

    /**
     * Get Registrar Stats
     * 
     * Retrieves detailed performance statistics for a specific registrar, including
     * domain registration counts and fee accumulation data.
     * 
     * Statistics include:
     * - **domains_bonded**: Current active domains per payment resource
     * - **domains_bonded_cumulative**: Lifetime total domains registered
     * - **fees_earned_cumulative**: Lifetime total fees earned per resource
     * - **fees_earned_current**: Current available fees to withdraw
     * - **last_withdrawal**: Timestamp of last fee withdrawal
     * 
     * @category Registrar System
     * @param options - The options object
     * @param options.registrarId - The registrar badge ID (raw or formatted)
     * @returns Registrar statistics or null if registrar not found
     * 
     * @example
     * ```typescript
     * const result = await namespace.getRegistrarStats({ registrarId: '1' });
     * if (result.data) {
     *   console.log(`Total domains registered: ${result.data.domains_bonded_cumulative}`);
     *   console.log(`Current fees available:`, result.data.fees_earned_current);
     * } else if (result.data === null) {
     *   console.log('Registrar not found');
     * }
     * ```
     */
    @requireDependencies('read-only')
    async getRegistrarStats({ registrarId }: { registrarId: string }): Promise<SdkResponseT<RegistrarStatsI | null>> {

        const stats = await requestRegistrarStats({
            registrarId,
            sdkInstance: this
        });

        if (stats instanceof Error)
            return retrievalError({
                code: 'GATEWAY_ERROR',
                error: 'Failed to fetch registrar stats',
                verbose: `Registrar ID: ${registrarId}. ${stats.message}`
            });

        return retrievalResponse(stats);

    }

    /**
     * Get Registrar Fee Balances
     * 
     * Retrieves accumulated fee balances for a specific registrar across all payment resources.
     * Fees are collected when domains are registered through this registrar.
     * 
     * Use `withdrawRegistrarFees()` to withdraw accumulated fees.
     * 
     * @category Registrar System
     * @param options - The options object
     * @param options.registrarId - The registrar badge ID
     * @param options.pagination - Optional pagination parameters
     * @returns Paginated fee vault entries with resource details and amounts
     * 
     * @example
     * ```typescript
     * const result = await namespace.getRegistrarFeeBalances({ 
     *   registrarId: '1'  // SDK handles formatting automatically
     * });
     * if (result.data) {
     *   console.log(`Total fee entries: ${result.data.pagination.total_count}`);
     *   result.data.fees.forEach(fee => {
     *     console.log(`${fee.resource.symbol}: ${fee.amount}`);
     *   });
     * }
     * ```
     */
    @requireDependencies('read-only')
    async getRegistrarFeeBalances({ registrarId, pagination }: { registrarId: string; pagination?: PaginationParamsI }): Promise<SdkResponseT<PaginatedRegistrarFeesI>> {

        const feeBalances = await requestRegistrarFeeBalances(registrarId, { sdkInstance: this }, pagination);

        if (feeBalances instanceof Error)
            return retrievalError(errors.registrar.feeBalances({ registrarId, verbose: feeBalances.message }));

        return retrievalResponse(feeBalances);

    }

    /**
     * Withdraw Registrar Fees
     * 
     * Withdraws accumulated fees for a registrar. By default, auto-discovers and
     * withdraws from ALL fee vaults in a single transaction. Optionally specify
     * a single resource to withdraw from.
     * 
     * Requires proof of registrar badge ownership.
     * 
     * @category Registrar System
     * @param options - The options object
     * @param options.registrarId - Your registrar badge ID
     * @param options.accountAddress - Account holding the registrar badge
     * @param options.resourceAddress - Optional: specific resource to withdraw (default: all)
     * @param options.callbacks - Optional transaction event callbacks
     * @returns Transaction response with success/error details
     * 
     * @example
     * ```typescript
     * // Withdraw ALL accumulated fees (recommended)
     * const result = await namespace.withdrawRegistrarFees({
     *   registrarId: '1',
     *   accountAddress: 'account_...'
     * });
     * 
     * // Or withdraw from a specific resource only
     * const result = await namespace.withdrawRegistrarFees({
     *   registrarId: '1',
     *   accountAddress: 'account_...',
     *   resourceAddress: 'resource_rdx1t4te4...' // fUSD address
     * });
     * 
     * if (result.feedback) {
     *   console.log('Fees withdrawn successfully!');
     * }
     * ```
     */
    @requireDependencies('full')
    async withdrawRegistrarFees({ registrarId, accountAddress, resourceAddress, callbacks }: { registrarId: string; accountAddress: string; resourceAddress?: string; callbacks?: EventCallbacksI }): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

        return dispatchRegistrarWithdrawFees({
            sdkInstance: this,
            registrarId,
            resourceAddress,
            accountAddress,
            rdt: this.rdt,
            callbacks
        });

    }

    public utils = {

        validateDomain({ domain }: { domain: string }): UtilValidationT {
            return validateDomain(domain);
        },

        validateSubdomain({ subdomain }: { subdomain: string }): UtilValidationT {
            return validateSubdomain(subdomain);
        },

        validateAccountAddress: ({ accountAddress }: { accountAddress: string }): UtilValidationT => {
            return validateAccountAddress(accountAddress, { network: this.network });
        },

        getRootFromSubdomain({ subdomain }: { subdomain: string }): string | null {
            return deriveRootDomain(subdomain);
        },

        isSubdomain(domainEntity: string): boolean {
            const result = deriveDomainType(domainEntity);
            return result.isValid && result.type === "sub";
        },

        isRootDomain(domainEntity: string): boolean {
            const result = deriveDomainType(domainEntity);
            return result.isValid && result.type === "root";
        },

        /**
         * Get Registration Cost Breakdown
         * 
         * Calculates and returns a detailed breakdown of all costs for domain registration.
         * Use this to show users the exact costs before they commit to registration.
         * 
         * @param options - The options object
         * @param options.domain - Domain name to register (e.g., "example.xrd")
         * @param options.registrarId - Registrar badge ID to use for registration
         * @param options.paymentResource - Optional payment resource address (defaults to first accepted resource)
         * @returns Cost breakdown including bond amount, registrar fee, and total
         * 
         * @example
         * ```typescript
         * const result = await namespace.utils.getCostBreakdown({
         *   domain: 'example.xrd',
         *   registrarId: '1'  // SDK handles formatting automatically
         * });
         * if (result.data) {
         *   console.log(`Bond: ${result.data.bondAmount}`);
         *   console.log(`Registrar Fee (${result.data.registrarFeePercentage}%): ${result.data.registrarFee}`);
         *   console.log(`Total: ${result.data.totalAmount}`);
         * }
         * ```
         */
        getCostBreakdown: async ({ domain, registrarId, paymentResource }: { domain: string; registrarId: string; paymentResource?: string }): Promise<SdkResponseT<RegistrationCostBreakdownI>> => {

            this.checkEntitiesLoaded();

            // Fetch registrar details to get fee percentage
            const registrarDetails = await requestRegistrarDetails({
                registrarId,
                sdkInstance: this
            });

            if (registrarDetails instanceof Error) {
                return retrievalError(errors.registration.generic({ 
                    domain, 
                    verbose: `Failed to fetch registrar details: ${registrarDetails.message}` 
                }));
            }

            // Use provided payment resource or default to first accepted resource
            const selectedPaymentResource = paymentResource || this.entities.rnsCore.acceptedPaymentResources[0];

            if (!selectedPaymentResource) {
                return retrievalError(errors.registration.generic({ 
                    domain, 
                    verbose: "No accepted payment resources configured in Radix Namespace" 
                }));
            }

            const costBreakdown = getCostBreakdown(
                domain,
                this.entities.rnsCore.priceLadder,
                registrarDetails.fee_percentage,
                registrarId,
                registrarDetails.name,
                selectedPaymentResource
            );

            return retrievalResponse(costBreakdown);

        },

        /**
         * Get Accepted Bond Tokens
         * 
         * Returns the list of accepted payment resources for domain registration bonds,
         * with full resource details following Radix metadata standards.
         * 
         * Results are cached permanently after the first call since accepted
         * payment resources are static once an RNS Core component is instantiated.
         * 
         * @returns Array of accepted bond tokens with full resource details
         * 
         * @example
         * ```typescript
         * const tokens = await namespace.utils.getAcceptedBondTokens();
         * console.log('Accepted tokens:', tokens.data);
         * // [{
         * //   address: 'resource_rdx...',
         * //   type: 'fungible',
         * //   name: 'Fake USD',
         * //   symbol: 'fUSD',
         * //   description: '...',
         * //   tags: [],
         * //   icon_url: 'https://...',
         * //   info_url: 'https://...'
         * // }, ...]
         * ```
         */
        getAcceptedBondTokens: async (): Promise<SdkResponseT<ResourceDetailsI[]>> => {

            this.checkEntitiesLoaded();

            const acceptedResources = this.entities.rnsCore.acceptedPaymentResources;

            if (!acceptedResources || acceptedResources.length === 0) {
                return retrievalResponse([]);
            }

            const tokens = await getAcceptedBondTokensWithMetadata(
                acceptedResources,
                { sdkInstance: this }
            );

            return retrievalResponse(tokens);

        },

        /**
         * Get Account Bond Balances
         * 
         * Returns the current balance for all accepted payment resources.
         * Use this to show users what tokens they have available for payment.
         * 
         * @param options - The options object
         * @param options.accountAddress - The account address to check
         * @returns Account bond balances with resource details
         * 
         * @example
         * ```typescript
         * const balances = await namespace.utils.getAccountBondBalances({
         *   accountAddress: 'account_rdx...'
         * });
         * 
         * balances.data.balances.forEach(r => {
         *   console.log(`${r.resourceName} (${r.resourceSymbol}): ${r.balance}`);
         * });
         * ```
         */
        getAccountBondBalances: async ({ accountAddress }: { 
            accountAddress: string;
        }): Promise<SdkResponseT<AccountBondBalancesResultI>> => {

            this.checkEntitiesLoaded();

            const acceptedResources = this.entities.rnsCore.acceptedPaymentResources;

            if (!acceptedResources || acceptedResources.length === 0) {
                return retrievalError(errors.balance.noAcceptedResources({ 
                    verbose: 'No accepted payment resources configured in Radix Namespace' 
                }));
            }

            const result = await getAccountBondBalances(
                accountAddress,
                acceptedResources,
                { sdkInstance: this }
            );

            return retrievalResponse(result);

        },

        /**
         * Check Account Bond Affordability
         * 
         * Compares account balances against a required amount to determine
         * which tokens have sufficient balance and which don't.
         * 
         * @param options - The options object
         * @param options.accountAddress - The account address to check
         * @param options.requiredAmount - The total amount required (from getCostBreakdown)
         * @returns Affordability check with sufficient/insufficient arrays
         * 
         * @example
         * ```typescript
         * // First get the cost breakdown
         * const costs = await namespace.utils.getCostBreakdown({
         *   domain: 'example.xrd',
         *   registrarId: '1'
         * });
         * 
         * // Check affordability
         * const check = await namespace.utils.checkAccountBondAffordability({
         *   accountAddress: 'account_rdx...',
         *   requiredAmount: costs.data.totalAmount
         * });
         * 
         * if (check.data.sufficientBalances.length > 0) {
         *   console.log('Can pay with:', check.data.sufficientBalances);
         * } else {
         *   console.log('Insufficient funds in all tokens');
         *   check.data.insufficientBalances.forEach(r => {
         *     console.log(`${r.resourceName}: have ${r.balance}, short by ${r.shortfall}`);
         *   });
         * }
         * ```
         */
        checkAccountBondAffordability: async ({ accountAddress, requiredAmount }: { 
            accountAddress: string; 
            requiredAmount: string 
        }): Promise<SdkResponseT<BondAffordabilityResultI>> => {

            this.checkEntitiesLoaded();

            const acceptedResources = this.entities.rnsCore.acceptedPaymentResources;

            if (!acceptedResources || acceptedResources.length === 0) {
                return retrievalError(errors.balance.noAcceptedResources({ 
                    verbose: 'No accepted payment resources configured in Radix Namespace' 
                }));
            }

            // Get balances first
            const balancesResult = await getAccountBondBalances(
                accountAddress,
                acceptedResources,
                { sdkInstance: this }
            );

            // Check affordability
            const result = checkAccountBondAffordability(balancesResult.balances, requiredAmount);

            return retrievalResponse(result);

        }

    };

}