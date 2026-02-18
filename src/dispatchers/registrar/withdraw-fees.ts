import withdrawRegistrarFeesManifest from "../../manifests/registrar/registrar-withdraw-fees-manifest";
import { requestRegistrarFeeBalances } from "../../requests/registrar/fee-balances";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";

import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";
import { EventCallbacksI } from "../../common/transaction.types";
import { RadixDappToolkit } from "@radixdlt/radix-dapp-toolkit";
import NamespaceSDK from "../..";

export interface WithdrawRegistrarFeesPropsI {
    sdkInstance: NamespaceSDK;
    registrarId: string;
    resourceAddress?: string;
    accountAddress: string;
    rdt: RadixDappToolkit;
    callbacks?: EventCallbacksI;
}

/**
 * Withdraw Registrar Fees Dispatcher
 * 
 * Withdraws accumulated fees for a registrar.
 * 
 * If `resourceAddress` is provided, withdraws only from that resource vault.
 * If omitted, auto-discovers all fee vaults and withdraws from all in a single transaction.
 * 
 * The caller must hold the registrar badge to authorize the withdrawal.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param registrarId - Registrar badge ID
 * @param resourceAddress - Optional: specific resource to withdraw (default: all)
 * @param accountAddress - Account holding the registrar badge
 * @param rdt - Radix dApp Toolkit instance
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchRegistrarWithdrawFees({
    sdkInstance,
    registrarId,
    resourceAddress,
    accountAddress,
    rdt,
    callbacks
}: WithdrawRegistrarFeesPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        let resourceAddresses: string[];

        if (resourceAddress) {
            // Use the specific resource address provided
            resourceAddresses = [resourceAddress];
        } else {
            // Auto-discover all fee vaults for this registrar
            const feeBalances = await requestRegistrarFeeBalances(registrarId, { sdkInstance });

            if (feeBalances instanceof Error) {
                return transactionError({
                    code: 'REGISTRAR_WITHDRAWAL_ERROR',
                    error: 'Failed to discover fee vaults',
                    verbose: `Could not fetch fee balances for registrar ${registrarId}: ${feeBalances.message}`
                });
            }

            // Filter to only vaults with non-zero balances
            resourceAddresses = feeBalances.fees
                .filter(fee => !fee.amount.isZero())
                .map(fee => fee.resource_address);

            if (resourceAddresses.length === 0) {
                return transactionError({
                    code: 'REGISTRAR_NO_FEES_AVAILABLE',
                    error: 'No fees available to withdraw',
                    verbose: `Registrar ${registrarId} has no accumulated fees in any vault`
                });
            }
        }

        const manifest = await withdrawRegistrarFeesManifest({
            sdkInstance,
            accountAddress,
            registrarBadgeResource: sdkInstance.entities.rnsCore.registrarBadgeResource,
            registrarId,
            resourceAddresses
        });

        await sendTransaction({
            rdt,
            message: `Withdraw registrar fees for registrar: ${registrarId}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        const resourceCount = resourceAddresses.length;
        const resourcesLabel = resourceCount === 1 ? '1 resource' : `${resourceCount} resources`;

        return transactionResponse({
            code: 'REGISTRAR_WITHDRAWAL_SUCCESSFUL',
            details: `Successfully withdrew fees for registrar ${registrarId} from ${resourcesLabel}`
        });

    } catch (error) {

        return transactionError({
            code: 'REGISTRAR_WITHDRAWAL_ERROR',
            error: 'Failed to withdraw registrar fees',
            verbose: `Registrar ID: ${registrarId}, Account: ${accountAddress}. Error: ${error instanceof Error ? error.message : String(error)}`
        });

    }

}
