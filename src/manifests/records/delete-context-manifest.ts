import NamespaceSDK from "../..";

/**
 * Delete Context Records Manifest
 * 
 * Deletes all records within a context by calling delete_context_records 
 * on the domain's DomainSubregistry component.
 * 
 * @param sdkInstance - SDK instance
 * @param accountAddress - Account address deleting the records
 * @param domainId - Domain NFT ID
 * @param subregistryAddress - Subregistry component address
 * @param subdomainName - Optional subdomain name (for subdomain records)
 * @param context - Context to delete all records from
 * @returns Transaction manifest string
 */
export function deleteContextRecordsManifest({
    sdkInstance,
    accountAddress,
    domainId,
    subregistryAddress,
    subdomainName,
    context
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    subregistryAddress: string;
    subdomainName?: string;
    context: string;
}): string {

    const subdomainParam = subdomainName
        ? `Enum<1u8>("${subdomainName}")`
        : 'Enum<0u8>()';

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
            "delete_context_records"
            Proof("domain_proof")
            ${subdomainParam}
            "${context}";
        DROP_ALL_PROOFS;
    `;

}

