import { InstancePropsI } from "../../common/entities.types";
import { RegistrarStatsI } from "../../common/registrar.types";
import { logger } from "../../utils/log.utils";
import { formatNonFungibleLocalId } from "../../utils/domain.utils";
import { 
    parseSborU64, 
    parseSborDecimal, 
    parseSborOptionInstant, 
    parseSborHashMap 
} from "../../utils/sbor.utils";

/**
 * Fetches registrar statistics from the registrar_stats KeyValueStore
 * 
 * This function queries the registrar stats KVS to retrieve performance data
 * including domain registration counts and fee accumulation.
 * 
 * @param registrarId - The registrar badge NFT ID (raw or formatted, e.g., "1" or "#1#")
 * @param sdkInstance - The RNS SDK instance containing state and entities
 * @returns Registrar stats or null if not found, or Error
 * 
 * @example
 * ```typescript
 * const stats = await requestRegistrarStats({
 *   registrarId: '1',
 *   sdkInstance: rns
 * });
 * if (stats instanceof Error) {
 *   console.error('Failed to fetch stats:', stats.message);
 * } else if (stats === null) {
 *   console.log('Registrar not found');
 * } else {
 *   console.log(`Total domains registered: ${stats.domains_bonded_cumulative}`);
 * }
 * ```
 */
export async function requestRegistrarStats({
    registrarId,
    sdkInstance
}: {
    registrarId: string;
} & InstancePropsI): Promise<RegistrarStatsI | null | Error> {
    try {
        const formattedRegistrarId = formatNonFungibleLocalId(registrarId);
        const registrarStatsKvs = sdkInstance.entities.rnsCore.registrarStats;

        if (!registrarStatsKvs) {
            throw new Error('Registrar stats KeyValueStore not found in RNS entities');
        }

        // Query the KeyValueStore for the registrar's stats
        const kvsResponse = await sdkInstance.state.innerClient.keyValueStoreData({
            stateKeyValueStoreDataRequest: {
                key_value_store_address: registrarStatsKvs,
                keys: [{
                    key_json: {
                        kind: 'NonFungibleLocalId',
                        value: formattedRegistrarId
                    }
                }]
            }
        });

        // Check if entry exists
        if (!kvsResponse.entries || kvsResponse.entries.length === 0) {
            return null;
        }

        const entry = kvsResponse.entries[0];
        const valueJson = entry.value.programmatic_json;

        // RegistrarStats is a Tuple struct with named fields
        if (valueJson.kind !== 'Tuple' || !valueJson.fields) {
            throw new Error('Unexpected registrar stats format');
        }

        const fields = valueJson.fields;

        // Parse each field based on expected structure:
        // 0: domains_bonded: HashMap<ResourceAddress, u64>
        // 1: domains_bonded_cumulative: u64
        // 2: fees_earned_cumulative: HashMap<ResourceAddress, Decimal>
        // 3: fees_earned_current: HashMap<ResourceAddress, Decimal>
        // 4: last_withdrawal: Option<Instant>

        const domainsBondedResult = parseSborHashMap(fields[0], parseSborU64);
        const domainsBonded = domainsBondedResult.success ? domainsBondedResult.value : {};

        const domainsBondedCumulativeResult = fields[1] ? parseSborU64(fields[1]) : null;
        const domainsBondedCumulative = domainsBondedCumulativeResult?.success 
            ? domainsBondedCumulativeResult.value 
            : 0;

        const feesEarnedCumulativeResult = parseSborHashMap(fields[2], parseSborDecimal);
        const feesEarnedCumulative = feesEarnedCumulativeResult.success 
            ? feesEarnedCumulativeResult.value 
            : {};

        const feesEarnedCurrentResult = parseSborHashMap(fields[3], parseSborDecimal);
        const feesEarnedCurrent = feesEarnedCurrentResult.success 
            ? feesEarnedCurrentResult.value 
            : {};

        const lastWithdrawalResult = parseSborOptionInstant(fields[4]);
        const lastWithdrawalSeconds = lastWithdrawalResult.success 
            ? lastWithdrawalResult.value 
            : null;
        // Convert to milliseconds for consistency with domain timestamps
        const lastWithdrawal = lastWithdrawalSeconds !== null ? lastWithdrawalSeconds * 1000 : null;

        return {
            domains_bonded: domainsBonded,
            domains_bonded_cumulative: domainsBondedCumulative,
            fees_earned_cumulative: feesEarnedCumulative,
            fees_earned_current: feesEarnedCurrent,
            last_withdrawal: lastWithdrawal
        };

    } catch (e) {
        logger.error("requestRegistrarStats", e);
        return e as Error;
    }
}
