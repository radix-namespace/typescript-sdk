import NamespaceSDK from "../..";

/**
 * Domain Unbond Manifest
 * 
 * Unbonds a domain and withdraws the bonded USD stable value.
 * The returned stablecoin will be the same token used during registration.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address holding the domain
 * @param domainId - Domain NFT ID (NonFungibleLocalId)
 * @param preserveSubregistryData - Whether to preserve subregistry data (records/subdomains)
 * @returns Transaction manifest string
 */
export default async function unbondDomainManifest({
    sdkInstance,
    accountAddress,
    domainId,
    preserveSubregistryData = false
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    preserveSubregistryData?: boolean;
}) {

    return `
        CALL_METHOD
            Address("${accountAddress}")
            "withdraw_non_fungibles"
            Address("${sdkInstance.entities.rnsCore.domainResource}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${domainId}")
            );
        TAKE_NON_FUNGIBLES_FROM_WORKTOP
            Address("${sdkInstance.entities.rnsCore.domainResource}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${domainId}")
            )
            Bucket("domain_bucket");
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.rootAddr}")
            "unbond"
            Bucket("domain_bucket")
            ${preserveSubregistryData};
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
    `;

}

