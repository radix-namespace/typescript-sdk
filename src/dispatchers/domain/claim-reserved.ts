import claimReservedDomainManifest from "../../manifests/domains/claim-reserved-domain-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";
import { getDomainPrice } from "../../utils/pricing.utils";
import { getAccountBondBalances, checkAccountBondAffordability } from "../../utils/balance.utils";
import errors from "../../mappings/errors";

import { ClaimReservedDomainDispatcherPropsI } from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

/**
 * Claim Reserved Domain Dispatcher
 * 
 * Claims a reserved domain for the designated claimant account.
 * Only accounts that have been assigned a reserved domain can claim it.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param domain - Reserved domain name to claim
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Claimant account address
 * @param paymentResource - Optional payment resource (defaults to first accepted)
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchClaimReservedDomain({
    sdkInstance,
    domain,
    rdt,
    accountAddress,
    paymentResource,
    callbacks
}: ClaimReservedDomainDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        // Determine payment resource (default to first accepted)
        const selectedPaymentResource = paymentResource 
            || sdkInstance.entities.rnsCore.acceptedPaymentResources[0];

        if (!selectedPaymentResource) {
            return transactionError(errors.registration.generic({ 
                domain, 
                verbose: "No accepted payment resources configured" 
            }));
        }

        // Calculate bond amount from price ladder (no registrar fees for reserved claims)
        const bondAmount = getDomainPrice(domain, sdkInstance.entities.rnsCore.priceLadder);

        // Pre-check if user has sufficient balance
        const balances = await getAccountBondBalances(
            accountAddress,
            sdkInstance.entities.rnsCore.acceptedPaymentResources,
            { sdkInstance }
        );

        const affordabilityCheck = checkAccountBondAffordability(balances.balances, bondAmount);

        if (affordabilityCheck.sufficientBalances.length === 0) {
            const shortfalls = affordabilityCheck.insufficientBalances
                .map(r => `${r.resource.name || r.resource.address}: have ${r.balance}, need ${bondAmount} (short ${r.shortfall})`)
                .join('; ');
            
            return transactionError(errors.balance.insufficientFunds({ 
                requiredAmount: bondAmount,
                verbose: `Insufficient balance for reserved domain claim bond. ${shortfalls}`
            }));
        }

        const manifest = claimReservedDomainManifest({
            sdkInstance,
            accountAddress,
            domainName: domain,
            paymentResource: selectedPaymentResource,
            paymentAmount: bondAmount
        });

        await sendTransaction({
            rdt,
            message: `Claim reserved domain ${domain}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'CLAIM_RESERVED_SUCCESSFUL',
            details: `${domain} was successfully claimed. Bond amount: ${bondAmount} (no registrar fees).`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.registration.generic({ domain, verbose: message }));
    }

}
