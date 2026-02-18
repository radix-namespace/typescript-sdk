import NamespaceSDK from "../..";
import { formatNonFungibleLocalId } from "../../utils/domain.utils";

/**
 * Withdraw Registrar Fees Manifest
 * 
 * Calls withdraw_registrar_fees on the Radix Namespace component.
 * Withdraws all accumulated fees for the specified resource(s).
 * 
 * Uses a single proof for all withdrawals in one transaction.
 * 
 * Reference: core-contracts README.md - withdraw_registrar_fees method
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account holding the registrar badge
 * @param registrarBadgeResource - Registrar badge resource address
 * @param registrarId - Registrar badge ID (raw or formatted)
 * @param resourceAddresses - Array of resource addresses to withdraw fees for
 * @returns Transaction manifest string
 */
export default async function withdrawRegistrarFeesManifest({
    sdkInstance,
    accountAddress,
    registrarBadgeResource,
    registrarId,
    resourceAddresses
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    registrarBadgeResource: string;
    registrarId: string;
    resourceAddresses: string[];
}) {

    const formattedRegistrarId = formatNonFungibleLocalId(registrarId);

    // Build withdrawal calls for each resource
    const withdrawalCalls = resourceAddresses.map(resourceAddress => `
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.rootAddr}")
            "withdraw_registrar_fees"
            Proof("registrar_proof")
            Address("${resourceAddress}");`
    ).join('');

    return `
        CALL_METHOD
            Address("${accountAddress}")
            "create_proof_of_non_fungibles"
            Address("${registrarBadgeResource}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${formattedRegistrarId}")
            );
        POP_FROM_AUTH_ZONE
            Proof("registrar_proof");${withdrawalCalls}
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
    `;

}
