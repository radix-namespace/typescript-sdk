import NamespaceSDK from "../..";

/**
 * Claim Domain NFTs from Account Locker Manifest
 * 
 * Claims domain NFTs that were stored in the Radix Namespace AccountLocker
 * (e.g., from a reserved domain claim where direct deposit was rejected).
 * 
 * The AccountLocker verifies the caller has owner powers over the claimant
 * account by reading and asserting against the account's owner role.
 * 
 * Two modes:
 * 1. Specific IDs: Claims specific domain NFTs by NonFungibleLocalId
 * 2. By amount: Claims up to `amount` domain NFTs (useful for "claim all")
 * 
 * Reference: https://docs.radixdlt.com/docs/locker - claim / claim_non_fungibles
 */

/**
 * Generate manifest to claim specific domain NFTs from the locker by ID
 */
export function claimNonFungiblesFromLockerManifest({
    sdkInstance,
    accountAddress,
    nftIds
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    nftIds: string[];
}) {

    const idsArray = nftIds.map(id => `NonFungibleLocalId("${id}")`).join(',\n                ');

    return `
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.accountLocker}")
            "claim_non_fungibles"
            Address("${accountAddress}")
            Address("${sdkInstance.entities.rnsCore.domainResource}")
            Array<NonFungibleLocalId>(
                ${idsArray}
            );
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
    `;

}

/**
 * Generate manifest to claim domain NFTs from the locker by amount
 * Useful for claiming all stored NFTs without knowing specific IDs
 */
export function claimFromLockerByAmountManifest({
    sdkInstance,
    accountAddress,
    amount
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    amount: number;
}) {

    return `
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.accountLocker}")
            "claim"
            Address("${accountAddress}")
            Address("${sdkInstance.entities.rnsCore.domainResource}")
            Decimal("${amount}");
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
    `;

}
