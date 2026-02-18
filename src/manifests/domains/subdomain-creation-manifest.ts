import NamespaceSDK from "../..";

/**
 * Subdomain Creation Manifest
 * 
 * Creates a subdomain by calling create_subdomain on the domain's DomainSubregistry component.
 * Requires proof of domain ownership.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address creating the subdomain
 * @param domainId - Root domain NFT ID
 * @param subregistryAddress - Subregistry component address for the domain
 * @param subdomainName - Subdomain name only (without root domain, e.g., "blog" not "blog.example.xrd")
 * @param metadata - Optional metadata map for the subdomain
 * @returns Transaction manifest string
 */
export default async function subdomainCreationManifest({
    sdkInstance,
    accountAddress,
    domainId,
    subregistryAddress,
    subdomainName,
    metadata = {},
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    subregistryAddress: string;
    subdomainName: string;
    metadata?: Record<string, string>;
}) {

    // Convert metadata to manifest format
    const metadataEntries = Object.entries(metadata)
        .map(([key, value]) => `Tuple(\"${key}\", \"${value}\")`)
        .join(', ');
    
    const metadataMap = metadataEntries ? `Map<String, String>(${metadataEntries})` : 'Map<String, String>()';

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
            "create_subdomain"
            Proof("domain_proof")
            "${subdomainName}"
            ${metadataMap};
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
        DROP_ALL_PROOFS;
    `;

}
