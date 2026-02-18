import NamespaceSDK from "../..";

/**
 * Domain Transfer Manifest
 * 
 * Generates a manifest to transfer a domain NFT to a new owner.
 * Optionally spawns a new subregistry for a clean transfer.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param domain - Domain name (used to get domain ID)
 * @param fromAddress - Current owner's account address
 * @param destinationAddress - New owner's account address
 * @param cleanTransfer - Whether to spawn new subregistry before transfer
 * @returns Transaction manifest string
 */
export default async function transferDomainManifest({
    sdkInstance,
    domain,
    fromAddress,
    destinationAddress,
    cleanTransfer,
}: {
    sdkInstance: NamespaceSDK;
    domain: string;
    fromAddress: string;
    destinationAddress: string;
    cleanTransfer: boolean;
}) {
    const domainResourceAddress = sdkInstance.entities.rnsCore.domainResource;
    const namespaceCoreAddress = sdkInstance.entities.rnsCore.rootAddr;

    let manifest = '';

    // Optional: Spawn new subregistry for clean transfer
    if (cleanTransfer) {
        manifest += `
        CALL_METHOD
            Address("${fromAddress}")
            "create_proof_of_non_fungibles"
            Address("${domainResourceAddress}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${domain}")
            );
        POP_FROM_AUTH_ZONE
            Proof("domain_proof");
        CALL_METHOD
            Address("${namespaceCoreAddress}")
            "spawn_new_subregistry"
            Proof("domain_proof");
        `;
    }

    // Transfer the domain NFT
    manifest += `
        CALL_METHOD
            Address("${fromAddress}")
            "withdraw_non_fungibles"
            Address("${domainResourceAddress}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${domain}")
            );
        CALL_METHOD
            Address("${destinationAddress}")
            "try_deposit_batch_or_refund"
            Expression("ENTIRE_WORKTOP")
            None;
    `;

    return manifest;
}
