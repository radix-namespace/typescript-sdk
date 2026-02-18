import registerAsRegistrarManifest from "../../manifests/registrar/registrar-registration-manifest";

import errors from "../../mappings/errors";
import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";

import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";
import { EventCallbacksI } from "../../common/transaction.types";
import { RadixDappToolkit } from "@radixdlt/radix-dapp-toolkit";
import NamespaceSDK from "../..";
import Decimal from "decimal.js";

export interface RegisterAsRegistrarPropsI {
    sdkInstance: NamespaceSDK;
    name: string;
    iconUrl: string;
    websiteUrl: string;
    feePercentage: Decimal;
    accountAddress: string;
    rdt: RadixDappToolkit;
    callbacks?: EventCallbacksI;
}

/**
 * Registrar Registration Dispatcher
 * 
 * Registers a new domain service provider (registrar) and mints a registrar badge NFT.
 * 
 * Validation:
 * - Name: 1-100 characters
 * - Fee percentage: >= 0 (no upper limit)
 * - Icon URL and Website URL: valid strings
 * 
 * @param sdkInstance - RNS SDK instance
 * @param name - Business or service name
 * @param iconUrl - Public URL to registrar logo/icon
 * @param websiteUrl - Public URL to registrar's website
 * @param feePercentage - Fee percentage as Decimal (1 = 1%, 0.5 = 0.5%)
 * @param accountAddress - Account to receive the registrar badge
 * @param rdt - Radix dApp Toolkit instance
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchRegistrarRegistration({
    sdkInstance,
    name,
    iconUrl,
    websiteUrl,
    feePercentage,
    accountAddress,
    rdt,
    callbacks
}: RegisterAsRegistrarPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        // Ensure feePercentage is a Decimal (handle number or string inputs)
        const feePercentageDecimal = feePercentage instanceof Decimal 
            ? feePercentage 
            : new Decimal(feePercentage);

        // Validate name length
        if (!name || name.length < 1 || name.length > 100) {
            return transactionError({
                code: 'VALIDATION_ERROR',
                error: 'Registrar name must be between 1 and 100 characters',
                verbose: `Provided name: "${name}" (length: ${name?.length || 0})`
            });
        }

        // Validate URLs are provided
        if (!iconUrl || !websiteUrl) {
            return transactionError({
                code: 'VALIDATION_ERROR',
                error: 'Icon URL and website URL are required',
                verbose: `Icon URL: "${iconUrl || 'not provided'}", Website URL: "${websiteUrl || 'not provided'}"`
            });
        }

        // Validate fee percentage is non-negative
        if (feePercentageDecimal.lessThan(0)) {
            return transactionError({
                code: 'VALIDATION_ERROR',
                error: 'Fee percentage must be >= 0',
                verbose: `Provided fee percentage: ${feePercentageDecimal.toString()}`
            });
        }

        const manifest = await registerAsRegistrarManifest({
            sdkInstance,
            name,
            iconUrl,
            websiteUrl,
            feePercentage: feePercentageDecimal.toString(),
            accountAddress
        });

        await sendTransaction({
            rdt,
            message: `Register as registrar: ${name}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
            });

        return transactionResponse({
            code: 'REGISTRAR_REGISTRATION_SUCCESSFUL',
            details: `Successfully registered as registrar: ${name} with ${feePercentageDecimal}% fee`
        });

    } catch (error) {

        return transactionError({
            code: 'REGISTRAR_REGISTRATION_ERROR',
            error: 'Failed to register as registrar',
            verbose: `Name: "${name}", Account: ${accountAddress}, Fee: ${feePercentage}. Error: ${error instanceof Error ? error.message : String(error)}`
        });

    }

}

