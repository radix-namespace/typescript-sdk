import subdomainDeletionManifest from "../../manifests/domains/subdomain-deletion-manifest";

import errors from "../../mappings/errors";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";

import { SubdomainDispatcherPropsI } from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

/**
 * Subdomain Deletion Dispatcher
 * 
 * Deletes a subdomain by calling delete_subdomain on the domain's DomainSubregistry component.
 * This removes the subdomain record from the subregistry's KeyValueStore.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param subdomain - Full subdomain name (e.g., "blog.example.xrd")
 * @param rootDomainDetails - Root domain details (must include subregistry address)
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account deleting the subdomain
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchSubdomainDeletion({
    sdkInstance,
    subdomain,
    rootDomainDetails,
    rdt,
    accountAddress,
    callbacks
}: SubdomainDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        // Extract subdomain name (e.g., "blog" from "blog.example.xrd")
        const subdomainName = subdomain.split('.')[0];

        // Check if subregistry exists
        if (!rootDomainDetails.subregistry_component_address) {
            return transactionError(errors.subdomain.generic({ 
                subdomain, 
                verbose: "Root domain does not have a subregistry component address" 
            }));
        }

        const manifest = await subdomainDeletionManifest({
            sdkInstance,
            accountAddress,
            domainId: rootDomainDetails.id,
            subregistryAddress: rootDomainDetails.subregistry_component_address,
            subdomainName
        });

        await sendTransaction({
            rdt,
            message: `Delete subdomain ${subdomain}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'SUBDOMAIN_DELETION_SUCCESSFUL',
            details: `Subdomain ${subdomain} was successfully deleted.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.subdomain.deletion({ subdomain, verbose: message }));
    }

}