import NamespaceSDK from "../..";
import { RecordDocketI } from "../../common/record.types";

/**
 * Record Creation Manifest
 * 
 * Sets a record by calling set_record on the domain's DomainSubregistry component.
 * Records are simple key-value pairs with context-directive-value structure.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account address setting the record
 * @param domainId - Domain NFT ID
 * @param subregistryAddress - Subregistry component address
 * @param subdomainName - Optional subdomain name (for subdomain records)
 * @param context - Record context
 * @param directive - Record directive
 * @param value - Record value
 * @returns Transaction manifest string
 */
export function createRecordManifest({
    sdkInstance,
    accountAddress,
    domainId,
    subregistryAddress,
    subdomainName,
    context,
    directive,
    value
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    domainId: string;
    subregistryAddress: string;
    subdomainName?: string;
    context: string;
    directive: string;
    value: string;
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
            "set_record"
            Proof("domain_proof")
            ${subdomainParam}
            "${context}"
            "${directive}"
            "${value}";
        DROP_ALL_PROOFS;
    `;

}
