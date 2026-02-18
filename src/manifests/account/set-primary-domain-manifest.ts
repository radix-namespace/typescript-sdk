import NamespaceSDK from "../..";

/**
 * Set Primary Domain Manifest
 * 
 * Sets a primary domain for reverse resolution (domain discovery).
 * Creates or updates a soulbound config badge for the account.
 * 
 * The primary domain can be either a root domain (e.g., "example.xrd")
 * or a subdomain (e.g., "blog.example.xrd").
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account to set the primary domain for
 * @param domainId - Domain NFT ID (NonFungibleLocalId) - the root domain that owns the subdomain (or the domain itself)
 * @param domainName - The domain name to set as primary (can be root or subdomain)
 * @param enableDiscovery - Whether to enable domain discovery
 * @returns Transaction manifest string
 */
export default async function setPrimaryDomainManifest({
    sdkInstance,
    accountAddress,
    domainId,
    domainName,
    enableDiscovery = false
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    domainName: string;
    enableDiscovery?: boolean;
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
            "set_primary_domain"
            Proof("domain_proof")
            "${domainName}"
            Address("${accountAddress}")
            ${enableDiscovery};
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
    `;

}


