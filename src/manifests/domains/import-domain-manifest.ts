import NamespaceSDK from "../..";

/**
 * Import Accepted Domain Manifest
 * 
 * Imports an accepted domain into the Radix Namespace system. The import domain NFT
 * stays in the user's account (only a proof is presented). A new domain NFT is
 * issued with a dedicated subregistry component.
 * 
 * Note: Imports have no registrar fees - only the bond amount is required.
 * 
 * Reference: core-contracts/src/radix_namespace.rs - import_accepted_domain
 * Signature: import_accepted_domain(import_domain_proof: NonFungibleProof, payment: Bucket, claiming_account: Global<Account>) -> (NonFungibleBucket, Bucket)
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address holding the import domain
 * @param importDomainId - Import domain NFT ID (NonFungibleLocalId)
 * @param paymentResource - Payment resource address (stablecoin)
 * @param paymentAmount - Bond amount required
 * @returns Transaction manifest string
 */
export default async function importDomainManifest({
    sdkInstance,
    accountAddress,
    importDomainId,
    paymentResource,
    paymentAmount
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    importDomainId: string;
    paymentResource: string;
    paymentAmount: string;
}) {

    return `
        CALL_METHOD
            Address("${accountAddress}")
            "create_proof_of_non_fungibles"
            Address("${sdkInstance.entities.rnsCore.importDomainResource}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${importDomainId}")
            );
        POP_FROM_AUTH_ZONE
            Proof("import_domain_proof");
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
            "import_accepted_domain"
            Proof("import_domain_proof")
            Bucket("payment_bucket")
            Address("${accountAddress}");
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
        DROP_ALL_PROOFS;
    `;

}
