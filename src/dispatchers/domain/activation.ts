import activateDomainManifest from "../../manifests/domains/domain-activation-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";
import errors from "../../mappings/errors";

import { ActivationDispatcherPropsI } from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

/**
 * Domain Activation Dispatcher
 * 
 * Activates domain ownership by setting the current_activated_owner field on the Domain NFT.
 * This is required before the domain owner can perform actions like setting records or creating subdomains.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param domainDetails - Domain details (must include NFT ID)
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account to set as activated owner
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchDomainActivation({
    sdkInstance,
    domainDetails,
    rdt,
    accountAddress,
    callbacks
}: ActivationDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        // Check if domain is already activated for this account
        if (domainDetails.current_activated_owner === accountAddress) {
            return transactionResponse({
                code: 'ACTIVATION_NOT_NEEDED',
                details: `${domainDetails.name} is already activated for ${accountAddress}.`
            });
        }

        const manifest = await activateDomainManifest({
            sdkInstance,
            domainId: domainDetails.id,
            accountAddress
        });

        await sendTransaction({
            rdt,
            message: `Activate ownership of ${domainDetails.name}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'ACTIVATION_SUCCESSFUL',
            details: `${domainDetails.name} ownership was successfully activated for ${accountAddress}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.activation.generic({ domain: domainDetails.name, verbose: message }));
    }

}