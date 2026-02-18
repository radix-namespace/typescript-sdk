import { InstancePropsI } from "../../common/entities.types";
import { PaginatedRegistrarsResponseI } from "../../common/registrar.types";
import { PaginationParamsI, PaginationInfoI } from "../../common/pagination.types";
import { logger } from "../../utils/log.utils";
import { stripNonFungibleLocalIdBrackets } from "../../utils/domain.utils";

/**
 * Gets total count of registrar badges
 */
async function getTotalRegistrarCount(
    registrarBadgeResource: string,
    { sdkInstance }: InstancePropsI
): Promise<number> {
    let totalCount = 0;
    let cursor: string | null | undefined = undefined;

    do {
        const response = await sdkInstance.state.innerClient.nonFungibleIds({
            stateNonFungibleIdsRequest: {
                resource_address: registrarBadgeResource,
                cursor: cursor,
                limit_per_page: 100
            }
        });

        totalCount += response.non_fungible_ids?.items?.length || 0;
        cursor = response.non_fungible_ids?.next_cursor || null;
    } while (cursor !== null && cursor !== undefined);

    return totalCount;
}

/**
 * Fetches registrar badge IDs from the Radix Namespace component with pagination support
 * 
 * This function queries the registrar badge resource to retrieve registrar IDs.
 * 
 * @param sdkInstance - The RNS SDK instance containing state and entities
 * @param pagination - Optional pagination parameters
 * @returns Paginated registrar badge IDs or Error
 * 
 * @example
 * ```typescript
 * const result = await requestAllRegistrars({ sdkInstance: rns });
 * if (result instanceof Error) {
 *   console.error('Failed to fetch registrars:', result.message);
 * } else {
 *   console.log(`Found ${result.registrar_ids.length} registrars on this page`);
 *   console.log(`Total: ${result.pagination.total_count}`);
 * }
 * ```
 */
export async function requestAllRegistrars(
    { sdkInstance }: InstancePropsI,
    pagination?: PaginationParamsI
): Promise<PaginatedRegistrarsResponseI | Error> {
    try {
        const registrarBadgeResource = sdkInstance.entities.rnsCore.registrarBadgeResource;

        if (!registrarBadgeResource) {
            throw new Error('Registrar badge resource not found in RNS entities');
        }

        const currentPage = pagination?.page || 1;

        // Navigate to the requested page
        let cursor: string | null | undefined = undefined;
        let pageNumber = 1;

        while (pageNumber < currentPage) {
            const response = await sdkInstance.state.innerClient.nonFungibleIds({
                stateNonFungibleIdsRequest: {
                    resource_address: registrarBadgeResource,
                    cursor: cursor,
                    limit_per_page: 100
                }
            });

            if (!response.non_fungible_ids?.next_cursor) {
                // Requested page doesn't exist
                return {
                    registrar_ids: [],
                    pagination: {
                        next_page: null,
                        previous_page: currentPage > 1 ? currentPage - 1 : null,
                        total_count: 0,
                        current_page_count: 0
                    }
                };
            }

            cursor = response.non_fungible_ids.next_cursor;
            pageNumber++;
        }

        // Fetch the current page
        const response = await sdkInstance.state.innerClient.nonFungibleIds({
            stateNonFungibleIdsRequest: {
                resource_address: registrarBadgeResource,
                cursor: cursor,
                limit_per_page: 100
            }
        });

        // Strip brackets from badge IDs for clean user-facing output
        const badgeIds = (response.non_fungible_ids?.items || []).map(stripNonFungibleLocalIdBrackets);

        // Calculate total count if on first page
        let totalCount = 0;
        if (currentPage === 1) {
            totalCount = await getTotalRegistrarCount(registrarBadgeResource, { sdkInstance });
        }

        const paginationInfo: PaginationInfoI = {
            next_page: response.non_fungible_ids?.next_cursor ? currentPage + 1 : null,
            previous_page: currentPage > 1 ? currentPage - 1 : null,
            total_count: totalCount,
            current_page_count: badgeIds.length
        };

        return {
            registrar_ids: badgeIds,
            pagination: paginationInfo
        };
    } catch (e) {
        logger.error("requestAllRegistrars", e);
        return e as Error;
    }
}

