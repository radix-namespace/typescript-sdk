import burnRegistrarBadgeManifest from "../../manifests/registrar/registrar-burn-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";

import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";
import { EventCallbacksI } from "../../common/transaction.types";
import { RadixDappToolkit } from "@radixdlt/radix-dapp-toolkit";
import NamespaceSDK from "../..";

export interface BurnRegistrarBadgePropsI {
    sdkInstance: NamespaceSDK;
    registrarId: string;
    accountAddress: string;
    rdt: RadixDappToolkit;
    callbacks?: EventCallbacksI;
}

/**
 * Burn Registrar Badge Dispatcher
 * 
 * Permanently disables a registrar service by burning the registrar badge.
 * 
 * Note: This action is IRREVERSIBLE. Any unwithdrawn fees will be
 * permanently locked in the contract. Always withdraw all fees before burning.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param registrarId - Registrar badge ID to burn
 * @param accountAddress - Account holding the registrar badge
 * @param rdt - Radix dApp Toolkit instance
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchRegistrarBurn({
    sdkInstance,
    registrarId,
    accountAddress,
    rdt,
    callbacks
}: BurnRegistrarBadgePropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        const manifest = await burnRegistrarBadgeManifest({
            sdkInstance,
            accountAddress,
            registrarBadgeResource: sdkInstance.entities.rnsCore.registrarBadgeResource,
            registrarId
        });

        await sendTransaction({
            rdt,
            message: `⚠️ Burn registrar badge: ${registrarId} (IRREVERSIBLE)`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'REGISTRAR_BURN_SUCCESSFUL',
            details: `Registrar badge ${registrarId} has been permanently burned. Service disabled.`
        });

    } catch (error) {

        return transactionError({
            code: 'REGISTRAR_BURN_ERROR',
            error: 'Failed to burn registrar badge',
            verbose: `Registrar ID: ${registrarId}, Account: ${accountAddress}. Error: ${error instanceof Error ? error.message : String(error)}`
        });

    }

}

