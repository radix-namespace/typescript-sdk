import Decimal from "decimal.js";
import { InstancePropsI, ComponentStateI } from "../../common/entities.types";
import { RegistrarDetailsI } from "../../common/registrar.types";
import { logger } from "../../utils/log.utils";
import { parseField, parseString, parseSborInstant } from "../../utils/sbor.utils";
import { formatNonFungibleLocalId, stripNonFungibleLocalIdBrackets } from "../../utils/domain.utils";

/**
 * Fetches detailed metadata for a specific registrar
 * 
 * This function queries the registrar badge NFT data to retrieve the registrar's
 * business information including name, branding URLs, and fee percentage.
 * 
 * @param registrarId - The registrar badge NFT ID (raw or formatted, e.g., "1" or "#1#")
 * @param sdkInstance - The RNS SDK instance containing state and entities
 * @returns Registrar details or Error
 * 
 * @example
 * ```typescript
 * const details = await requestRegistrarDetails({
 *   registrarId: '1',  // SDK handles formatting to "#1#"
 *   sdkInstance: rns
 * });
 * if (details instanceof Error) {
 *   console.error('Failed to fetch registrar:', details.message);
 * } else {
 *   console.log(`${details.name} charges ${details.fee_percentage}% fee`);
 * }
 * ```
 */
export async function requestRegistrarDetails({
    registrarId,
    sdkInstance
}: {
    registrarId: string;
} & InstancePropsI): Promise<RegistrarDetailsI | Error> {
    try {
        const formattedRegistrarId = formatNonFungibleLocalId(registrarId);
        const registrarBadgeResource = sdkInstance.entities.rnsCore.registrarBadgeResource;

        if (!registrarBadgeResource) {
            throw new Error('Registrar badge resource not found in RNS entities');
        }

        const nftDataResponse = await sdkInstance.state.innerClient.nonFungibleData({
            stateNonFungibleDataRequest: {
                resource_address: registrarBadgeResource,
                non_fungible_ids: [formattedRegistrarId]
            }
        });

        const nftItem = nftDataResponse.non_fungible_ids?.[0];
        const nftData = nftItem?.data?.programmatic_json;

        if (!nftData || !('fields' in nftData) || !Array.isArray(nftData.fields)) {
            throw new Error(`Registrar badge not found: ${formattedRegistrarId}`);
        }

        // NFT data has same structure as component state
        const nftState = { fields: nftData.fields } as ComponentStateI;

        return {
            id: stripNonFungibleLocalIdBrackets(registrarId),  // Return clean ID without brackets
            name: parseField(nftState, 'name', parseString) || 'Unknown Registrar',
            icon_url: parseField(nftState, 'icon_url', parseString) || '',
            website_url: parseField(nftState, 'website_url', parseString) || '',
            fee_percentage: new Decimal(parseField(nftState, 'fee_percentage', parseString) || '0'),
            created_at: (parseField(nftState, 'created_timestamp', parseSborInstant) ?? 0) * 1000,
            updated_at: (parseField(nftState, 'updated_timestamp', parseSborInstant) ?? 0) * 1000
        };
    } catch (e) {
        logger.error("requestRegistrarDetails", e);
        return e as Error;
    }
}

