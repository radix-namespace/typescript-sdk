import updateRegistrarMetadataManifest from "../../manifests/registrar/registrar-update-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";

import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";
import { EventCallbacksI } from "../../common/transaction.types";
import { RadixDappToolkit } from "@radixdlt/radix-dapp-toolkit";
import NamespaceSDK from "../..";
import Decimal from "decimal.js";

export interface UpdateRegistrarPropsI {
    sdkInstance: NamespaceSDK;
    registrarId: string;
    accountAddress: string;
    name?: string;
    iconUrl?: string;
    websiteUrl?: string;
    feePercentage?: Decimal;
    rdt: RadixDappToolkit;
    callbacks?: EventCallbacksI;
}

/**
 * Update Registrar Metadata Dispatcher
 * 
 * Updates business information for an existing registrar.
 * All fields are optional - only provided fields will be updated.
 * 
 * Validation:
 * - If name provided: 1-100 characters
 * - If feePercentage provided: >= 0
 * - Requires registrar badge ownership proof
 * 
 * @param sdkInstance - RNS SDK instance
 * @param registrarId - Registrar badge ID to update
 * @param accountAddress - Account holding the registrar badge
 * @param name - Optional new business name
 * @param iconUrl - Optional new icon URL
 * @param websiteUrl - Optional new website URL
 * @param feePercentage - Optional new fee percentage
 * @param rdt - Radix dApp Toolkit instance
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchRegistrarUpdate({
    sdkInstance,
    registrarId,
    accountAddress,
    name,
    iconUrl,
    websiteUrl,
    feePercentage,
    rdt,
    callbacks
}: UpdateRegistrarPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        // Ensure feePercentage is a Decimal if provided (handle number or string inputs)
        const feePercentageDecimal = feePercentage !== undefined
            ? (feePercentage instanceof Decimal ? feePercentage : new Decimal(feePercentage))
            : undefined;

        // Validate at least one field is being updated
        if (!name && !iconUrl && !websiteUrl && feePercentageDecimal === undefined) {
            return transactionError({
                code: 'VALIDATION_ERROR',
                error: 'At least one field must be provided for update',
                verbose: `Registrar ID: ${registrarId}, Account: ${accountAddress}. All update fields are undefined.`
            });
        }

        // Validate name length if provided
        if (name !== undefined && (name.length < 1 || name.length > 100)) {
            return transactionError({
                code: 'VALIDATION_ERROR',
                error: 'Registrar name must be between 1 and 100 characters',
                verbose: `Registrar ID: ${registrarId}, Provided name: "${name}" (length: ${name.length})`
            });
        }

        // Validate fee percentage if provided
        if (feePercentageDecimal !== undefined && feePercentageDecimal.lessThan(0)) {
            return transactionError({
                code: 'VALIDATION_ERROR',
                error: 'Fee percentage must be >= 0',
                verbose: `Registrar ID: ${registrarId}, Provided fee percentage: ${feePercentageDecimal.toString()}`
            });
        }

        const manifest = await updateRegistrarMetadataManifest({
            sdkInstance,
            accountAddress,
            registrarBadgeResource: sdkInstance.entities.rnsCore.registrarBadgeResource,
            registrarId,
            name,
            iconUrl,
            websiteUrl,
            feePercentage: feePercentageDecimal?.toString()
        });

        await sendTransaction({
            rdt,
            message: `Update registrar metadata: ${registrarId}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
            });

        const updatedFields = [];
        if (name) updatedFields.push(`name="${name}"`);
        if (iconUrl) updatedFields.push('icon');
        if (websiteUrl) updatedFields.push('website');
        if (feePercentageDecimal !== undefined) updatedFields.push(`fee=${feePercentageDecimal}%`);

        return transactionResponse({
            code: 'REGISTRAR_UPDATE_SUCCESSFUL',
            details: `Successfully updated registrar: ${updatedFields.join(', ')}`
        });

    } catch (error) {

        return transactionError({
            code: 'REGISTRAR_UPDATE_ERROR',
            error: 'Failed to update registrar metadata',
            verbose: `Registrar ID: ${registrarId}, Account: ${accountAddress}, Fields: ${JSON.stringify({ name, iconUrl, websiteUrl, feePercentage })}. Error: ${error instanceof Error ? error.message : String(error)}`
        });

    }

}

