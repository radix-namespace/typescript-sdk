import NamespaceSDK from "../..";
import { formatNonFungibleLocalId } from "../../utils/domain.utils";

/**
 * Domain Registration Manifest
 * 
 * Calls register_and_bond_domain on the Radix Namespace component.
 * Withdraws both the bond amount (base price from pricing tier) and the registrar fee.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param domain - Domain name to register
 * @param accountAddress - Registering account address
 * @param paymentResource - Stablecoin resource address
 * @param bondAmount - Bond amount (base price from pricing tier)
 * @param registrarFee - Registrar fee amount (calculated as bondAmount * feePercentage / 100)
 * @param registrarId - Registrar badge ID (raw or formatted)
 * @returns Transaction manifest string
 */
export default async function registerDomainManifest({
    sdkInstance,
    domain,
    accountAddress,
    paymentResource,
    bondAmount,
    registrarFee,
    registrarId
}: {
    sdkInstance: NamespaceSDK;
    domain: string;
    accountAddress: string;
    paymentResource: string;
    bondAmount: string;
    registrarFee: string;
    registrarId: string;
}) {
    const formattedRegistrarId = formatNonFungibleLocalId(registrarId);

    return `
        CALL_METHOD
            Address("${accountAddress}")
            "withdraw"
            Address("${paymentResource}")
            Decimal("${bondAmount}");
        CALL_METHOD
            Address("${accountAddress}")
            "withdraw"
            Address("${paymentResource}")
            Decimal("${registrarFee}");
        TAKE_ALL_FROM_WORKTOP
            Address("${paymentResource}")
            Bucket("payment_bucket");
        CALL_METHOD
            Address("${sdkInstance.entities.rnsCore.rootAddr}")
            "register_and_bond_domain"
            "${domain}"
            Bucket("payment_bucket")
            Address("${accountAddress}")
            NonFungibleLocalId("${formattedRegistrarId}");
        CALL_METHOD
            Address("${accountAddress}")
            "deposit_batch"
            Expression("ENTIRE_WORKTOP");
    `;

}
