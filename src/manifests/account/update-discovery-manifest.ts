import NamespaceSDK from "../..";

/**
 * Update Discovery Settings Manifest
 * 
 * Updates the discovery setting for an existing config badge.
 * Requires the account to already have a config badge (set via updateAccountSettings).
 * 
 * @param sdkInstance - RNS SDK instance
 * @param accountAddress - Account with an existing config badge
 * @param configBadgeId - The config badge NFT local ID
 * @param enableDiscovery - Whether to enable or disable discovery
 * @returns Transaction manifest string
 */
export default async function updateDiscoveryManifest({
    sdkInstance,
    accountAddress,
    configBadgeId,
    enableDiscovery
}: {
    sdkInstance: NamespaceSDK;
    accountAddress: string;
    configBadgeId: string;
    enableDiscovery: boolean;
}) {

    return `
        CALL_METHOD
            Address("${accountAddress}")
            "create_proof_of_non_fungibles"
            Address("${sdkInstance.entities.rnsCore.configBadgeResource}")
            Array<NonFungibleLocalId>(
                NonFungibleLocalId("${configBadgeId}")
            );
        POP_FROM_AUTH_ZONE
            Proof("config_proof");
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.rootAddr}")
            "update_discovery_settings"
            Proof("config_proof")
            ${enableDiscovery};
    `;

}

