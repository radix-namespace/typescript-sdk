import NamespaceSDK from "../..";

/**
 * Claim Reserved Domain Manifest
 * 
 * Claims a reserved domain from the Radix Namespace component.
 * Only the designated claimant account can claim a reserved domain.
 * The domain NFT is minted and sent to the claimant's account via the AccountLocker.
 * 
 * Reference: core-contracts/src/radix_namespace.rs - claim_reserved_domain
 * Signature: claim_reserved_domain(name: String, payment: Bucket, claimant_account: Global<Account>) -> Bucket
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Claimant account address (must match reserved claimant)
 * @param domainName - Reserved domain name to claim
 * @param paymentResource - Payment resource address (stablecoin)
 * @param paymentAmount - Bond amount required
 * @returns Transaction manifest string
 */
export default function claimReservedDomainManifest({
    sdkInstance,
    accountAddress,
    domainName,
    paymentResource,
    paymentAmount
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainName: string;
    paymentResource: string;
    paymentAmount: string;
}) {

    return `
        CALL_METHOD
            Address("${accountAddress}")
            "withdraw"
            Address("${paymentResource}")
            Decimal("${paymentAmount}");
        TAKE_FROM_WORKTOP
            Address("${paymentResource}")
            Decimal("${paymentAmount}")
            Bucket("payment_bucket");
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.rootAddr}")
            "claim_reserved_domain"
            "${domainName}"
            Bucket("payment_bucket")
            Address("${accountAddress}");
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
    `;

}
