import Decimal from "decimal.js";
import { ProgrammaticScryptoSborValue, StateKeyValueStoreKeysResponseItem } from "@radixdlt/babylon-gateway-api-sdk";

import { InstancePropsI } from "../../common/entities.types";
import { RegistrarFeeVaultI, PaginatedRegistrarFeesI } from "../../common/registrar.types";
import { PaginationParamsI, PaginationInfoI } from "../../common/pagination.types";
import { logger } from "../../utils/log.utils";
import { formatNonFungibleLocalId } from "../../utils/domain.utils";
import { requestResourceDetails } from "../resource/details";
import { isTupleValue, findFieldByName, isDecimalValue, getFieldStringValue } from "../../utils/gateway.utils";

/**
 * Gets total count of fee vault entries for a registrar
 * 
 * Iterates through all keys in the registrarFeeVaults KVS and counts
 * those matching the given registrar ID.
 */
async function getTotalFeeVaultCount(
    registrarFeeVaultsAddress: string,
    registrarId: string,
    { sdkInstance }: InstancePropsI
): Promise<number> {

    const formattedId = formatNonFungibleLocalId(registrarId);
    let totalCount = 0;
    let cursor: string | null | undefined = undefined;

    do {

        const response = await sdkInstance.state.innerClient.keyValueStoreKeys({
            stateKeyValueStoreKeysRequest: {
                key_value_store_address: registrarFeeVaultsAddress,
                cursor: cursor,
                limit_per_page: 100
            }
        });

        // Filter keys that match the registrar ID
        // Key structure: Tuple<NonFungibleLocalId, ResourceAddress>
        for (const item of response.items || []) {

            const keyItem = item as StateKeyValueStoreKeysResponseItem;
            const keyJson = keyItem.key.programmatic_json;

            if (isTupleValue(keyJson)) {
                const fields = keyJson.fields;

                if (fields.length >= 2) {
                    const nftIdField = fields[0];
                    const nftIdValue = getFieldStringValue(nftIdField);

                    if (nftIdValue === formattedId) {
                        totalCount++;
                    }
                }
            }

        }

        cursor = response.next_cursor || null;

    } while (cursor !== null && cursor !== undefined);

    return totalCount;

}

/**
 * Fetches registrar fee vault balances with pagination support
 * 
 * This function queries the registrarFeeVaults KeyValueStore to retrieve
 * fee balances for a specific registrar across all payment resources.
 * 
 * The KeyValueStore structure is: KeyValueStore<(NonFungibleLocalId, ResourceAddress), Vault>
 * 
 * @param registrarId - The registrar badge ID (raw or formatted, e.g., "1" or "#1#")
 * @param sdkInstance - The RNS SDK instance containing state and entities
 * @param pagination - Optional pagination parameters
 * @returns Paginated fee vault entries or Error
 * 
 * @example
 * ```typescript
 * const result = await requestRegistrarFeeBalances({
 *   registrarId: '1',  // SDK handles formatting to "#1#"
 *   sdkInstance: rns
 * });
 * if (result instanceof Error) {
 *   console.error('Failed to fetch fee balances:', result.message);
 * } else {
 *   result.fees.forEach(fee => {
 *     console.log(`${fee.resource.symbol}: ${fee.amount}`);
 *   });
 * }
 * ```
 */
export async function requestRegistrarFeeBalances(
    registrarId: string,
    { sdkInstance }: InstancePropsI,
    pagination?: PaginationParamsI
): Promise<PaginatedRegistrarFeesI | Error> {

    try {

        const registrarFeeVaultsAddress = sdkInstance.entities.rnsCore.registrarFeeVaults;

        if (!registrarFeeVaultsAddress) {
            throw new Error('Registrar fee vaults address not found in RNS entities');
        }

        const formattedId = formatNonFungibleLocalId(registrarId);
        const currentPage = pagination?.page || 1;
        const pageSize = 100;

        // Collect all matching keys first (we need to filter by registrar ID)
        const matchingEntries: Array<{ resourceAddress: string; vaultAmount: string }> = [];
        let cursor: string | null | undefined = undefined;
        let pageNumber = 1;

        // Navigate to collect entries up to and including the current page
        do {

            const keysResponse = await sdkInstance.state.innerClient.keyValueStoreKeys({
                stateKeyValueStoreKeysRequest: {
                    key_value_store_address: registrarFeeVaultsAddress,
                    cursor: cursor,
                    limit_per_page: pageSize
                }
            });

            // Collect keys that match this registrar
            const matchingKeys: Array<{ key_json: ProgrammaticScryptoSborValue }> = [];

            for (const item of keysResponse.items || []) {

                const keyItem = item as StateKeyValueStoreKeysResponseItem;
                const keyJson = keyItem.key.programmatic_json;

                if (isTupleValue(keyJson)) {
                    const fields = keyJson.fields;

                    if (fields.length >= 2) {
                        const nftIdField = fields[0];
                        const nftIdValue = getFieldStringValue(nftIdField);

                        if (nftIdValue === formattedId) {
                            // This key matches our registrar - store the full key for later query
                            matchingKeys.push({
                                key_json: keyJson as ProgrammaticScryptoSborValue
                            });
                        }
                    }
                }

            }

            // If we have matching keys, fetch their values (vault data)
            if (matchingKeys.length > 0 && pageNumber >= currentPage) {

                const dataResponse = await sdkInstance.state.innerClient.keyValueStoreData({
                    stateKeyValueStoreDataRequest: {
                        key_value_store_address: registrarFeeVaultsAddress,
                        keys: matchingKeys
                    }
                });

                for (const entry of dataResponse.entries || []) {
                    // Extract resource address from key
                    const keyJson = entry.key.programmatic_json;
                    let resourceAddress: string | undefined;

                    if (isTupleValue(keyJson) && keyJson.fields.length >= 2) {
                        resourceAddress = getFieldStringValue(keyJson.fields[1]);
                    }

                    // Extract vault amount from value
                    const valueJson = entry.value.programmatic_json;
                    let vaultAmount = '0';

                    // The vault value structure contains an 'amount' field
                    if (isTupleValue(valueJson)) {
                        const amountField = findFieldByName(valueJson.fields, 'amount') 
                            || findFieldByName(valueJson.fields, '0');
                        if (amountField) {
                            vaultAmount = getFieldStringValue(amountField) || '0';
                        }
                    } else if (isDecimalValue(valueJson)) {
                        // Simple decimal value
                        vaultAmount = valueJson.value || '0';
                    }

                    if (resourceAddress) {
                        matchingEntries.push({
                            resourceAddress,
                            vaultAmount
                        });
                    }
                }

            }

            cursor = keysResponse.next_cursor || null;
            pageNumber++;

            // Stop once we've processed the current page
            if (pageNumber > currentPage && matchingEntries.length >= pageSize) {
                break;
            }

        } while (cursor !== null && cursor !== undefined);

        // Enrich with resource metadata
        const fees: RegistrarFeeVaultI[] = [];

        for (const entry of matchingEntries) {

            const resourceDetails = await requestResourceDetails(entry.resourceAddress, { sdkInstance });

            fees.push({
                resource_address: entry.resourceAddress,
                amount: new Decimal(entry.vaultAmount || '0'),
                resource: resourceDetails instanceof Error 
                    ? {
                        address: entry.resourceAddress,
                        type: 'fungible',
                        name: null,
                        symbol: null,
                        description: null,
                        tags: [],
                        icon_url: null,
                        info_url: null
                    }
                    : resourceDetails
            });

        }

        // Calculate total count if on first page
        let totalCount = 0;
        if (currentPage === 1) {
            totalCount = await getTotalFeeVaultCount(registrarFeeVaultsAddress, registrarId, { sdkInstance });
        }

        const paginationInfo: PaginationInfoI = {
            next_page: matchingEntries.length === pageSize ? currentPage + 1 : null,
            previous_page: currentPage > 1 ? currentPage - 1 : null,
            total_count: totalCount,
            current_page_count: fees.length
        };

        return {
            fees,
            pagination: paginationInfo
        };

    } catch (e) {
        logger.error("requestRegistrarFeeBalances", e);
        return e as Error;
    }

}
