import {
    NonFungibleResourcesCollectionItemVaultAggregatedVaultItem,
    ProgrammaticScryptoSborValueTuple,
    StateEntityDetailsVaultResponseItem
} from "@radixdlt/babylon-gateway-api-sdk";

import { logger } from "../../utils/log.utils";
import { ImportDomainI, PaginatedImportDomainsI } from "../../common/import.types";
import { PaginationParamsI } from "../../common/pagination.types";
import { InstancePropsI } from "../../common/entities.types";

/**
 * Filters user's import domain NFT vault from account NFT aggregation
 */
function filterImportDomainVault(
    accountNfts: StateEntityDetailsVaultResponseItem,
    importDomainResourceAddr: string
): NonFungibleResourcesCollectionItemVaultAggregatedVaultItem | undefined {
    return accountNfts.non_fungible_resources?.items.find(
        (nft) => nft.resource_address === importDomainResourceAddr
    )?.vaults.items[0];
}

/**
 * Fetches import domain NFT IDs from user's account with pagination support
 */
async function fetchImportDomainIds(
    accountAddress: string,
    accountNfts: StateEntityDetailsVaultResponseItem,
    { sdkInstance }: InstancePropsI,
    pagination?: PaginationParamsI
): Promise<{ domainIds: string[], totalCount: number, nextCursor: number | null, previousCursor: number | null }> {

    const importDomainVault = filterImportDomainVault(
        accountNfts, 
        sdkInstance.entities.rnsCore.importDomainResource
    );

    if (!importDomainVault?.items) {
        return { domainIds: [], totalCount: 0, nextCursor: null, previousCursor: null };
    }

    const { vault_address: vaultAddr } = importDomainVault;
    const currentPage = pagination?.page || 1;
    const totalCount = importDomainVault.total_count || importDomainVault.items.length;

    // First page - return items directly from the initial response
    if (currentPage === 1) {
        return {
            domainIds: importDomainVault.items,
            totalCount,
            nextCursor: importDomainVault.next_cursor ? 2 : null,
            previousCursor: null
        };
    }

    // Subsequent pages - navigate using cursor
    let currentCursor = importDomainVault.next_cursor;
    let pageNumber = 2;

    while (currentCursor && pageNumber < currentPage) {
        try {
            const ledgerStateVersion = (await sdkInstance.status.getCurrent()).ledger_state.state_version;
            const response = await sdkInstance.state.innerClient.entityNonFungibleIdsPage({
                stateEntityNonFungibleIdsPageRequest: {
                    address: accountAddress,
                    resource_address: sdkInstance.entities.rnsCore.importDomainResource,
                    vault_address: vaultAddr,
                    cursor: currentCursor,
                    at_ledger_state: { state_version: ledgerStateVersion }
                }
            });

            currentCursor = response.next_cursor || null;
            pageNumber++;
        } catch (error) {
            logger.error("fetchImportDomainIds", error);
            break;
        }
    }

    // Fetch the target page
    if (currentCursor && pageNumber === currentPage) {
        try {
            const ledgerStateVersion = (await sdkInstance.status.getCurrent()).ledger_state.state_version;
            const response = await sdkInstance.state.innerClient.entityNonFungibleIdsPage({
                stateEntityNonFungibleIdsPageRequest: {
                    address: accountAddress,
                    resource_address: sdkInstance.entities.rnsCore.importDomainResource,
                    vault_address: vaultAddr,
                    cursor: currentCursor,
                    at_ledger_state: { state_version: ledgerStateVersion }
                }
            });

            return {
                domainIds: response.items || [],
                totalCount,
                nextCursor: response.next_cursor ? currentPage + 1 : null,
                previousCursor: currentPage > 1 ? currentPage - 1 : null
            };
        } catch (error) {
            logger.error("fetchImportDomainIds", error);
        }
    }

    return {
        domainIds: [],
        totalCount,
        nextCursor: null,
        previousCursor: currentPage > 1 ? currentPage - 1 : null
    };
}

/**
 * Parses import domain NFT data into ImportDomainI format
 */
function parseImportDomainData(
    nftId: string,
    fields: ProgrammaticScryptoSborValueTuple['fields']
): ImportDomainI {
    const domain: ImportDomainI = {
        name: '',
        id: nftId,
        address: null,
        created_timestamp: 0,
        last_valid_timestamp: null,
        deposit_amount: null,
        primary_domain: null,
        key_image_url: ''
    };

    for (const field of fields) {
        if (!field.field_name) continue;

        switch (field.field_name) {
            case 'name':
                if (field.kind === 'String') {
                    domain.name = field.value;
                }
                break;

            case 'address':
                // Option<ComponentAddress>
                if (field.kind === 'Enum') {
                    if (field.variant_name === 'Some' && field.fields?.[0]) {
                        const innerField = field.fields[0];
                        if (innerField.kind === 'Reference') {
                            domain.address = innerField.value;
                        }
                    }
                }
                break;

            case 'created_timestamp':
                // i64 in seconds, convert to milliseconds
                if (field.kind === 'I64') {
                    domain.created_timestamp = parseInt(field.value, 10) * 1000;
                }
                break;

            case 'last_valid_timestamp':
                // Option<i64> in seconds, convert to milliseconds
                if (field.kind === 'Enum') {
                    if (field.variant_name === 'Some' && field.fields?.[0]) {
                        const innerField = field.fields[0];
                        if (innerField.kind === 'I64') {
                            domain.last_valid_timestamp = parseInt(innerField.value, 10) * 1000;
                        }
                    }
                }
                break;

            case 'deposit_amount':
                // Option<(ResourceAddress, Decimal)>
                if (field.kind === 'Enum') {
                    if (field.variant_name === 'Some' && field.fields?.[0]) {
                        const tupleField = field.fields[0];
                        if (tupleField.kind === 'Tuple' && tupleField.fields?.length === 2) {
                            const resourceField = tupleField.fields[0];
                            const amountField = tupleField.fields[1];
                            if (resourceField.kind === 'Reference' && amountField.kind === 'Decimal') {
                                domain.deposit_amount = {
                                    resource: resourceField.value,
                                    amount: amountField.value
                                };
                            }
                        }
                    }
                }
                break;

            case 'primary_domain':
                // Option<NonFungibleLocalId>
                if (field.kind === 'Enum') {
                    if (field.variant_name === 'Some' && field.fields?.[0]) {
                        const innerField = field.fields[0];
                        if (innerField.kind === 'NonFungibleLocalId') {
                            domain.primary_domain = innerField.value;
                        }
                    }
                }
                break;

            case 'key_image_url':
                // Url type (stored as String in SBOR)
                if (field.kind === 'String') {
                    domain.key_image_url = field.value;
                }
                break;
        }
    }

    return domain;
}

/**
 * Fetches all import domains owned by an account
 * 
 * Use this to discover which accepted domains can be imported.
 * Once discovered, use `importAcceptedDomain()` to import each domain.
 * 
 * @param accountAddress - Account to query for import domains
 * @param sdkInstance - RNS SDK instance
 * @param pagination - Optional pagination params
 * @returns Paginated list of import domains or Error
 * 
 * @example
 * ```typescript
 * const imports = await requestAccountImportDomains({
 *   accountAddress: 'account_rdx...',
 *   sdkInstance: rns
 * });
 * 
 * if (!(imports instanceof Error)) {
 *   console.log(`Found ${imports.domains.length} import domains`);
 *   for (const domain of imports.domains) {
 *     console.log(`- ${domain.name}`);
 *   }
 * }
 * ```
 */
export async function requestAccountImportDomains({
    accountAddress,
    sdkInstance,
    pagination
}: {
    accountAddress: string;
    pagination?: PaginationParamsI;
} & InstancePropsI): Promise<PaginatedImportDomainsI | Error> {
    
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
        // Fetch account NFT holdings
        const ledgerStateVersion = (await sdkInstance.status.getCurrent()).ledger_state.state_version;
        const accountNfts = await sdkInstance.state.innerClient.stateEntityDetails({
            stateEntityDetailsRequest: {
                addresses: [accountAddress],
                aggregation_level: 'Vault',
                opt_ins: {
                    non_fungible_include_nfids: true
                },
                at_ledger_state: { state_version: ledgerStateVersion }
            }
        });

        const accountDetails = accountNfts.items[0] as StateEntityDetailsVaultResponseItem;
        
        if (!accountDetails) {
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

        // Get import domain NFT IDs with pagination
        const { domainIds, totalCount, nextCursor, previousCursor } = await fetchImportDomainIds(
            accountAddress,
            accountDetails,
            { sdkInstance },
            pagination
        );

        if (domainIds.length === 0) {
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

        // Fetch NFT data for each import domain
        const nftDataResponse = await sdkInstance.state.innerClient.nonFungibleData({
            stateNonFungibleDataRequest: {
                resource_address: sdkInstance.entities.rnsCore.importDomainResource,
                non_fungible_ids: domainIds
            }
        });

        // Parse each import domain
        const domains: ImportDomainI[] = [];
        
        for (const nftItem of nftDataResponse.non_fungible_ids || []) {
            if (!nftItem.data?.programmatic_json) continue;
            
            const fields = (nftItem.data.programmatic_json as ProgrammaticScryptoSborValueTuple).fields;
            if (!fields) continue;

            const domain = parseImportDomainData(nftItem.non_fungible_id, fields);
            domains.push(domain);
        }

        return {
            domains,
            pagination: {
                next_page: nextCursor,
                previous_page: previousCursor,
                total_count: totalCount,
                current_page_count: domains.length
            }
        };

    } catch (e) {
        logger.error("requestAccountImportDomains", e);
        return e as Error;
    }
}

