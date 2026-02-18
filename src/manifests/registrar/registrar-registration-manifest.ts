import NamespaceSDK from "../..";

/**
 * Registrar Registration Manifest
 * 
 * Calls register_as_registrar on the Radix Namespace component.
 * Returns a registrar badge NFT to the account.
 * 
 * 
 * @param sdkInstance - RNS SDK instance
 * @param name - Business or service name (1-100 characters)
 * @param iconUrl - Public URL to registrar logo/icon
 * @param websiteUrl - Public URL to registrar's website
 * @param feePercentage - Fee percentage (1 = 1%, 0.5 = 0.5%, 200 = 200%)
 * @param accountAddress - Account to receive the registrar badge
 * @returns Transaction manifest string
 */
export default async function registerAsRegistrarManifest({
    sdkInstance,
    name,
    iconUrl,
    websiteUrl,
    feePercentage,
    accountAddress
}: {
    sdkInstance: NamespaceSDK;
    name: string;
    iconUrl: string;
    websiteUrl: string;
    feePercentage: string;
    accountAddress: string;
}) {

    return `
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.rootAddr}")
            "register_as_registrar"
            "${name}"
            "${iconUrl}"
            "${websiteUrl}"
            Decimal("${feePercentage}");
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
    `;

}

