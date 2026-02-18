import NamespaceSDK from "../..";

/**
 * Subdomain Deletion Manifest
 * 
 * Deletes a subdomain by calling delete_subdomain on the domain's DomainSubregistry component.
 * Requires proof of domain ownership.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address deleting the subdomain
 * @param domainId - Root domain NFT ID
 * @param subregistryAddress - Subregistry component address for the domain
 * @param subdomainName - Subdomain name only (without root domain, e.g., "blog" not "blog.example.xrd")
 * @returns Transaction manifest string
 */
export default async function subdomainDeletionManifest({
    sdkInstance,
    accountAddress,
    domainId,
    subregistryAddress,
    subdomainName,
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    subregistryAddress: string;
    subdomainName: string;
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
            Address("${subregistryAddress}")
            "delete_subdomain"
            Proof("domain_proof")
            "${subdomainName}";
        DROP_ALL_PROOFS;
    `;
    
}
