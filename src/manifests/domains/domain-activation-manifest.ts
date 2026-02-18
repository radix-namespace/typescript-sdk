import NamespaceSDK from "../..";

/**
 * Domain Activation Manifest
 * 
 * Activates domain ownership for the current NFT holder by calling activate_domain_ownership
 * on the Radix Namespace component. This sets the current_activated_owner field on the Domain NFT.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address to set as activated owner
 * @param domainId - Domain NFT ID (NonFungibleLocalId)
 * @returns Transaction manifest string
 */
export default async function activateDomainManifest({
    sdkInstance,
    accountAddress,
    domainId,
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
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
            Address("${sdkInstance.entities.rnsCore.rootAddr}")
            "activate_domain_ownership"
            Proof("domain_proof")
            Address("${accountAddress}");
        DROP_ALL_PROOFS;
    `;

}
