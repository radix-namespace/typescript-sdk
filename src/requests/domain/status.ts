import { getDomainPrice } from "../../utils/pricing.utils";
import { convertToDecimal } from "../../utils/decimal.utils";
import { domainToNonFungId } from "../../utils/domain.utils";
import { logger } from "../../utils/log.utils";

import { InstancePropsI } from "../../common/entities.types";
import { DomainAttributesResponseT } from "../../common/response.types";
import { DomainStatusInfoI } from "../../common/domain.types";


/**
 * Request domain status (available, taken, or reserved)
 * 
 * Checks:
 * 1. domain_registry KeyValueStore - if exists, domain is taken
 * 2. reserved_domain_claims KeyValueStore - if exists, domain is reserved
 * 3. import_domain_manager - if exists as import domain, it's taken
 * 4. Otherwise - available
 * 
 * Reference: core-contracts/src/radix_namespace.rs - lookup_domain method
 */
export async function requestDomainStatus(
    domainName: string,
    { sdkInstance }: InstancePropsI
): Promise<DomainAttributesResponseT | Error> {
    try {
        const statusInfo = await checkDomainStatus(domainName, { sdkInstance });

        if (statusInfo instanceof Error) {
            throw statusInfo;
        }

        // Get required bond units from price ladder and convert to Decimal
        const requiredBondUnitsString = getDomainPrice(domainName, sdkInstance.entities.rnsCore.priceLadder);
        const requiredBondUnits = convertToDecimal(requiredBondUnitsString);

        return {
            domain: domainName,
            status: statusInfo.status,
            required_bond_units: requiredBondUnits,
            ...(statusInfo.reserved_for ? { reserved_for: statusInfo.reserved_for } : {})
        };
    } catch (e) {
        logger.error("requestDomainStatus", e);
        return e as Error;
    }
}

/**
 * Checks domain availability status by replicating the component's lookup_domain logic
 * 
 * Logic (same as Radix Namespace component):
 * 1. Check if in domain_registry → Taken
 * 2. Check if in reserved_domain_claims → Reserved(claimant)
 * 3. Check if exists in import_domain_manager → Taken
 * 4. Otherwise → Available
 * 
 * Reference: core-contracts/src/radix_namespace.rs - lookup_domain method
 */
async function checkDomainStatus(
    domainName: string,
    { sdkInstance }: InstancePropsI
): Promise<DomainStatusInfoI | Error> {
    try {
        // Check if domain is registered in domain_registry
        const registryResponse = await sdkInstance.state.innerClient.keyValueStoreData({
            stateKeyValueStoreDataRequest: {
                key_value_store_address: sdkInstance.entities.rnsCore.domainRegistry,
                keys: [{ key_json: { kind: 'String', value: domainName } }]
            }
        });

        if (registryResponse.entries && registryResponse.entries.length > 0) {
            return {
                domain: domainName,
                status: 'taken'
            };
        }

        // Check if domain is reserved
        if (sdkInstance.entities.rnsCore.reservedDomainClaims) {
            try {
                const reservedResponse = await sdkInstance.state.innerClient.keyValueStoreData({
                    stateKeyValueStoreDataRequest: {
                        key_value_store_address: sdkInstance.entities.rnsCore.reservedDomainClaims,
                        keys: [{ key_json: { kind: 'String', value: domainName } }]
                    }
                });

                if (reservedResponse.entries && reservedResponse.entries.length > 0) {
                    const claimantEntry = reservedResponse.entries[0];
                    let reservedFor: string | undefined;
                    
                    if (claimantEntry.value?.programmatic_json?.kind === 'Reference') {
                        reservedFor = claimantEntry.value.programmatic_json.value;
                    }

                    return {
                        domain: domainName,
                        status: 'reserved',
                        reserved_for: reservedFor
                    };
                }
            } catch {
                // Reserved domain claims lookup failed - continue
            }
        }

        // Check if domain exists in import domain system
        const domainId = await domainToNonFungId(domainName);

        try {
            const importResponse = await sdkInstance.state.innerClient.nonFungibleData({
                stateNonFungibleDataRequest: {
                    resource_address: sdkInstance.entities.rnsCore.importDomainResource,
                    non_fungible_ids: [domainId]
                }
            });

            if (importResponse && importResponse.non_fungible_ids && importResponse.non_fungible_ids.length > 0) {
                return {
                    domain: domainName,
                    status: 'taken'
                };
            }
        } catch (error) {
            // Import domain doesn't exist (expected for most domains)
        }

        return {
            domain: domainName,
            status: 'available'
        };
    } catch (e) {
        logger.error("checkDomainStatus", e);
        return e as Error;
    }
}
