import NamespaceSDK from "../..";
import { RecordRefI } from "../../common/record.types";

/**
 * Delete Records Manifest (Batch)
 * 
 * Deletes multiple records by calling delete_records_batch on the domain's DomainSubregistry component.
 * 
 * The Scrypto method expects: Vec<(String, String)>
 * This is an array of (context, directive) tuples.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address deleting the records
 * @param domainId - Domain NFT ID
 * @param subregistryAddress - Subregistry component address
 * @param subdomainName - Optional subdomain name (for subdomain records)
 * @param records - Array of record keys to delete
 * @returns Transaction manifest string
 */
export function deleteRecordsManifest({
    sdkInstance,
    accountAddress,
    domainId,
    subregistryAddress,
    subdomainName,
    records
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    subregistryAddress: string;
    subdomainName?: string;
    records: RecordRefI[];
}): string {

    const subdomainParam = subdomainName
        ? `Enum<1u8>("${subdomainName}")`
        : 'Enum<0u8>()';

    // Build Vec<(String, String)> - array of (context, directive) tuples
    const tuples = records.map(r => 
        `Tuple("${r.context}", "${r.directive}")`
    ).join(', ');

    const recordsArray = `Array<Tuple>(${tuples})`;

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
            "delete_records_batch"
            Proof("domain_proof")
            ${subdomainParam}
            ${recordsArray};
        DROP_ALL_PROOFS;
    `;

}

