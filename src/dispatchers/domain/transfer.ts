import transferDomainManifest from "../../manifests/domains/transfer-domain-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";
import errors from "../../mappings/errors";

import { TransferDispatcherPropsI } from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

/**
 * Domain Transfer Dispatcher
 * 
 * Transfers a domain NFT to a new owner.
 * Optionally spawns a new subregistry for a clean transfer (empty records/subdomains).
 * 
 * @param sdkInstance - RNS SDK instance
 * @param domain - Domain name to transfer
 * @param rdt - Radix dApp Toolkit instance
 * @param fromAddress - Current owner's account address
 * @param destinationAddress - New owner's account address
 * @param preferences - Optional: transfer preferences (cleanTransfer)
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchDomainTransfer({
    sdkInstance,
    domain,
    rdt,
    fromAddress,
    destinationAddress,
    preferences,
    callbacks
}: TransferDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        const cleanTransfer = preferences?.cleanTransfer ?? false;

        const manifest = await transferDomainManifest({
            sdkInstance,
            domain,
            fromAddress,
            destinationAddress,
            cleanTransfer
        });

        const transferMessage = cleanTransfer 
            ? `Transfer ${domain} (clean slate)`
            : `Transfer ${domain}`;

        await sendTransaction({
            rdt,
            message: transferMessage,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        const successMessage = cleanTransfer
            ? `${domain} was successfully transferred with a new subregistry (all records and subdomains removed).`
            : `${domain} was successfully transferred with existing records and subdomains.`;

        return transactionResponse({
            code: 'TRANSFER_SUCCESSFUL',
            details: successMessage
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.transfer.generic({ domain, verbose: message }));
    }

}