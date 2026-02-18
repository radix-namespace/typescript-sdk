import {
    NonFungibleResourcesCollectionItemVaultAggregated
} from "@radixdlt/babylon-gateway-api-sdk";

import { logger } from "../../utils/log.utils";
import { requestAccountDomains, requestDomainDetails } from "./domains";
import { isTupleValue, isEnumValue } from "../../utils/gateway.utils";

import { InstancePropsI } from "../../common/entities.types";
import { AccountSettingsResultI } from "../../common/domain.types";

/**
 * Fetches config badge NFTs for an account
 * 
 * @param accountAddress - Account address to check
 * @param sdkInstance - SDK instance with entities
 * @returns Array of config badge NFT IDs or empty array
 */
async function fetchAccountConfigBadges(
    accountAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<string[]> {

    try {
        const configBadgeResource = sdkInstance.entities.rnsCore.configBadgeResource;

        if (!configBadgeResource) {
            logger.error("Config badge resource not found in SDK entities", null);
            return [];
        }

        // Get account NFTs
        const accountState = await sdkInstance.state.innerClient.stateEntityDetails({
            stateEntityDetailsRequest: {
                addresses: [accountAddress],
                aggregation_level: "Vault",
                opt_ins: {
                    non_fungible_include_nfids: true
                }
            }
        });

        const accountItem = accountState.items?.[0];

        if (!accountItem || !('non_fungible_resources' in accountItem)) {
            return [];
        }

        // Find config badge vault
        const configBadgeCollection = accountItem.non_fungible_resources?.items?.find(
            (nft) => nft.resource_address === configBadgeResource
        ) as NonFungibleResourcesCollectionItemVaultAggregated | undefined;

        if (!configBadgeCollection?.vaults?.items?.[0]?.items) {
            return [];
        }

        return configBadgeCollection.vaults.items[0].items;

    } catch (error) {
        logger.error("Error fetching account config badges:", error);
        return [];
    }

}

/**
 * Fetches config badge NFT metadata
 * 
 * @param configBadgeId - Config badge NFT ID
 * @param sdkInstance - SDK instance with entities
 * @returns Config badge metadata or null
 */
async function fetchConfigBadgeMetadata(
    configBadgeId: string,
    { sdkInstance }: InstancePropsI
): Promise<{ primaryDomain: string | null; discoveryEnabled: boolean } | null> {

    try {
        const configBadgeResource = sdkInstance.entities.rnsCore.configBadgeResource;

        const response = await sdkInstance.state.innerClient.nonFungibleData({
            stateNonFungibleDataRequest: {
                resource_address: configBadgeResource,
                non_fungible_ids: [configBadgeId]
            }
        });

        const nftData = response.non_fungible_ids?.[0];

        if (!nftData?.data?.programmatic_json) {
            return null;
        }

        const programmaticJson = nftData.data.programmatic_json;

        if (!isTupleValue(programmaticJson)) {
            return null;
        }

        const fields = programmaticJson.fields;

        // Parse the AddressConfig struct fields
        // Fields: primary_domain (Option<String>), discovery_enabled (bool), created_timestamp, updated_timestamp
        let primaryDomain: string | null = null;
        let discoveryEnabled = false;

        for (const field of fields) {
            const fieldName = 'field_name' in field ? field.field_name : null;
            
            if (fieldName === 'primary_domain') {
                // Option<String> - check if it's Some or None
                if (isEnumValue(field) && field.variant_name === 'Some' && field.fields?.[0]) {
                    const innerField = field.fields[0];
                    if ('value' in innerField && typeof innerField.value === 'string') {
                        primaryDomain = innerField.value;
                    }
                }
            } else if (fieldName === 'discovery_enabled') {
                if ('value' in field) {
                    discoveryEnabled = field.value === true || field.value === 'true';
                }
            }
        }

        return { primaryDomain, discoveryEnabled };

    } catch (error) {
        logger.error("Error fetching config badge metadata:", error);
        return null;
    }

}

/**
 * Gets the account settings (RNS config) for an account address
 * 
 * This function reads the account's config badge (soulbound NFT) which stores:
 * - Primary domain for reverse resolution
 * - Discovery enabled flag for privacy control
 * 
 * The function also verifies authenticity by checking if the primary domain
 * is still owned by the same account.
 * 
 * @param accountAddress - Account address to look up
 * @param sdkInstance - SDK instance
 * @returns Account settings result or null if no config badge exists
 */
export async function requestAccountSettings(
    accountAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<AccountSettingsResultI | null | Error> {

    try {

        // Step 1: Check if account has a config badge
        const configBadgeIds = await fetchAccountConfigBadges(accountAddress, { sdkInstance });

        if (configBadgeIds.length === 0) {
            return null;
        }

        // Use the first config badge (should only be one per account - soulbound)
        const configBadgeId = configBadgeIds[0];

        // Step 2: Read config badge metadata
        const configMetadata = await fetchConfigBadgeMetadata(configBadgeId, { sdkInstance });

        if (!configMetadata || !configMetadata.primaryDomain) {
            return null;
        }

        // Step 3: Verify authenticity - check if primary domain is still owned by this account
        const accountDomains = await requestAccountDomains(accountAddress, { sdkInstance });

        if (accountDomains instanceof Error) {
            return new Error(`Failed to verify domain ownership: ${accountDomains.message}`);
        }

        // Check if the primary domain is in the account's domains list
        const ownsDomain = accountDomains.domains.some(
            domain => domain.name.toLowerCase() === configMetadata.primaryDomain!.toLowerCase()
        );

        // For subdomains, we also need to check if the account owns the root domain
        let ownsRootDomain = false;
        if (!ownsDomain && configMetadata.primaryDomain.split('.').length === 3) {
            // This is a subdomain (e.g., "blog.example.xrd")
            const parts = configMetadata.primaryDomain.split('.');
            const rootDomain = `${parts[1]}.${parts[2]}`;
            
            ownsRootDomain = accountDomains.domains.some(
                domain => domain.name.toLowerCase() === rootDomain.toLowerCase()
            );
        }

        const isAuthentic = ownsDomain || ownsRootDomain;

        // Get domain details for additional info
        let domainDetails = null;
        if (isAuthentic) {
            try {
                const details = await requestDomainDetails(
                    configMetadata.primaryDomain.split('.').length === 3
                        ? `${configMetadata.primaryDomain.split('.')[1]}.${configMetadata.primaryDomain.split('.')[2]}`
                        : configMetadata.primaryDomain,
                    { sdkInstance }
                );
                
                if (!(details instanceof Error)) {
                    domainDetails = details;
                }
            } catch {
                // Ignore errors, domain details are optional
            }
        }

        return {
            primaryDomain: configMetadata.primaryDomain,
            discoveryEnabled: configMetadata.discoveryEnabled,
            isAuthentic,
            accountAddress,
            domainDetails
        };

    } catch (error) {
        logger.error("Error in requestAccountSettings:", error);
        return error instanceof Error ? error : new Error(String(error));
    }

}

