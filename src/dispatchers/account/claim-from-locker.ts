import { claimNonFungiblesFromLockerManifest, claimFromLockerByAmountManifest } from "../../manifests/account/claim-from-locker-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";
import errors from "../../mappings/errors";

import { ClaimFromLockerDispatcherPropsI } from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

/**
 * Claim Domain NFTs from Account Locker Dispatcher
 * 
 * Claims domain NFTs that are stored in the Radix Namespace AccountLocker.
 * This happens when a reserved domain is claimed but the direct deposit to the
 * claimant's account was rejected (e.g., due to account deposit rules).
 * 
 * The AccountLocker verifies account ownership by asserting against the
 * claimant account's owner role.
 * 
 * Two modes:
 * 1. If `nftIds` is provided: Claims those specific domain NFTs using claim_non_fungibles
 * 2. If `nftIds` is not provided: Claims up to 100 domain NFTs using claim by amount
 * 
 * @param sdkInstance - SDK instance
 * @param accountAddress - Account to claim NFTs for (must be the stored claimant)
 * @param rdt - Radix dApp Toolkit instance
 * @param nftIds - Optional specific NFT IDs to claim
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchClaimFromLocker({
    sdkInstance,
    accountAddress,
    rdt,
    nftIds,
    callbacks
}: ClaimFromLockerDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        if (!sdkInstance.entities.rnsCore.accountLocker) {
            return transactionError(errors.locker.noLocker({
                verbose: "AccountLocker address not available. The Radix Namespace component may not have been fully expanded."
            }));
        }

        let manifest: string;

        if (nftIds && nftIds.length > 0) {
            manifest = claimNonFungiblesFromLockerManifest({
                sdkInstance,
                accountAddress,
                nftIds
            });
        } else {
            // Claim up to 100 NFTs by amount (covers most cases)
            manifest = claimFromLockerByAmountManifest({
                sdkInstance,
                accountAddress,
                amount: 100
            });
        }

        await sendTransaction({
            rdt,
            message: `Claim domain NFTs from locker`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        const claimedDesc = nftIds && nftIds.length > 0
            ? `${nftIds.length} specific domain NFT(s)`
            : 'domain NFTs';

        return transactionResponse({
            code: 'LOCKER_CLAIM_SUCCESSFUL',
            details: `Successfully claimed ${claimedDesc} from the AccountLocker.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.locker.claimFailed({ verbose: message }));
    }

}
