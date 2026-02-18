import {
    NonFungibleResourcesCollectionItemVaultAggregatedVaultItem,
    ProgrammaticScryptoSborValueTuple,
    ProgrammaticScryptoSborValue,
    ProgrammaticScryptoSborValueNonFungibleLocalId,
    ProgrammaticScryptoSborValueReference,
    ProgrammaticScryptoSborValueU32,
    ProgrammaticScryptoSborValueMap,
    ProgrammaticScryptoSborValueMapEntry,
    StateEntityDetailsVaultResponseItem,
    StateNonFungibleDetailsResponseItem,
    StateKeyValueStoreKeysResponseItem
} from "@radixdlt/babylon-gateway-api-sdk";

import {
    deriveDomainType,
    deriveRootDomain
} from "../../utils/domain.utils";

import {
    isTupleValue,
    findFieldByName,
    getFieldU32Value,
    getFieldStringValue
} from "../../utils/gateway.utils";

import {
    logger
} from "../../utils/log.utils";

import {
    convertToDecimal
} from "../../utils/decimal.utils";

import {
    requestResourceDetails
} from "../resource/details";

import {
    DomainDataI,
    SubDomainDataI,
    PaginatedDomainsResponseI,
    PaginatedSubdomainsResponseI
} from "../../common/domain.types";

import {
    PaginationParamsI,
    PaginationInfoI
} from "../../common/pagination.types";

import {
    InstancePropsI
} from "../../common/entities.types";


/**
 * Filters user's domain NFT vault from account NFT aggregation
 */
function filterUserDomainVault(
    accountNfts: StateEntityDetailsVaultResponseItem,
    domainResourceAddr: string
): NonFungibleResourcesCollectionItemVaultAggregatedVaultItem {
    return accountNfts.non_fungible_resources.items.find(
        (nft) => nft.resource_address === domainResourceAddr
    )?.vaults.items[0];
}

/**
 * Fetches root domain NFT IDs from user's account with pagination support
 */
async function fetchRootDomainIds(
    accountAddress: string,
    accountNfts: StateEntityDetailsVaultResponseItem,
    { sdkInstance }: InstancePropsI,
    pagination?: PaginationParamsI,
): Promise<{ domainIds: string[], totalCount: number, nextCursor: number | null, previousCursor: number | null }> {

    const accountDomainVault = filterUserDomainVault(accountNfts, sdkInstance.entities.rnsCore.domainResource);

    if (!accountDomainVault?.items) return { domainIds: [], totalCount: 0, nextCursor: null, previousCursor: null };

    const { vault_address: userDomainVaultAddr } = accountDomainVault;
    const currentPage = pagination?.page || 1;

    if (currentPage === 1) {
        const totalCount = await getTotalDomainCount(accountAddress, userDomainVaultAddr, accountDomainVault, { sdkInstance });

        return {
            domainIds: accountDomainVault.items,
            totalCount,
            nextCursor: accountDomainVault.next_cursor ? 2 : null,
            previousCursor: null
        };
    }

    let currentCursor = accountDomainVault.next_cursor;
    let pageNumber = 2;

    while (currentCursor && pageNumber < currentPage) {
        try {
            const ledgerStateVersion = (await sdkInstance.status.getCurrent()).ledger_state.state_version;
            const response = await sdkInstance.state.innerClient.entityNonFungibleIdsPage({
                stateEntityNonFungibleIdsPageRequest: {
                    address: accountAddress,
                    resource_address: sdkInstance.entities.rnsCore.domainResource,
                    vault_address: userDomainVaultAddr,
                    cursor: currentCursor,
                    at_ledger_state: { state_version: ledgerStateVersion }
                }
            });

            currentCursor = response.next_cursor || null;
            pageNumber++;
        } catch (error) {
            logger.error("fetchRootDomainIds", error);
            break;
        }
    }

    if (currentCursor && pageNumber === currentPage) {
        try {
            const ledgerStateVersion = (await sdkInstance.status.getCurrent()).ledger_state.state_version;
            const response = await sdkInstance.state.innerClient.entityNonFungibleIdsPage({
                stateEntityNonFungibleIdsPageRequest: {
                    address: accountAddress,
                    resource_address: sdkInstance.entities.rnsCore.domainResource,
                    vault_address: userDomainVaultAddr,
                    cursor: currentCursor,
                    at_ledger_state: { state_version: ledgerStateVersion }
                }
            });

            return {
                domainIds: response.items || [],
                totalCount: null,
                nextCursor: response.next_cursor ? currentPage + 1 : null,
                previousCursor: currentPage > 1 ? currentPage - 1 : null
            };
        } catch (error) {
            logger.error("fetchRootDomainIds", error);
        }
    }

    return {
        domainIds: [],
        totalCount: null,
        nextCursor: null,
        previousCursor: currentPage > 1 ? currentPage - 1 : null
    };
}

/**
 * Gets total count of domains in user's vault
 */
async function getTotalDomainCount(
    accountAddress: string,
    userDomainVaultAddr: string,
    initialVault: NonFungibleResourcesCollectionItemVaultAggregatedVaultItem,
    { sdkInstance }: InstancePropsI
): Promise<number> {
    try {
        let totalCount = initialVault.items?.length || 0;
        let currentCursor = initialVault.next_cursor;

        while (currentCursor) {
            const ledgerStateVersion = (await sdkInstance.status.getCurrent()).ledger_state.state_version;

            const response = await sdkInstance.state.innerClient.entityNonFungibleIdsPage({
                stateEntityNonFungibleIdsPageRequest: {
                    address: accountAddress,
                    resource_address: sdkInstance.entities.rnsCore.domainResource,
                    vault_address: userDomainVaultAddr,
                    cursor: currentCursor,
                    at_ledger_state: { state_version: ledgerStateVersion }
                }
            });

            totalCount += response.items?.length || 0;
            currentCursor = response.next_cursor || null;
        }

        return totalCount;
    } catch (error) {
        logger.error("getTotalDomainCount", error);
        return initialVault.items?.length || 0;
    }
}

/**
 * Formats domain NFT data into DomainDataI structure (with resource enrichment)
 */
async function formatDomainList(
    domains: StateNonFungibleDetailsResponseItem[],
    { sdkInstance }: InstancePropsI
): Promise<DomainDataI[]> {
    const parsedDomains = domains
        .filter(r => r.data?.programmatic_json.kind === 'Tuple')
        .map(r => {
            if (r.data?.programmatic_json.kind === 'Tuple') {
                const domainData = (r.data.programmatic_json as ProgrammaticScryptoSborValueTuple).fields.reduce((acc, field) => {
                    // String fields: name, key_image_url
                    if (field.kind === 'String' && field.field_name) {
                        return { ...acc, [field.field_name]: field.value };
                    }

                    // Decimal fields: bond_amount (store temporarily with _ prefix)
                    if (field.kind === 'Decimal' && field.field_name === 'bond_amount') {
                        return { ...acc, _bond_amount: field.value };
                    }

                    // Resource address: bond_resource (store temporarily with _ prefix)
                    if (field.kind === 'Reference' && field.field_name === 'bond_resource') {
                        return { ...acc, _bond_resource: field.value };
                    }

                    // Component address: subregistry_component_address
                    if (field.kind === 'Reference' && field.field_name === 'subregistry_component_address') {
                        return { ...acc, subregistry_component_address: field.value };
                    }

                    // Timestamp: created_timestamp (I64 in seconds, convert to ms)
                    if (field.field_name === 'created_timestamp' && field.kind === 'I64') {
                        return { ...acc, created_timestamp: parseInt(field.value) * 1000 };
                    }

                    // Option<ComponentAddress>: current_activated_owner
                    if (field.field_name === 'current_activated_owner' && field.kind === 'Enum') {
                        if (field.variant_name === 'Some' && field.fields?.length > 0) {
                            const ownerField = field.fields[0];
                            if (ownerField.kind === 'Reference') {
                                return { ...acc, current_activated_owner: ownerField.value };
                            }
                        }
                        return { ...acc, current_activated_owner: null };
                    }

                    // Option<NonFungibleLocalId>: issuer_registrar_id
                    if (field.field_name === 'issuer_registrar_id' && field.kind === 'Enum') {
                        if (field.variant_name === 'Some' && field.fields?.length > 0) {
                            const registrarField = field.fields[0];
                            if (registrarField.kind === 'NonFungibleLocalId') {
                                return { ...acc, issuer_registrar_id: registrarField.value };
                            }
                        }
                        return { ...acc, issuer_registrar_id: null };
                    }

                    return acc;
                }, { id: r.non_fungible_id } as Record<string, any>);

                return domainData;
            }
            return null;
        })
        .filter(Boolean);

    // Define intermediate type with temporary fields
    interface DomainWithTempFieldsI {
        id: string;
        _bond_resource?: string;
        _bond_amount?: string;
        subregistry_component_address?: string;
        created_timestamp?: number;
        current_activated_owner?: string | null;
        [key: string]: unknown;
    }

    // Enrich with full resource details (memoized)
    const enrichedDomains = await Promise.all(
        parsedDomains.map(async (domain: DomainWithTempFieldsI | null) => {
            if (!domain) return null;
            
            if (domain._bond_resource && domain._bond_amount) {
                const resourceDetails = await requestResourceDetails(domain._bond_resource, { sdkInstance });

                if (resourceDetails instanceof Error) {
                    throw resourceDetails;
                }

                // Destructure to omit temporary fields
                const { _bond_resource, _bond_amount, ...domainFields } = domain;

                return {
                    ...domainFields,
                    bond: {
                        resource: resourceDetails,
                        amount: convertToDecimal(_bond_amount)
                    }
                } as DomainDataI;
            }
            return domain as unknown as DomainDataI;
        })
    );

    return enrichedDomains;
}


/**
 * Gets subdomain and record counts from subregistry component
 */
async function getSubregistryCounts(
    subregistryComponentAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<{ subdomain_count: number; record_count: number }> {
    try {
        // Query the subregistry component's count fields
        const componentDetails = await sdkInstance.state.innerClient.stateEntityDetails({
            stateEntityDetailsRequest: { addresses: [subregistryComponentAddress] }
        });

        const componentItem = componentDetails.items[0];
        if (!componentItem || componentItem.details.type !== 'Component') {
            return { subdomain_count: 0, record_count: 0 };
        }

        const componentState = componentItem.details.state;
        if (!componentState || !('fields' in componentState)) {
            return { subdomain_count: 0, record_count: 0 };
        }

        // Gateway returns U32 as: { kind: "U32", field_name: "...", value: "123" }
        if (!isTupleValue(componentState)) {
            return { subdomain_count: 0, record_count: 0 };
        }

        const fields = componentState.fields;

        // Find subdomain_count field
        const subdomainCountField = findFieldByName(fields, 'subdomain_count');

        // Find record_count field
        const recordCountField = findFieldByName(fields, 'record_count');

        const subdomainCount = getFieldU32Value(subdomainCountField) ?? 0;
        const recordCount = getFieldU32Value(recordCountField) ?? 0;

        return {
            subdomain_count: subdomainCount,
            record_count: recordCount
        };
    } catch (error) {
        logger.error("getSubregistryCounts", error);
        return { subdomain_count: 0, record_count: 0 };
    }
}

/**
 * Fetches paginated domain data for an account
 */
async function fetchDomainData(
    accountAddress: string,
    { sdkInstance }: InstancePropsI,
    pagination?: PaginationParamsI
): Promise<PaginatedDomainsResponseI | null> {
    try {
        const accountNfts = await sdkInstance.state.getEntityDetailsVaultAggregated(accountAddress);

        const { domainIds, totalCount, nextCursor, previousCursor } = await fetchRootDomainIds(
            accountAddress,
            accountNfts,
            { sdkInstance },
            pagination
        );

        if (!domainIds.length) {
            return {
                domains: [],
                pagination: {
                    next_page: null,
                    previous_page: null,
                    total_count: totalCount,
                    current_page_count: 0
                }
            };
        }

        const response = await sdkInstance.state.innerClient.nonFungibleData({
            stateNonFungibleDataRequest: {
                resource_address: sdkInstance.entities.rnsCore.domainResource,
                non_fungible_ids: domainIds
            }
        });

        const domains = response?.non_fungible_ids || [];
        const formattedDomains = await formatDomainList(domains, { sdkInstance });

        const paginationInfo: PaginationInfoI = {
            next_page: nextCursor,
            previous_page: previousCursor,
            total_count: totalCount,
            current_page_count: formattedDomains.length
        };

        return {
            domains: formattedDomains,
            pagination: paginationInfo
        };
    } catch (error) {
        logger.error("fetchPaginatedDomainData", error);
        return null;
    }
}

/**
 * Request domains owned by an account (paginated)
 */
export async function requestAccountDomains(
    accountAddress: string,
    { sdkInstance }: InstancePropsI,
    pagination?: PaginationParamsI
): Promise<PaginatedDomainsResponseI | Error> {
    if (!accountAddress) {
        return {
            domains: [],
            pagination: {
                next_page: null,
                previous_page: null,
                total_count: 0,
                current_page_count: 0
            }
        };
    }

    try {
        return await fetchDomainData(accountAddress, { sdkInstance }, pagination);
    } catch (e) {
        logger.error("requestAccountDomains", e);
        return e;
    }
}

/**
 * Request domain details by domain name
 */
export async function requestDomainDetails(
    domain: string,
    { sdkInstance }: InstancePropsI
): Promise<DomainDataI | Error> {
    try {

        const registryResponse = await sdkInstance.state.innerClient.keyValueStoreData({
            stateKeyValueStoreDataRequest: {
                key_value_store_address: sdkInstance.entities.rnsCore.domainRegistry,
                keys: [{
                    key_json: {
                        kind: 'String',
                        value: domain
                    }
                }]
            }
        });

        if (!registryResponse || !registryResponse.entries || registryResponse.entries.length === 0) {
            return null;
        }

        const nftIdValue = registryResponse.entries[0]?.value?.programmatic_json as ProgrammaticScryptoSborValue;
        if (!nftIdValue || nftIdValue.kind !== 'NonFungibleLocalId') {
            return null;
        }

        const domainId = (nftIdValue as ProgrammaticScryptoSborValueNonFungibleLocalId).value;

        const response = await sdkInstance.state.innerClient.nonFungibleData({
            stateNonFungibleDataRequest: {
                resource_address: sdkInstance.entities.rnsCore.domainResource,
                non_fungible_ids: [domainId]
            }
        });

        if (!response || !response.non_fungible_ids || response.non_fungible_ids.length === 0) {
            return null;
        }

        const nftData = response.non_fungible_ids[0];

        if (!nftData) return null;

        const parsedData = (nftData.data?.programmatic_json as ProgrammaticScryptoSborValueTuple).fields.reduce((acc, field) => {
            // String fields
            if (field.kind === 'String' && field.field_name) {
                return { ...acc, [field.field_name]: field.value };
            }

            // Decimal: bond_amount (temporary)
            if (field.kind === 'Decimal' && field.field_name === 'bond_amount') {
                return { ...acc, _bond_amount: field.value };
            }

            // Resource address: bond_resource (temporary)
            if (field.kind === 'Reference' && field.field_name === 'bond_resource') {
                return { ...acc, _bond_resource: field.value };
            }

            // Component address: subregistry_component_address
            if (field.kind === 'Reference' && field.field_name === 'subregistry_component_address') {
                return { ...acc, subregistry_component_address: field.value };
            }

            // Timestamp (I64 in seconds, convert to ms)
            if (field.field_name === 'created_timestamp' && field.kind === 'I64') {
                return { ...acc, created_timestamp: parseInt(field.value) * 1000 };
            }

            // Option<ComponentAddress>: current_activated_owner
            if (field.field_name === 'current_activated_owner' && field.kind === 'Enum') {
                if (field.variant_name === 'Some' && field.fields?.length > 0) {
                    const ownerField = field.fields[0];
                    if (ownerField.kind === 'Reference') {
                        return { ...acc, current_activated_owner: ownerField.value };
                    }
                }
                return { ...acc, current_activated_owner: null };
            }

            // Option<NonFungibleLocalId>: issuer_registrar_id
            if (field.field_name === 'issuer_registrar_id' && field.kind === 'Enum') {
                if (field.variant_name === 'Some' && field.fields?.length > 0) {
                    const registrarField = field.fields[0];
                    if (registrarField.kind === 'NonFungibleLocalId') {
                        return { ...acc, issuer_registrar_id: registrarField.value };
                    }
                }
                return { ...acc, issuer_registrar_id: null };
            }

            return acc;
        }, { id: nftData.non_fungible_id } as Record<string, any>);

        // Enrich with full resource details (memoized)
        const resourceDetails = await requestResourceDetails(parsedData._bond_resource, { sdkInstance });

        if (resourceDetails instanceof Error) {
            throw resourceDetails;
        }

        // Destructure to omit temporary fields
        const { _bond_resource, _bond_amount, ...domainFields } = parsedData;

        const domainData = {
            ...domainFields,
            bond: {
                resource: resourceDetails,
                amount: convertToDecimal(_bond_amount)
            }
        } as DomainDataI;

        // Get subdomain and record counts
        if (domainData.subregistry_component_address) {
            const counts = await getSubregistryCounts(
                domainData.subregistry_component_address,
                { sdkInstance }
            );
            domainData.subdomain_count = counts.subdomain_count;
            domainData.record_count = counts.record_count;
        }

        return domainData;
    } catch (e) {
        logger.error("requestDomainDetails", e);
        return e;
    }
}

/**
 * Parses a HashMap<String, String> from Gateway API response
 */
function parseStringHashMap(mapValue: ProgrammaticScryptoSborValueMap): Record<string, string> {
    const result: Record<string, string> = {};

    if (!mapValue.entries) return result;

    for (const entry of mapValue.entries) {
        const typedEntry = entry as ProgrammaticScryptoSborValueMapEntry;

        // Ensure both key and value are strings
        if (typedEntry.key.kind === 'String' && typedEntry.value.kind === 'String') {
            result[typedEntry.key.value] = typedEntry.value.value;
        }
    }

    return result;
}

/**
 * Parses a SubdomainRecord struct from Gateway API response
 */
function parseSubdomainRecord(
    subdomainRecord: ProgrammaticScryptoSborValue,
    rootDomainData: DomainDataI
): SubDomainDataI {
    if (subdomainRecord.kind !== 'Tuple') {
        throw new Error("Invalid subdomain record format");
    }

    const parsedSubdomain: SubDomainDataI = {
        name: '',
        full_name: '',
        created_timestamp: 0,
        updated_timestamp: 0,
        metadata: {},
        root_domain: rootDomainData
    };

    for (const field of subdomainRecord.fields) {
        if (field.field_name === 'name' && field.kind === 'String') {
            parsedSubdomain.name = field.value;
        }
        if (field.field_name === 'full_name' && field.kind === 'String') {
            parsedSubdomain.full_name = field.value;
        }
        if (field.field_name === 'created_timestamp' && field.kind === 'I64') {
            parsedSubdomain.created_timestamp = parseInt(field.value) * 1000;
        }
        if (field.field_name === 'updated_timestamp' && field.kind === 'I64') {
            parsedSubdomain.updated_timestamp = parseInt(field.value) * 1000;
        }
        if (field.field_name === 'metadata' && field.kind === 'Map') {
            parsedSubdomain.metadata = parseStringHashMap(field as ProgrammaticScryptoSborValueMap);
        }
    }

    return parsedSubdomain;
}

/**
 * Gets the subdomains KeyValueStore address from a subregistry component
 */
async function getSubdomainsKvStoreAddress(
    subregistryAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<string> {
    const componentDetails = await sdkInstance.state.innerClient.stateEntityDetails({
        stateEntityDetailsRequest: { addresses: [subregistryAddress] }
    });

    const componentItem = componentDetails.items[0];
    if (!componentItem || componentItem.details.type !== 'Component') {
        throw new Error("Could not fetch subregistry component");
    }

    const componentState = componentItem.details.state;
    if (!componentState || !('fields' in componentState)) {
        throw new Error("Could not fetch subregistry state");
    }

    // Find the subdomains KeyValueStore address
    if (!isTupleValue(componentState)) {
        throw new Error("Invalid subregistry component state");
    }

    const fields = componentState.fields;
    const subdomainsKvStoreField = findFieldByName(fields, 'subdomains');

    if (!subdomainsKvStoreField) {
        throw new Error("Subdomains KeyValueStore not found");
    }

    const kvStoreAddress = getFieldStringValue(subdomainsKvStoreField);

    if (!kvStoreAddress) {
        throw new Error("Subdomains KeyValueStore address not found");
    }

    return kvStoreAddress;
}

/**
 * Request subdomain details from parent domain's subregistry
 */
export async function requestSubdomainDetails(
    subdomain: string,
    { sdkInstance }: InstancePropsI
): Promise<SubDomainDataI | Error> {
    try {
        // Get root domain first
        const rootDomainName = deriveRootDomain(subdomain);
        const rootDomainData = await requestDomainDetails(rootDomainName, { sdkInstance });

        if (!rootDomainData || rootDomainData instanceof Error) {
            throw new Error("Root domain not found or error fetching root domain");
        }

        // Extract subdomain name (e.g., "blog" from "blog.example.xrd")
        const subdomainName = subdomain.split('.')[0];

        // Get subdomains KeyValueStore address
        const subdomainsKvStoreAddress = await getSubdomainsKvStoreAddress(
            rootDomainData.subregistry_component_address,
            { sdkInstance }
        );

        // Query the specific subdomain from the KeyValueStore
        const subdomainData = await sdkInstance.state.innerClient.keyValueStoreData({
            stateKeyValueStoreDataRequest: {
                key_value_store_address: subdomainsKvStoreAddress,
                keys: [{ key_json: { kind: 'String', value: subdomainName } }]
            }
        });

        if (!subdomainData.entries || subdomainData.entries.length === 0) {
            throw new Error("Subdomain not found");
        }

        // Parse SubdomainRecord struct
        const subdomainRecord = subdomainData.entries[0].value.programmatic_json;
        return parseSubdomainRecord(subdomainRecord, rootDomainData);
    } catch (e) {
        logger.error("requestSubdomainDetails", e);
        return e;
    }
}

/**
 * Get subdomains for a domain from its subregistry component
 * Queries the subdomains KeyValueStore in the domain's dedicated subregistry
 */
export async function getSubdomains(
    domain: string,
    { sdkInstance }: InstancePropsI,
    pagination?: PaginationParamsI
): Promise<PaginatedSubdomainsResponseI | Error> {
    try {
        // Get domain details to find subregistry address
        const domainData = await requestDomainDetails(domain, { sdkInstance });

        if (!domainData || domainData instanceof Error) {
            throw new Error("Domain not found");
        }

        if (!domainData.subregistry_component_address) {
            throw new Error("Subregistry component address not found");
        }

        // Get subdomains KeyValueStore address
        const subdomainsKvStoreAddress = await getSubdomainsKvStoreAddress(
            domainData.subregistry_component_address,
            { sdkInstance }
        );

        const currentPage = pagination?.page || 1;

        // Get subdomain keys from KeyValueStore with pagination
        let cursor: string | undefined = undefined;
        let pageNumber = 1;

        // Navigate to the requested page
        while (pageNumber < currentPage) {
            const keysResponse = await sdkInstance.state.innerClient.keyValueStoreKeys({
                stateKeyValueStoreKeysRequest: {
                    key_value_store_address: subdomainsKvStoreAddress,
                    cursor: cursor
                }
            });

            if (!keysResponse.next_cursor) {

                return {
                    subdomains: [],
                    pagination: {
                        next_page: null,
                        previous_page: currentPage > 1 ? currentPage - 1 : null,
                        total_count: 0,
                        current_page_count: 0
                    },
                    root_domain_name: domain
                };

            }

            cursor = keysResponse.next_cursor;
            pageNumber++;
        }

        // Get the current page of keys
        const keysResponse = await sdkInstance.state.innerClient.keyValueStoreKeys({
            stateKeyValueStoreKeysRequest: {
                key_value_store_address: subdomainsKvStoreAddress,
                cursor: cursor
            }
        });

        if (!keysResponse.items || keysResponse.items.length === 0) {
            return {
                subdomains: [],
                pagination: {
                    next_page: null,
                    previous_page: currentPage > 1 ? currentPage - 1 : null,
                    total_count: 0,
                    current_page_count: 0
                },
                root_domain_name: domain
            };
        }

        // Extract subdomain names from keys
        const subdomainNames: string[] = [];
        for (const item of keysResponse.items) {
            const keyItem = item as StateKeyValueStoreKeysResponseItem;
            if (keyItem.key.programmatic_json.kind === 'String') {
                subdomainNames.push(keyItem.key.programmatic_json.value);
            }
        }

        // Fetch full subdomain data for each subdomain
        const subdomainDataResponse = await sdkInstance.state.innerClient.keyValueStoreData({
            stateKeyValueStoreDataRequest: {
                key_value_store_address: subdomainsKvStoreAddress,
                keys: subdomainNames.map(name => ({
                    key_json: { kind: 'String' as const, value: name }
                }))
            }
        });

        // Parse all subdomain records
        const subdomains: SubDomainDataI[] = [];
        if (subdomainDataResponse.entries) {
            for (const entry of subdomainDataResponse.entries) {
                try {
                    const parsedSubdomain = parseSubdomainRecord(
                        entry.value.programmatic_json,
                        domainData
                    );
                    subdomains.push(parsedSubdomain);
                } catch (error) {
                    logger.error("Failed to parse subdomain record", error);
                }
            }
        }

        // Calculate total count if on first page
        let totalCount = 0;
        if (currentPage === 1) {
            totalCount = await getTotalSubdomainCount(subdomainsKvStoreAddress, { sdkInstance });
        }

        return {
            subdomains,
            pagination: {
                next_page: keysResponse.next_cursor ? currentPage + 1 : null,
                previous_page: currentPage > 1 ? currentPage - 1 : null,
                total_count: totalCount,
                current_page_count: subdomains.length
            },
            root_domain_name: domain
        };
    } catch (e) {
        logger.error("getSubdomains", e);
        return e;
    }
}

/**
 * Gets total count of subdomains in a KeyValueStore
 */
async function getTotalSubdomainCount(
    subdomainsKvStoreAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<number> {
    try {
        let totalCount = 0;
        let cursor: string | undefined = undefined;

        do {
            const keysResponse = await sdkInstance.state.innerClient.keyValueStoreKeys({
                stateKeyValueStoreKeysRequest: {
                    key_value_store_address: subdomainsKvStoreAddress,
                    cursor: cursor
                }
            });

            totalCount += keysResponse.items?.length || 0;
            cursor = keysResponse.next_cursor;
        } while (cursor);

        return totalCount;
    } catch (error) {
        logger.error("getTotalSubdomainCount", error);
        return 0;
    }
}

/**
 * Request domain or subdomain details (unified interface)
 */
export async function requestDomainEntityDetails(
    domain: string,
    { sdkInstance }: InstancePropsI
): Promise<DomainDataI | SubDomainDataI | Error> {
    const domainTypeResult = deriveDomainType(domain);
    const isSubdomain = domainTypeResult.isValid && domainTypeResult.type === 'sub';

    if (isSubdomain) {
        return requestSubdomainDetails(domain, { sdkInstance });
    }

    return requestDomainDetails(domain, { sdkInstance });
}