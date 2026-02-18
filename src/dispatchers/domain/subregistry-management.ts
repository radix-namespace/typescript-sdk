import { 
    updateSubregistryIconManifest, 
    updateSubregistryDappDefinitionManifest,
    updateDomainResourceManifest,
    replaceSubregistryManifest
} from "../../manifests/domains/subregistry-management-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";
import { validateDomainOwnership, isValidationError } from "../../utils/validation.utils";
import errors from "../../mappings/errors";

import { 
    UpdateSubregistryIconDispatcherPropsI,
    UpdateSubregistryDappDefinitionDispatcherPropsI,
    UpdateDomainResourceDispatcherPropsI,
    ReplaceSubregistryDispatcherPropsI
} from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

/**
 * Update Subregistry Icon Dispatcher
 * 
 * Updates the icon_url metadata on the domain's DomainSubregistry component.
 * This allows domain owners to customize the icon displayed for their subregistry.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param domain - Domain name (e.g., "example.xrd")
 * @param iconUrl - New icon URL
 * @param accountAddress - Account holding the domain
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchUpdateSubregistryIcon({
    sdkInstance,
    rdt,
    domain,
    iconUrl,
    accountAddress,
    callbacks
}: UpdateSubregistryIconDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        const validation = await validateDomainOwnership({
            domain,
            accountAddress,
            sdkInstance,
            requireSubregistry: true,
            errorFactory: errors.subregistry
        });

        if (isValidationError(validation)) {
            return validation.error;
        }

        const { domainDetails } = validation;

        const manifest = updateSubregistryIconManifest({
            sdkInstance,
            accountAddress,
            domainId: domainDetails.id,
            subregistryAddress: domainDetails.subregistry_component_address!,
            iconUrl
        });

        await sendTransaction({
            rdt,
            message: `Update icon for ${domain}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'SUBREGISTRY_ICON_UPDATED',
            details: `Icon URL for ${domain} has been updated to ${iconUrl}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.subregistry.generic({ domain, verbose: message }));
    }

}

/**
 * Update Subregistry Dapp Definition Dispatcher
 * 
 * Updates the dapp_definition metadata on the domain's DomainSubregistry component.
 * This allows domain owners to link their subregistry to a dApp definition account.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param domain - Domain name (e.g., "example.xrd")
 * @param dappDefinitionAddress - New dApp definition address
 * @param accountAddress - Account holding the domain
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchUpdateSubregistryDappDefinition({
    sdkInstance,
    rdt,
    domain,
    dappDefinitionAddress,
    accountAddress,
    callbacks
}: UpdateSubregistryDappDefinitionDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        const validation = await validateDomainOwnership({
            domain,
            accountAddress,
            sdkInstance,
            requireSubregistry: true,
            errorFactory: errors.subregistry
        });

        if (isValidationError(validation)) {
            return validation.error;
        }

        const { domainDetails } = validation;

        const manifest = updateSubregistryDappDefinitionManifest({
            sdkInstance,
            accountAddress,
            domainId: domainDetails.id,
            subregistryAddress: domainDetails.subregistry_component_address!,
            dappDefinitionAddress
        });

        await sendTransaction({
            rdt,
            message: `Update dApp definition for ${domain}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'SUBREGISTRY_DAPP_DEFINITION_UPDATED',
            details: `dApp definition for ${domain} has been updated to ${dappDefinitionAddress}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.subregistry.generic({ domain, verbose: message }));
    }

}

/**
 * Update Domain Resource Dispatcher
 * 
 * Updates the domain resource address on the domain's DomainSubregistry component.
 * This is used when the subregistry needs to recognize a new domain NFT resource
 * (e.g., after importing a domain from an accepted resource).
 * 
 * @param sdkInstance - RNS SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param domain - Domain name (e.g., "example.xrd")
 * @param newDomainResourceAddress - New domain resource address
 * @param accountAddress - Account holding the domain
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchUpdateDomainResource({
    sdkInstance,
    rdt,
    domain,
    newDomainResourceAddress,
    accountAddress,
    callbacks
}: UpdateDomainResourceDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        const validation = await validateDomainOwnership({
            domain,
            accountAddress,
            sdkInstance,
            requireSubregistry: true,
            errorFactory: errors.subregistry
        });

        if (isValidationError(validation)) {
            return validation.error;
        }

        const { domainDetails } = validation;

        const manifest = updateDomainResourceManifest({
            sdkInstance,
            accountAddress,
            domainId: domainDetails.id,
            subregistryAddress: domainDetails.subregistry_component_address!,
            newDomainResourceAddress
        });

        await sendTransaction({
            rdt,
            message: `Update domain resource for ${domain}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'DOMAIN_RESOURCE_UPDATED',
            details: `Domain resource for ${domain} has been updated to ${newDomainResourceAddress}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.subregistry.generic({ domain, verbose: message }));
    }

}

/**
 * Replace Subregistry Dispatcher
 * 
 * Spawns a new empty subregistry for the domain, replacing the current one.
 * The old subregistry is orphaned (no longer referenced by the domain NFT).
 * All existing records and subdomains in the old subregistry become inaccessible.
 * 
 * The old subregistry remains locked to the original domain name for security -
 * other domains cannot attach to or interact with it.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param domain - Domain name (e.g., "example.xrd")
 * @param accountAddress - Account holding the domain
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchReplaceSubregistry({
    sdkInstance,
    rdt,
    domain,
    accountAddress,
    callbacks
}: ReplaceSubregistryDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        const validation = await validateDomainOwnership({
            domain,
            accountAddress,
            sdkInstance,
            requireSubregistry: false,
            errorFactory: errors.subregistry
        });

        if (isValidationError(validation)) {
            return validation.error;
        }

        const { domainDetails } = validation;

        const manifest = replaceSubregistryManifest({
            sdkInstance,
            accountAddress,
            domainId: domainDetails.id
        });

        await sendTransaction({
            rdt,
            message: `Replace subregistry for ${domain}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'SUBREGISTRY_REPLACED',
            details: `Subregistry for ${domain} has been replaced with a new empty subregistry. All previous records and subdomains are now inaccessible.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.subregistry.generic({ domain, verbose: message }));
    }

}

