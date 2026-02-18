import NamespaceSDK from "../..";

/**
 * Record Deletion Manifest
 * 
 * Deletes a record by calling delete_record on the domain's DomainSubregistry component.
 * Requires proof of domain ownership and the context+directive to identify the record.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address deleting the record
 * @param domainId - Domain NFT ID
 * @param subregistryAddress - Subregistry component address
 * @param context - Record context
 * @param directive - Record directive
 * @returns Transaction manifest string
 */
export function deleteRecordManifest({
    sdkInstance,
    accountAddress,
    domainId,
    subregistryAddress,
    context,
    directive
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    subregistryAddress: string;
    context: string;
    directive: string;
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
            "delete_record"
            Proof("domain_proof")
            "${context}"
            "${directive}";
        DROP_ALL_PROOFS;
    `;

}
