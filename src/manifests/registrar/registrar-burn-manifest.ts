import NamespaceSDK from "../..";
import { formatNonFungibleLocalId } from "../../utils/domain.utils";

/**
 * Burn Registrar Badge Manifest
 * 
 * Calls burn_registrar_badge on the Radix Namespace component.
 * Permanently disables the registrar service - any unwithdrawn fees are locked forever.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account holding the registrar badge
 * @param registrarBadgeResource - Registrar badge resource address
 * @param registrarId - Registrar badge ID to burn (raw or formatted)
 * @returns Transaction manifest string
 */
export default async function burnRegistrarBadgeManifest({
    sdkInstance,
    accountAddress,
    registrarBadgeResource,
    registrarId
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    registrarBadgeResource: string;
    registrarId: string;
}) {
    const formattedRegistrarId = formatNonFungibleLocalId(registrarId);

    return `
        CALL_METHOD
            Address("${accountAddress}")
            "withdraw_non_fungibles"
            Address("${registrarBadgeResource}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${formattedRegistrarId}")
            );
        TAKE_NON_FUNGIBLES_FROM_WORKTOP
            Address("${registrarBadgeResource}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${formattedRegistrarId}")
            )
            Bucket("registrar_badge");
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.rootAddr}")
            "burn_registrar_badge"
            Bucket("registrar_badge");
    `;

}

