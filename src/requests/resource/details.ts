import { StateEntityDetailsResponseItem } from "@radixdlt/babylon-gateway-api-sdk";
import { logger } from "../../utils/log.utils";
import { ResourceDetailsI, ResourceTypeT } from "../../common/resource.types";
import { parseResourceMetadata } from "../../utils/resource.utils";
import { InstancePropsI } from "../../common/entities.types";

/**
 * In-memory cache for resource details to avoid duplicate Gateway API requests
 * Structure: Map<resourceAddress, ResourceDetailsI>
 */
const resourceDetailsCache = new Map<string, ResourceDetailsI>();

/**
 * Determines resource type from Gateway API response
 */
function getResourceType(resourceDetails: StateEntityDetailsResponseItem): ResourceTypeT {
    const type = resourceDetails?.details?.type;
    if (type === 'FungibleResource') return 'fungible';
    if (type === 'NonFungibleResource') return 'non-fungible';
    return 'fungible'; // Default fallback
}

/**
 * Fetches resource details from Gateway API with memoization
 * Returns structured metadata following Radix standards with flattened access
 * 
 * @param resourceAddress - Resource address to query
 * @param sdkInstance - SDK instance props with state client
 * @returns Structured resource details with parsed metadata
 * 
 * @example
 * ```typescript
 * const resource = await requestResourceDetails("resource_tdx_...", { sdkInstance });
 * console.log(resource.name);      // "Fake USD"
 * console.log(resource.symbol);    // "fUSD"
 * console.log(resource.icon_url);  // "https://..."
 * ```
 */
export async function requestResourceDetails(
    resourceAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<ResourceDetailsI | Error> {
    // Check cache first
    if (resourceDetailsCache.has(resourceAddress)) {
        return resourceDetailsCache.get(resourceAddress)!;
    }

    try {
        // Fetch from Gateway API
        const response = await sdkInstance.state.innerClient.stateEntityDetails({
            stateEntityDetailsRequest: {
                addresses: [resourceAddress]
            }
        });

        const resourceDetails = response.items[0];
        
        if (!resourceDetails) {
            throw new Error(`Resource not found: ${resourceAddress}`);
        }

        // Extract metadata items
        const metadataItems = resourceDetails.metadata?.items || [];
        
        // Parse into flattened structured format using utils
        const metadata = parseResourceMetadata(metadataItems);
        
        const structured: ResourceDetailsI = {
            address: resourceAddress,
            type: getResourceType(resourceDetails),
            ...metadata
        };

        // Cache the result
        resourceDetailsCache.set(resourceAddress, structured);

        return structured;
    } catch (error) {
        logger.error("requestResourceDetails", error);
        
        // Return minimal fallback object
        const fallback: ResourceDetailsI = {
            address: resourceAddress,
            type: 'fungible',
            name: null,
            symbol: null,
            description: null,
            tags: [],
            icon_url: null,
            info_url: null
        };
        
        resourceDetailsCache.set(resourceAddress, fallback);
        return fallback;
    }
}

/**
 * Clears the resource details cache
 * Useful for testing or when you want to force fresh data
 */
export function clearResourceDetailsCache(): void {
    resourceDetailsCache.clear();
}

