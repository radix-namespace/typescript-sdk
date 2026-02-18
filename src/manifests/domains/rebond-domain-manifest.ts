import NamespaceSDK from "../..";

/**
 * Domain Rebond Manifest
 * 
 * Rebonds a domain with a different accepted payment resource.
 * Returns the old bond and any change from the new payment.
 * 
 * This allows users to swap their bond resource (e.g., from fUSD to sUSD)
 * without losing their domain.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address holding the domain
 * @param domainId - Domain NFT ID (NonFungibleLocalId)
 * @param newPaymentResource - New payment resource address to bond with
 * @param newPaymentAmount - Amount of new payment resource to provide
 * @returns Transaction manifest string
 */
export default async function rebondDomainManifest({
    sdkInstance,
    accountAddress,
    domainId,
    newPaymentResource,
    newPaymentAmount
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    newPaymentResource: string;
    newPaymentAmount: string;
}) {

    return `
        CALL_METHOD
            Address("${accountAddress}")
            "create_proof_of_non_fungibles"
            Address("${sdkInstance.entities.rnsCore.domainResource}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${domainId}")
            );
        POP_FROM_AUTH_ZONE
            Proof("domain_proof");
        CALL_METHOD
            Address("${accountAddress}")
            "withdraw"
            Address("${newPaymentResource}")
            Decimal("${newPaymentAmount}");
        TAKE_FROM_WORKTOP
            Address("${newPaymentResource}")
            Decimal("${newPaymentAmount}")
            Bucket("payment_bucket");
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.rootAddr}")
            "rebond"
            Proof("domain_proof")
            Bucket("payment_bucket");
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
        DROP_ALL_PROOFS;
    `;

}
