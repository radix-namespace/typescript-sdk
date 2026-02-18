import { logger } from "../../utils/log.utils";

import { InstancePropsI } from "../../common/entities.types";
import { ReservedDomainClaimI, ReservedDomainsResponseI } from "../../common/domain.types";

/**
 * Request reserved domains claimable by a specific account
 * 
 * Enumerates the reserved_domain_claims KeyValueStore to find all domains
 * reserved for the given account address.
 * 
 * KVS structure: KeyValueStore<String, Global<Account>>
 *   Key   = domain name (String)
 *   Value = claimant account address (Reference)
 */
export async function requestReservedDomains(
    accountAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<ReservedDomainsResponseI | Error> {
    try {
        const reservedKvs = sdkInstance.entities.rnsCore.reservedDomainClaims;

        if (!reservedKvs) {
            return { claims: [], total_reserved: 0 };
        }

        const allClaims: ReservedDomainClaimI[] = [];
        let cursor: string | null | undefined = undefined;

        do {
            const keysResponse = await sdkInstance.state.innerClient.keyValueStoreKeys({
                stateKeyValueStoreKeysRequest: {
                    key_value_store_address: reservedKvs,
                    cursor: cursor ?? undefined,
                    limit_per_page: 100
                }
            });

            if (!keysResponse.items || keysResponse.items.length === 0) break;

            const domainNames: string[] = [];
            for (const item of keysResponse.items) {
                if (item.key.programmatic_json.kind === 'String') {
                    domainNames.push(item.key.programmatic_json.value);
                }
            }

            if (domainNames.length > 0) {
                const dataResponse = await sdkInstance.state.innerClient.keyValueStoreData({
                    stateKeyValueStoreDataRequest: {
                        key_value_store_address: reservedKvs,
                        keys: domainNames.map(name => ({
                            key_json: { kind: 'String' as const, value: name }
                        }))
                    }
                });

                if (dataResponse.entries) {
                    for (const entry of dataResponse.entries) {
                        const domainName = entry.key.programmatic_json.kind === 'String'
                            ? entry.key.programmatic_json.value
                            : undefined;

                        const claimant = entry.value?.programmatic_json?.kind === 'Reference'
                            ? entry.value.programmatic_json.value
                            : undefined;

                        if (domainName && claimant) {
                            allClaims.push({ domain: domainName, claimant });
                        }
                    }
                }
            }

            cursor = keysResponse.next_cursor;
        } while (cursor !== null && cursor !== undefined);

        const totalReserved = allClaims.length;

        const accountClaims = accountAddress
            ? allClaims.filter(c => c.claimant === accountAddress)
            : allClaims;

        return {
            claims: accountClaims,
            total_reserved: totalReserved
        };
    } catch (e) {
        logger.error("requestReservedDomains", e);
        return e as Error;
    }
}
