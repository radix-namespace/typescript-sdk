import { SendTransactionI } from "../common/transaction.types";
import { parseErrorMessage } from "./error.utils";

export async function sendTransaction({ manifest, rdt, transaction, callbacks, message }: SendTransactionI): Promise<boolean> {

    if (!rdt) {
        if (callbacks?.onFail) callbacks.onFail({ manifest });
        throw new Error('Wallet connection not initialized. Please ensure the dApp is properly connected.');
    }

    if (callbacks?.onInit) callbacks.onInit({ manifest });

    const result = await rdt?.walletApi.sendTransaction({
        transactionManifest: manifest,
        message
    });

    if (!result || result.isErr()) {
        if (callbacks?.onFail) callbacks.onFail(result);
        
        if (result?.isErr()) {
            const rawError = result.error.message || result.error.error || JSON.stringify(result.error);
            throw new Error(parseErrorMessage(rawError));
        }

        throw new Error('Transaction was rejected or failed to submit.');
    }

    if (callbacks?.onAppApproved) callbacks.onAppApproved({ manifest });
    const intentHash = result.value.transactionIntentHash;

    const transactionStatus = await transaction.getStatus(intentHash);
    if (callbacks?.onIntentReceipt) callbacks.onIntentReceipt({ manifest, intentHash });

    const getCommitReceipt = await transaction.getCommittedDetails(intentHash);
    if (callbacks?.onSuccess) callbacks.onSuccess(getCommitReceipt);

    return true;

}