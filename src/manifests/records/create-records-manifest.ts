import NamespaceSDK from "../..";
import { RecordEntryI } from "../../common/record.types";

/**
 * Create Records Manifest (Batch)
 * 
 * Sets multiple records by calling set_records_batch on the domain's DomainSubregistry component.
 * Records are stored as context-directive-value triplets in the subregistry's KeyValueStore.
 * 
 * The Scrypto method expects: HashMap<String, HashMap<String, String>>
 * This is a nested map: context -> (directive -> value)
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address setting the records
 * @param domainId - Domain NFT ID
 * @param subregistryAddress - Subregistry component address
 * @param subdomainName - Optional subdomain name (for subdomain records)
 * @param records - Array of records to set
 * @returns Transaction manifest string
 */
export function createRecordsManifest({
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
    records: RecordEntryI[];
}): string {

    const subdomainParam = subdomainName
        ? `Enum<1u8>("${subdomainName}")`
        : 'Enum<0u8>()';

    // Build the nested HashMap structure for set_records_batch
    // Group records by context first
    const recordsByContext: Record<string, Array<{ directive: string; value: string }>> = {};
    
    for (const record of records) {
        if (!recordsByContext[record.context]) {
            recordsByContext[record.context] = [];
        }
        recordsByContext[record.context].push({
            directive: record.directive,
            value: record.value
        });
    }

    // Build the HashMap manifest string
    // HashMap<String, HashMap<String, String>>
    const contextEntries = Object.entries(recordsByContext).map(([context, directives]) => {
        const directiveEntries = directives.map(d => 
            `"${d.directive}" => "${d.value}"`
        ).join(', ');
        
        return `"${context}" => HashMap<String, String>(${directiveEntries})`;
    }).join(', ');

    const recordsMap = `HashMap<String, HashMap<String, String>>(${contextEntries})`;

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
            "set_records_batch"
            Proof("domain_proof")
            ${subdomainParam}
            ${recordsMap};
        DROP_ALL_PROOFS;
    `;

}

