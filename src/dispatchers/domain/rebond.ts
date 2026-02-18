import rebondDomainManifest from "../../manifests/domains/rebond-domain-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";
import { validateDomainOwnership, isValidationError } from "../../utils/validation.utils";
import { getDomainPrice } from "../../utils/pricing.utils";
import errors from "../../mappings/errors";

import { RebondDispatcherPropsI } from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

/**
 * Domain Rebond Dispatcher
 * 
 * Rebonds a domain with a different accepted payment resource.
 * Returns the old bond and any change from the new payment.
 * 
 * This allows users to swap their bond resource (e.g., from fUSD to sUSD)
 * without losing their domain.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param domain - Domain name to rebond
 * @param accountAddress - Account holding the domain
 * @param newPaymentResource - New payment resource to bond with
 * @param rdt - Radix dApp Toolkit instance
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchDomainRebond({
    sdkInstance,
    domain,
    accountAddress,
    newPaymentResource,
    rdt,
    callbacks
}: RebondDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        // Validate new payment resource is accepted
        const acceptedResources = sdkInstance.entities.rnsCore.acceptedPaymentResources;
        if (!acceptedResources.includes(newPaymentResource)) {
            return transactionError(errors.rebond.invalidResource({
                domain,
                resource: newPaymentResource,
                verbose: `Resource ${newPaymentResource} is not an accepted payment resource. Accepted: ${acceptedResources.join(', ')}`
            }));
        }

        // Validate domain ownership
        const validation = await validateDomainOwnership({
            domain,
            accountAddress,
            sdkInstance,
            requireSubregistry: false,
            errorFactory: errors.rebond
        });

        if (isValidationError(validation)) {
            return validation.error;
        }

        const { domainDetails } = validation;

        // Check if already bonded with the same resource
        if (domainDetails.bond.resource.address === newPaymentResource) {
            return transactionError(errors.rebond.sameResource({
                domain,
                resource: newPaymentResource,
                verbose: `Domain is already bonded with ${newPaymentResource}. No rebond necessary.`
            }));
        }

        // Calculate required payment amount from price ladder
        const requiredAmount = getDomainPrice(domain, sdkInstance.entities.rnsCore.priceLadder);

        const manifest = await rebondDomainManifest({
            sdkInstance,
            accountAddress,
            domainId: domainDetails.id,
            newPaymentResource,
            newPaymentAmount: requiredAmount
        });

        await sendTransaction({
            rdt,
            message: `Rebond ${domain}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'REBOND_SUCCESSFUL',
            details: `${domain} was successfully rebonded. Old bond (${domainDetails.bond.amount} ${domainDetails.bond.resource.symbol || domainDetails.bond.resource.address}) has been returned to your account. New bond: ${requiredAmount} of the new resource.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.rebond.generic({ domain, verbose: message }));
    }

}
