import NamespaceSDK from "../..";
import { formatNonFungibleLocalId } from "../../utils/domain.utils";

/**
 * Update Registrar Metadata Manifest
 * 
 * Calls update_registrar_metadata on the Radix Namespace component.
 * All fields are optional - pass Some(value) to update or None to leave unchanged.
 * 
 * Reference: core-contracts README.md - update_registrar_metadata method
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account holding the registrar badge
 * @param registrarBadgeResource - Registrar badge resource address
 * @param registrarId - Registrar badge ID (raw or formatted)
 * @param name - Optional new business name
 * @param iconUrl - Optional new icon URL
 * @param websiteUrl - Optional new website URL
 * @param feePercentage - Optional new fee percentage
 * @returns Transaction manifest string
 */
export default async function updateRegistrarMetadataManifest({
    sdkInstance,
    accountAddress,
    registrarBadgeResource,
    registrarId,
    name,
    iconUrl,
    websiteUrl,
    feePercentage
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    registrarBadgeResource: string;
    registrarId: string;
    name?: string;
    iconUrl?: string;
    websiteUrl?: string;
    feePercentage?: string;
}) {
    const formattedRegistrarId = formatNonFungibleLocalId(registrarId);

    // Build optional parameters using Scrypto Option syntax
    const nameParam = name !== undefined ? `Some("${name}")` : 'None';
    const iconUrlParam = iconUrl !== undefined ? `Some("${iconUrl}")` : 'None';
    const websiteUrlParam = websiteUrl !== undefined ? `Some("${websiteUrl}")` : 'None';
    const feePercentageParam = feePercentage !== undefined ? `Some(Decimal("${feePercentage}"))` : 'None';

    return `
        CALL_METHOD
            Address("${accountAddress}")
            "create_proof_of_non_fungibles"
            Address("${registrarBadgeResource}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${formattedRegistrarId}")
            );
        POP_FROM_AUTH_ZONE
            Proof("registrar_proof");
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.rootAddr}")
            "update_registrar_metadata"
            Proof("registrar_proof")
            ${nameParam}
            ${iconUrlParam}
            ${websiteUrlParam}
            ${feePercentageParam};
    `;

}

