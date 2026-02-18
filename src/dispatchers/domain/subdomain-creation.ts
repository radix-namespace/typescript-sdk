import subdomainCreationManifest from "../../manifests/domains/subdomain-creation-manifest";

import errors from "../../mappings/errors";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";

import { SubdomainDispatcherPropsI } from "../../common/dispatcher.types";
import { TransactionFeedbackStackI, SdkTransactionResponseT } from "../../common/response.types";

/**
 * Subdomain Creation Dispatcher
 * 
 * Creates a subdomain by calling create_subdomain on the domain's DomainSubregistry component.
 * Subdomains are stored as records within the subregistry, not as separate NFTs.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param subdomain - Full subdomain name (e.g., "blog.example.xrd")
 * @param rootDomainDetails - Root domain details (must include subregistry address)
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account creating the subdomain
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchSubdomainCreation({
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

        // Optional: Add empty metadata or allow custom metadata in the future
        const metadata: Record<string, string> = {};

        const manifest = await subdomainCreationManifest({
            sdkInstance,
            accountAddress,
            domainId: rootDomainDetails.id,
            subregistryAddress: rootDomainDetails.subregistry_component_address,
            subdomainName,
            metadata
        });

        await sendTransaction({
            rdt,
            message: `Create subdomain ${subdomain}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'SUBDOMAIN_CREATION_SUCCESSFUL',
            details: `Subdomain ${subdomain} was successfully created.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.subdomain.creation({ subdomain, verbose: message }));
    }

}