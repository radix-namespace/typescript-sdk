import unbondDomainManifest from "../../manifests/domains/unbond-domain-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";
import { validateDomainOwnership, isValidationError } from "../../utils/validation.utils";
import errors from "../../mappings/errors";

import { UnbondDispatcherPropsI } from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

/**
 * Domain Unbond Dispatcher
 * 
 * Unbonds a domain and withdraws the bonded USD stable value.
 * The domain NFT is deposited into the RNS Core component and the bond is returned.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param domain - Domain name to unbond
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account holding the domain
 * @param preserveSubregistryData - Whether to preserve subregistry data
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchDomainUnbond({
    sdkInstance,
    domain,
    rdt,
    accountAddress,
    preserveSubregistryData = false,
    callbacks
}: UnbondDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        const validation = await validateDomainOwnership({
            domain,
            accountAddress,
            sdkInstance,
            requireSubregistry: false,
            errorFactory: errors.unbond
        });

        if (isValidationError(validation)) {
            return validation.error;
        }

        const { domainDetails } = validation;

        const manifest = await unbondDomainManifest({
            sdkInstance,
            accountAddress,
            domainId: domainDetails.id,
            preserveSubregistryData
        });

        const unbondMessage = preserveSubregistryData 
            ? `Unbond ${domain} (preserving records)`
            : `Unbond ${domain}`;

        await sendTransaction({
            rdt,
            message: unbondMessage,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        const successDetails = preserveSubregistryData
            ? `${domain} was successfully unbonded. The bonded value has been returned to your account. Subregistry data has been preserved.`
            : `${domain} was successfully unbonded. The bonded value has been returned to your account. Subregistry data has been cleared.`;

        return transactionResponse({
            code: 'UNBOND_SUCCESSFUL',
            details: successDetails
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.unbond.generic({ domain, verbose: message }));
    }

}

