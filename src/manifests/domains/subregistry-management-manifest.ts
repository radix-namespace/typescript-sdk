import NamespaceSDK from "../..";

/**
 * Update Subregistry Icon Manifest
 * 
 * Updates the icon_url metadata on the domain's DomainSubregistry component.
 * Requires domain ownership proof.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address holding the domain
 * @param domainId - Domain NFT ID (NonFungibleLocalId)
 * @param subregistryAddress - Subregistry component address
 * @param iconUrl - New icon URL
 * @returns Transaction manifest string
 */
export function updateSubregistryIconManifest({
    sdkInstance,
    accountAddress,
    domainId,
    subregistryAddress,
    iconUrl
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    subregistryAddress: string;
    iconUrl: string;
}): string {

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
            Address("${subregistryAddress}")
            "update_icon_url"
            Proof("domain_proof")
            "${iconUrl}";
        DROP_ALL_PROOFS;
    `;

}

/**
 * Update Subregistry Dapp Definition Manifest
 * 
 * Updates the dapp_definition metadata on the domain's DomainSubregistry component.
 * Requires domain ownership proof.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address holding the domain
 * @param domainId - Domain NFT ID (NonFungibleLocalId)
 * @param subregistryAddress - Subregistry component address
 * @param dappDefinitionAddress - New dApp definition address
 * @returns Transaction manifest string
 */
export function updateSubregistryDappDefinitionManifest({
    sdkInstance,
    accountAddress,
    domainId,
    subregistryAddress,
    dappDefinitionAddress
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    subregistryAddress: string;
    dappDefinitionAddress: string;
}): string {

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
            Address("${subregistryAddress}")
            "update_dapp_definition"
            Proof("domain_proof")
            Address("${dappDefinitionAddress}");
        DROP_ALL_PROOFS;
    `;

}

/**
 * Update Domain Resource Manifest
 * 
 * Updates the domain resource address on the domain's DomainSubregistry component.
 * This is used when the subregistry needs to recognize a new domain NFT resource
 * (e.g., after importing a domain from an accepted resource).
 * Requires domain ownership proof.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address holding the domain
 * @param domainId - Domain NFT ID (NonFungibleLocalId)
 * @param subregistryAddress - Subregistry component address
 * @param newDomainResourceAddress - New domain resource address
 * @returns Transaction manifest string
 */
export function updateDomainResourceManifest({
    sdkInstance,
    accountAddress,
    domainId,
    subregistryAddress,
    newDomainResourceAddress
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    subregistryAddress: string;
    newDomainResourceAddress: string;
}): string {

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
            Address("${subregistryAddress}")
            "update_domain_resource"
            Proof("domain_proof")
            Address("${newDomainResourceAddress}");
        DROP_ALL_PROOFS;
    `;

}

/**
 * Replace Subregistry Manifest
 * 
 * Spawns a new empty subregistry for the domain, replacing the current one.
 * The old subregistry is orphaned (no longer referenced by the domain NFT).
 * All existing records and subdomains in the old subregistry become inaccessible.
 * 
 * The old subregistry remains locked to the original domain name for security -
 * other domains cannot attach to or interact with it.
 * 
 * Requires domain ownership proof.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address holding the domain
 * @param domainId - Domain NFT ID (NonFungibleLocalId)
 * @returns Transaction manifest string
 */
export function replaceSubregistryManifest({
    sdkInstance,
    accountAddress,
    domainId
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
}): string {

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
            "spawn_new_subregistry"
            Proof("domain_proof");
        DROP_ALL_PROOFS;
    `;

}

