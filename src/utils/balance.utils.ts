import Decimal from "decimal.js";
import { InstancePropsI } from "../common/entities.types";
import { logger } from "./log.utils";
import { requestResourceDetails } from "../requests/resource/details";
import { ResourceDetailsI } from "../common/resource.types";
import { isFungibleVaultAggregated } from "./gateway.utils";

/**
 * Individual resource balance info with full resource details
 */
export interface ResourceBalanceInfoI {
    resource: ResourceDetailsI;
    balance: string;
}

/**
 * Result from getAccountBondBalances
 */
export interface AccountBondBalancesResultI {
    balances: ResourceBalanceInfoI[];
}

/**
 * Sufficient balance info - resource has enough balance
 */
export interface SufficientBalanceInfoI {
    resource: ResourceDetailsI;
    balance: string;
}

/**
 * Insufficient balance info - resource does not have enough balance
 */
export interface InsufficientBalanceInfoI {
    resource: ResourceDetailsI;
    balance: string;
    shortfall: string;
}

/**
 * Result from checkAccountBondAffordability
 */
export interface BondAffordabilityResultI {
    requiredAmount: string;
    sufficientBalances: SufficientBalanceInfoI[];
    insufficientBalances: InsufficientBalanceInfoI[];
}

/**
 * Cache for accepted bond tokens with metadata
 */
let acceptedBondTokensCache: ResourceDetailsI[] | null = null;

/**
 * Fetches metadata for all accepted bond tokens (memoized)
 * 
 * Results are cached permanently after the first call since accepted
 * payment resources are static once an RNS Core component is instantiated.
 * 
 * Returns full resource details following Radix metadata standards.
 * 
 * @param acceptedResources - Array of accepted payment resource addresses
 * @param sdkInstance - SDK instance with state client
 * @returns Array of accepted bond tokens with full resource details
 */
export async function getAcceptedBondTokensWithMetadata(
    acceptedResources: string[],
    { sdkInstance }: InstancePropsI
): Promise<ResourceDetailsI[]> {
    // Return cached result if available
    if (acceptedBondTokensCache) {
        return acceptedBondTokensCache;
    }

    const tokens: ResourceDetailsI[] = [];

    for (const resourceAddress of acceptedResources) {
        const resourceDetails = await requestResourceDetails(resourceAddress, { sdkInstance });
        
        if (resourceDetails instanceof Error) {
            // Fallback for failed requests
            tokens.push({
                address: resourceAddress,
                type: 'fungible',
                name: null,
                symbol: null,
                description: null,
                tags: [],
                icon_url: null,
                info_url: null
            });
        } else {
            tokens.push(resourceDetails);
        }
    }

    // Cache the result permanently
    acceptedBondTokensCache = tokens;

    return tokens;
}

/**
 * Clears the accepted bond tokens cache
 * Useful for testing or when switching networks
 */
export function clearAcceptedBondTokensCache(): void {
    acceptedBondTokensCache = null;
}

/**
 * Fetches the balance of a specific fungible resource for an account
 * 
 * @param accountAddress - The account address to check
 * @param resourceAddress - The fungible resource address to check balance for
 * @param sdkInstance - SDK instance with state client
 * @returns Balance as string, or "0" if not found
 */
export async function getAccountResourceBalance(
    accountAddress: string,
    resourceAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<string> {
    try {
        // Use getEntityDetailsVaultAggregated which gives us fungible resources with amounts
        const entityDetails = await sdkInstance.state.getEntityDetailsVaultAggregated(accountAddress);
        
        // Find fungible resources in the entity details
        const fungibleResources = entityDetails?.fungible_resources?.items || [];
        
        // Find the specific resource
        for (const resource of fungibleResources) {
            if (resource.resource_address === resourceAddress) {
                // For vault aggregated, the amount is in the vaults
                if (isFungibleVaultAggregated(resource)) {
                    const vaults = resource.vaults?.items || [];
                    let totalAmount = new Decimal(0);
                    
                    for (const vault of vaults) {
                        if (vault.amount) {
                            totalAmount = totalAmount.plus(vault.amount);
                        }
                    }
                    
                    return totalAmount.toString();
                }
            }
        }

        return "0";
    } catch (error) {
        logger.error("getAccountResourceBalance", error);
        return "0";
    }
}

/**
 * Gets account bond balances for all accepted payment resources
 * 
 * Returns the current balance for each accepted resource.
 * 
 * @param accountAddress - The account address to check
 * @param acceptedResources - Array of accepted payment resource addresses
 * @param sdkInstance - SDK instance with state client
 * @returns Account bond balances with resource details
 */
export async function getAccountBondBalances(
    accountAddress: string,
    acceptedResources: string[],
    { sdkInstance }: InstancePropsI
): Promise<AccountBondBalancesResultI> {
    const balances: ResourceBalanceInfoI[] = [];

    for (const resourceAddress of acceptedResources) {
        // Get balance
        const balance = await getAccountResourceBalance(
            accountAddress,
            resourceAddress,
            { sdkInstance }
        );

        // Get full resource details
        const resourceDetails = await requestResourceDetails(resourceAddress, { sdkInstance });
        
        // Use full resource details or create fallback
        const resource: ResourceDetailsI = (resourceDetails instanceof Error) 
            ? {
                address: resourceAddress,
                type: 'fungible',
                name: null,
                symbol: null,
                description: null,
                tags: [],
                icon_url: null,
                info_url: null
            }
            : resourceDetails;

        balances.push({
            resource,
            balance
        });
    }

    return { balances };
}

/**
 * Checks account bond affordability against a required amount
 * 
 * Takes balances and compares against a required amount, splitting into
 * sufficient and insufficient arrays for easy frontend handling.
 * 
 * @param balances - Array of resource balances (from getAccountBondBalances)
 * @param requiredAmount - The amount required (as string)
 * @returns Affordability check result with sufficient/insufficient arrays
 */
export function checkAccountBondAffordability(
    balances: ResourceBalanceInfoI[],
    requiredAmount: string
): BondAffordabilityResultI {
    const sufficientBalances: SufficientBalanceInfoI[] = [];
    const insufficientBalances: InsufficientBalanceInfoI[] = [];
    const requiredDecimal = new Decimal(requiredAmount);

    for (const item of balances) {
        const balanceDecimal = new Decimal(item.balance);
        const hasEnough = balanceDecimal.gte(requiredDecimal);

        if (hasEnough) {
            sufficientBalances.push({
                resource: item.resource,
                balance: item.balance
            });
        } else {
            const shortfall = requiredDecimal.minus(balanceDecimal);
            insufficientBalances.push({
                resource: item.resource,
                balance: item.balance,
                shortfall: shortfall.toFixed(6)
            });
        }
    }

    return {
        requiredAmount,
        sufficientBalances,
        insufficientBalances
    };
}

