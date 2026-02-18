import setPrimaryDomainManifest from "../../manifests/account/set-primary-domain-manifest";
import updateDiscoveryManifest from "../../manifests/account/update-discovery-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";
import { validateDomainOwnership, isValidationError } from "../../utils/validation.utils";
import { deriveDomainType, deriveRootDomain } from "../../utils/domain.utils";
import { isNonFungibleVaultAggregated } from "../../utils/gateway.utils";
import errors from "../../mappings/errors";

import { UpdateAccountSettingsDispatcherPropsI } from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

import { logger } from "../../utils/log.utils";

/**
 * Update Account Settings Dispatcher
 * 
 * Unified dispatcher for managing account settings:
 * - Set or change primary domain (with optional discovery toggle)
 * - Toggle discovery settings without changing primary domain
 * 
 * When `primaryDomain` is provided:
 * - Creates or updates the account's config badge
 * - Sets the specified domain as primary
 * - Optionally enables/disables discovery (defaults to false)
 * 
 * When only `enableDiscovery` is provided:
 * - Requires an existing config badge (primary domain must already be set)
 * - Updates discovery setting without changing the primary domain
 * 
 * @param sdkInstance - SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account to update settings for
 * @param primaryDomain - Domain name to set as primary (optional)
 * @param enableDiscovery - Whether to enable discovery (optional, defaults to false when setting primary)
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchUpdateAccountSettings({
    sdkInstance,
    rdt,
    accountAddress,
    primaryDomain,
    enableDiscovery,
    callbacks
}: UpdateAccountSettingsDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    // Route to appropriate handler based on what's being updated
    if (primaryDomain) {
        return setPrimaryDomain({
            sdkInstance,
            rdt,
            accountAddress,
            domain: primaryDomain,
            enableDiscovery: enableDiscovery ?? false,
            callbacks
        });
    } else if (enableDiscovery !== undefined) {
        return updateDiscovery({
            sdkInstance,
            rdt,
            accountAddress,
            enableDiscovery,
            callbacks
        });
    } else {
        return transactionError(errors.accountSettings.nothingToUpdate({ accountAddress }));
    }

}

// Error factory adapter for account settings (generic doesn't have domain param)
const accountSettingsErrorFactory = {
    generic: ({ verbose }: { domain: string; verbose: string | null }) => 
        errors.accountSettings.generic({ verbose })
};

/**
 * Set primary domain (creates/updates config badge)
 */
async function setPrimaryDomain({
    sdkInstance,
    rdt,
    accountAddress,
    domain,
    enableDiscovery,
    callbacks
}: {
    sdkInstance: UpdateAccountSettingsDispatcherPropsI['sdkInstance'];
    rdt: UpdateAccountSettingsDispatcherPropsI['rdt'];
    accountAddress: string;
    domain: string;
    enableDiscovery: boolean;
    callbacks?: UpdateAccountSettingsDispatcherPropsI['callbacks'];
}): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        // Determine if this is a subdomain or root domain
        const domainTypeResult = deriveDomainType(domain);

        if (!domainTypeResult.isValid) {
            return transactionError(errors.accountSettings.generic({ 
                verbose: domainTypeResult.errors?.[0]?.verbose || "Invalid domain format" 
            }));
        }

        // For subdomains, we need the root domain's NFT ID
        // For root domains, we use the domain itself
        const rootDomainName = domainTypeResult.type === 'sub' 
            ? deriveRootDomain(domain) 
            : domain;

        if (!rootDomainName) {
            return transactionError(errors.accountSettings.generic({ 
                verbose: "Could not determine root domain" 
            }));
        }

        // Validate ownership of the root domain
        const validation = await validateDomainOwnership({
            domain: rootDomainName,
            accountAddress,
            sdkInstance,
            requireSubregistry: false,
            errorFactory: accountSettingsErrorFactory
        });

        if (isValidationError(validation)) {
            return validation.error;
        }

        const { domainDetails } = validation;

        const manifest = await setPrimaryDomainManifest({
            sdkInstance,
            accountAddress,
            domainId: domainDetails.id,
            domainName: domain,
            enableDiscovery
        });

        const discoveryStatus = enableDiscovery ? "enabled" : "disabled";

        await sendTransaction({
            rdt,
            message: `Set ${domain} as primary domain`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'UPDATE_ACCOUNT_SETTINGS_SUCCESSFUL',
            details: `${domain} has been set as the primary domain for ${accountAddress}. Discovery is ${discoveryStatus}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.accountSettings.generic({ verbose: message }));
    }

}

/**
 * Update discovery settings only (requires existing config badge)
 */
async function updateDiscovery({
    sdkInstance,
    rdt,
    accountAddress,
    enableDiscovery,
    callbacks
}: {
    sdkInstance: UpdateAccountSettingsDispatcherPropsI['sdkInstance'];
    rdt: UpdateAccountSettingsDispatcherPropsI['rdt'];
    accountAddress: string;
    enableDiscovery: boolean;
    callbacks?: UpdateAccountSettingsDispatcherPropsI['callbacks'];
}): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        // Check if account has a config badge
        const configBadgeResource = sdkInstance.entities.rnsCore.configBadgeResource;

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
            return transactionError(errors.accountSettings.noConfigBadge({ accountAddress }));
        }

        // Find config badge vault
        const configBadgeCollection = accountItem.non_fungible_resources?.items?.find(
            (nft) => nft.resource_address === configBadgeResource
        );

        if (!isNonFungibleVaultAggregated(configBadgeCollection)) {
            return transactionError(errors.accountSettings.noConfigBadge({ accountAddress }));
        }

        const configBadgeItems = configBadgeCollection.vaults?.items?.[0]?.items;

        if (!configBadgeItems || configBadgeItems.length === 0) {
            return transactionError(errors.accountSettings.noConfigBadge({ accountAddress }));
        }

        const configBadgeId = configBadgeItems[0];

        // Build and send the transaction
        const manifest = await updateDiscoveryManifest({
            sdkInstance,
            accountAddress,
            configBadgeId,
            enableDiscovery
        });

        const discoveryStatus = enableDiscovery ? "enabled" : "disabled";

        await sendTransaction({
            rdt,
            message: `Updating discovery settings (${discoveryStatus}) for ${accountAddress}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'UPDATE_ACCOUNT_SETTINGS_SUCCESSFUL',
            details: `Discovery has been ${discoveryStatus} for ${accountAddress}.`
        });

    } catch (error) {
        logger.error("updateDiscovery", error);
        return transactionError(errors.accountSettings.generic({ verbose: error instanceof Error ? error.message : String(error) }));
    }

}
