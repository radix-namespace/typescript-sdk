import {
    State,
    StateEntityDetailsResponseComponentDetails,
} from "@radixdlt/babylon-gateway-api-sdk";

import {
    parseResourceAddress,
    parseComponentAddress,
    parseStringArray,
    parseBoolean,
    parseField
} from "./sbor.utils";

import {
    ComponentStateI,
    EntitiesT,
    NamespaceCoreExpansionI
} from "../common/entities.types";

import {
    NetworkT
} from "../common/gateway.types";

/**
 * Helper function to extract field value from component state
 * Returns the raw programmatic JSON value
 */
function getFieldValue(componentState: ComponentStateI, fieldName: string): unknown {
    const field = componentState.fields.find(f => f.field_name === fieldName);
    if (!field) {
        console.warn(`Field '${fieldName}' not found in component state.`);
        return null;
    }
    return field.value;
}

/**
 * Auto-discovery: Expands the Radix Namespace component by querying its state
 * and extracting all resource addresses and internal storage references
 */
async function expandRNSCore(
    componentAddress: string,
    state: State,
    network: NetworkT
): Promise<NamespaceCoreExpansionI> {
    try {

        // Fetch the component details from the Gateway API
        const componentDetailsResponse = await state.innerClient.stateEntityDetails({
            stateEntityDetailsRequest: {
                addresses: [componentAddress],
                opt_ins: {
                    explicit_metadata: ['*']  // Request all metadata
                }
            }
        });

        const componentDetails = componentDetailsResponse.items[0]?.details as StateEntityDetailsResponseComponentDetails;

        if (!componentDetails || !componentDetails.state) {
            throw new Error(`Failed to fetch component state for ${componentAddress}`);
        }

        const componentState = componentDetails.state as ComponentStateI;

        // Extract owned resource addresses using SBOR parsers
        const domainResource = parseField(componentState, "domain_manager", parseResourceAddress) || "";
        const importDomainResource = parseField(componentState, "import_domain_manager", parseResourceAddress) || "";
        const adminBadgeResource = parseField(componentState, "admin_badge_manager", parseResourceAddress) || "";
        const configBadgeResource = parseField(componentState, "config_badge_manager", parseResourceAddress) || "";
        const registrarBadgeResource = parseField(componentState, "registrar_manager", parseResourceAddress) || "";

        // Extract KeyValueStore addresses using SBOR parsers
        const bondVaults = parseField(componentState, "bond_vaults", parseComponentAddress) || "";
        const domainRegistry = parseField(componentState, "domain_registry", parseComponentAddress) || "";
        const registrarStats = parseField(componentState, "registrar_stats", parseComponentAddress) || "";
        const registrarFeeVaults = parseField(componentState, "registrar_fee_vaults", parseComponentAddress) || "";
        const reservedDomainClaims = parseField(componentState, "reserved_domain_claims", parseComponentAddress) || "";
        const acceptedImportsUsed = parseField(componentState, "accepted_imports_used", parseComponentAddress) || "";

        // Scalar fields
        const domainCounterKey = parseField(componentState, "domain_counter_key", (v) => ({ success: true, value: Number(v || 0) })) || 0;
        const registrarCounterKey = parseField(componentState, "registrar_counter_key", (v) => ({ success: true, value: Number(v || 0) })) || 0;
        const accountLocker = parseField(componentState, "account_locker", parseComponentAddress) || "";

        // Component metadata using SBOR parsers
        const dappDefinition = parseField(componentState, "dapp_definition", parseComponentAddress);
        const isRegistrationActive = parseField(componentState, "is_registration_active", parseBoolean) ?? false;

        // Price ladder (HashMap<i64, Decimal>)
        // For now, return empty object - can be parsed later if needed
        const priceLadder: Record<string, string> = {};

        // Subregistry metadata templates using SBOR parsers
        const subregistryConfig = {
            name: parseField(componentState, "subregistry_name", (v) => ({ success: true, value: String(v || "") })) || "",
            description: parseField(componentState, "subregistry_description", (v) => ({ success: true, value: String(v || "") })) || "",
            tags: parseField(componentState, "subregistry_tags", parseStringArray) || [],
            iconUrl: parseField(componentState, "subregistry_icon_url", (v) => ({ success: true, value: String(v || "") })) || ""
        };

        // Accepted payment resources - these are the keys of the bond_vaults KeyValueStore
        const acceptedPaymentResources: string[] = [];
        try {
            const bondVaultsKeys = await state.innerClient.keyValueStoreKeys({
                stateKeyValueStoreKeysRequest: {
                    key_value_store_address: bondVaults
                }
            });

            if (bondVaultsKeys.items) {
                for (const item of bondVaultsKeys.items) {
                    if (item.key.programmatic_json.kind === 'Reference') {
                        acceptedPaymentResources.push(item.key.programmatic_json.value);
                    }
                }
            }
        } catch (e) {
            console.warn("[RNS SDK] Failed to fetch accepted payment resources:", e);
        }

        return {
            domainResource,
            importDomainResource,
            adminBadgeResource,
            configBadgeResource,
            registrarBadgeResource,
            bondVaults,
            domainRegistry,
            registrarStats,
            registrarFeeVaults,
            reservedDomainClaims,
            domainCounterKey,
            accountLocker,
            registrarCounterKey,
            acceptedImportsUsed,
            dappDefinition,
            isRegistrationActive,
            priceLadder,
            subregistryConfig,
            acceptedPaymentResources
        };

    } catch (error) {
        console.error("[RNS SDK] Failed to expand Radix Namespace component:", error);
        throw new Error(`Failed to auto-discover Radix Namespace resources: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Main expansion function - auto-discovers all resources and state from the Radix Namespace component
 * 
 * @param rnsCoreAddress The Radix Namespace component address
 * @param state Gateway API state client
 * @param network Network identifier (mainnet/stokenet)
 * @returns Expanded entities with all auto-discovered resources
 */
export async function expandComponents(rnsCoreAddress: string | null, state: State, network: NetworkT): Promise<EntitiesT> {
    if (!rnsCoreAddress) {
        throw new Error(`Radix Namespace component address not configured for network: ${network}`);
    }

    try {
        const expandedRnsCore = await expandRNSCore(rnsCoreAddress, state, network);

        return {
            rnsCore: {
                rootAddr: rnsCoreAddress,
                ...expandedRnsCore
            }
        };
    } catch (error) {
        console.error("[RNS SDK] Failed to expand Radix Namespace components:", error);
        throw error;
    }
}
