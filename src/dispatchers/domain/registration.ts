import registerDomainManifest from "../../manifests/domains/domain-registration-manifest";

import errors from "../../mappings/errors";
import { sendTransaction } from "../../utils/transaction.utils";
import { getCostBreakdown } from "../../utils/pricing.utils";
import { getAccountBondBalances, checkAccountBondAffordability } from "../../utils/balance.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";
import { requestRegistrarDetails } from "../../requests/registrar/details";

import { RegistrationDispatcherPropsI } from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

/**
 * Domain Registration Dispatcher
 * 
 * Registers and bonds a domain using the Radix Namespace component
 * 
 * @param sdkInstance - RNS SDK instance
 * @param domain - Domain name to register
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account registering the domain
 * @param paymentResource - Optional stablecoin resource address
 * @param registrarId - Registrar badge ID (required)
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchDomainRegistration({
    sdkInstance,
    domain,
    rdt,
    accountAddress,
    paymentResource,
    registrarId,
    callbacks
}: RegistrationDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        // Validate required registrar ID
        if (!registrarId) {
            return transactionError(errors.registration.generic({ 
                domain, 
                verbose: "Registrar ID is required for domain registration" 
            }));
        }

        // Fetch registrar details to get fee percentage
        const registrarDetails = await requestRegistrarDetails({
            registrarId,
            sdkInstance
        });

        if (registrarDetails instanceof Error) {
            return transactionError(errors.registration.generic({ 
                domain, 
                verbose: `Failed to fetch registrar details: ${registrarDetails.message}` 
            }));
        }

        // Use provided payment resource or default to first accepted resource
        const selectedPaymentResource = paymentResource || sdkInstance.entities.rnsCore.acceptedPaymentResources[0];

        if (!selectedPaymentResource) {
            return transactionError(errors.registration.generic({ 
                domain, 
                verbose: "No accepted payment resources configured in Radix Namespace" 
            }));
        }

        // Get full cost breakdown using shared utility
        const costBreakdown = getCostBreakdown(
            domain,
            sdkInstance.entities.rnsCore.priceLadder,
            registrarDetails.fee_percentage,
            registrarId,
            registrarDetails.name,
            selectedPaymentResource
        );

        // Pre-check if user has sufficient balance before attempting transaction
        const balances = await getAccountBondBalances(
            accountAddress,
            sdkInstance.entities.rnsCore.acceptedPaymentResources,
            { sdkInstance }
        );

        const affordabilityCheck = checkAccountBondAffordability(balances.balances, costBreakdown.totalAmount);

        if (affordabilityCheck.sufficientBalances.length === 0) {
            const shortfalls = affordabilityCheck.insufficientBalances
                .map(r => `${r.resource.name || r.resource.address}: have ${r.balance}, need ${affordabilityCheck.requiredAmount} (short ${r.shortfall})`)
                .join('; ');
            
            return transactionError(errors.balance.insufficientFunds({ 
                requiredAmount: costBreakdown.totalAmount,
                verbose: `None of your accepted payment tokens have sufficient balance. ${shortfalls}`
            }));
        }

        const manifest = await registerDomainManifest({
            sdkInstance,
            domain,
            accountAddress,
            paymentResource: selectedPaymentResource,
            bondAmount: costBreakdown.bondAmount,
            registrarFee: costBreakdown.registrarFee,
            registrarId
        });

        await sendTransaction({
            rdt,
            message: `Register and bond ${domain}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'REGISTRATION_SUCCESSFUL',
            details: `${domain} was successfully registered and bonded. Bond: ${costBreakdown.bondAmount}, Registrar fee: ${costBreakdown.registrarFee}, Total: ${costBreakdown.totalAmount}`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.registration.generic({ domain, verbose: message }));
    }

}