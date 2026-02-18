import { 
    ProgrammaticScryptoSborValueMap,
    ProgrammaticScryptoSborValueMapEntry
} from "@radixdlt/babylon-gateway-api-sdk";

import { requestDomainDetails } from "../account/domains";
import { deriveDomainType, deriveRootDomain } from "../../utils/domain.utils";
import { logger } from "../../utils/log.utils";

import { InstancePropsI, ComponentStateI } from "../../common/entities.types";
import { DocketPropsI, RecordItemI, PaginatedRecordsResponseI } from "../../common/record.types";
import { ResolvedRecordI } from "../../common/response.types";
import { PaginationParamsI, PaginationInfoI } from "../../common/pagination.types";


/**
 * Gets the records KeyValueStore address from a subregistry component
 */
async function getRecordsKvStoreAddress(
    subregistryAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<string> {
    const componentDetails = await sdkInstance.state.innerClient.stateEntityDetails({
        stateEntityDetailsRequest: { addresses: [subregistryAddress] }
    });

    const componentItem = componentDetails.items[0];
    if (!componentItem || componentItem.details.type !== 'Component') {
        throw new Error("Could not fetch subregistry component");
    }

    const componentState = componentItem.details.state;
    if (!componentState || !('fields' in componentState)) {
        throw new Error("Could not fetch subregistry state");
    }

    // Find the records KeyValueStore address
    const fields = (componentState as ComponentStateI).fields;
    const recordsKvStoreField = fields.find(
        (f) => f.field_name === 'records'
    );

    if (!recordsKvStoreField || !recordsKvStoreField.value) {
        throw new Error("Records KeyValueStore not found");
    }

    return String(recordsKvStoreField.value);
}

/**
 * Gets the subdomain_records KeyValueStore address from a subregistry component
 */
async function getSubdomainRecordsKvStoreAddress(
    subregistryAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<string> {
    const componentDetails = await sdkInstance.state.innerClient.stateEntityDetails({
        stateEntityDetailsRequest: { addresses: [subregistryAddress] }
    });

    const componentItem = componentDetails.items[0];
    if (!componentItem || componentItem.details.type !== 'Component') {
        throw new Error("Could not fetch subregistry component");
    }

    const componentState = componentItem.details.state;
    if (!componentState || !('fields' in componentState)) {
        throw new Error("Could not fetch subregistry state");
    }

    // Find the subdomain_records KeyValueStore address
    const fields = (componentState as ComponentStateI).fields;
    const subdomainRecordsKvStoreField = fields.find(
        (f) => f.field_name === 'subdomain_records'
    );

    if (!subdomainRecordsKvStoreField || !subdomainRecordsKvStoreField.value) {
        throw new Error("Subdomain records KeyValueStore not found");
    }

    return String(subdomainRecordsKvStoreField.value);
}

/**
 * Parses a HashMap<String, String> from Gateway API
 * Structure: { directive => value }
 */
function parseDirectivesMap(mapValue: ProgrammaticScryptoSborValueMap): Record<string, string> {
    const result: Record<string, string> = {};
    
    if (!mapValue.entries) return result;
    
    for (const entry of mapValue.entries) {
        const typedEntry = entry as ProgrammaticScryptoSborValueMapEntry;
        
        if (typedEntry.key.kind === 'String' && typedEntry.value.kind === 'String') {
            result[typedEntry.key.value] = typedEntry.value.value;
        }
    }
    
    return result;
}

/**
 * Gets total count of contexts in records KeyValueStore
 */
async function getTotalContextCount(
    recordsKvStoreAddress: string,
    { sdkInstance }: InstancePropsI
): Promise<number> {
    let totalCount = 0;
    let cursor: string | undefined = undefined;

    do {
        const response = await sdkInstance.state.innerClient.keyValueStoreKeys({
            stateKeyValueStoreKeysRequest: {
                key_value_store_address: recordsKvStoreAddress,
                cursor: cursor
            }
        });

        totalCount += response.items?.length || 0;
        cursor = response.next_cursor || undefined;
    } while (cursor);

    return totalCount;
}

/**
 * Fetches records for a root domain with pagination support
 * Queries the DomainSubregistry's records KeyValueStore
 * 
 * Structure: KeyValueStore<String, HashMap<String, String>>
 * - Key: context
 * - Value: HashMap<directive, value>
 * 
 * Reference: core-contracts/src/domain_subregistry.rs
 */
export async function requestRecords(
    domainName: string, 
    { sdkInstance }: InstancePropsI,
    pagination?: PaginationParamsI
): Promise<PaginatedRecordsResponseI | Error> {
    try {
        const domainTypeResult = deriveDomainType(domainName);

        if (domainTypeResult.isValid && domainTypeResult.type === 'sub') {
            // Handle subdomain records separately
            return await requestSubdomainRecords(domainName, { sdkInstance }, pagination);
        }

        // Get domain details to find subregistry address
        const domainData = await requestDomainDetails(domainName, { sdkInstance });

        if (!domainData || domainData instanceof Error) {
            throw new Error("Domain not found");
        }

        if (!domainData.subregistry_component_address) {
            throw new Error("Subregistry component address not found");
        }

        // Get records KeyValueStore address
        const recordsKvStoreAddress = await getRecordsKvStoreAddress(
            domainData.subregistry_component_address,
            { sdkInstance }
        );

        const currentPage = pagination?.page || 1;

        // Navigate to the requested page
        let cursor: string | undefined = undefined;
        let pageNumber = 1;

        while (pageNumber < currentPage) {
            const keysResponse = await sdkInstance.state.innerClient.keyValueStoreKeys({
                stateKeyValueStoreKeysRequest: {
                    key_value_store_address: recordsKvStoreAddress,
                    cursor: cursor
                }
            });

            if (!keysResponse.next_cursor) {
                // Requested page doesn't exist
                return {
                    records: [],
                    domain_name: domainName,
                    pagination: {
                        next_page: null,
                        previous_page: currentPage > 1 ? currentPage - 1 : null,
                        total_count: 0,
                        current_page_count: 0
                    }
                };
            }

            cursor = keysResponse.next_cursor;
            pageNumber++;
        }

        // Get the current page of context keys
        const keysResponse = await sdkInstance.state.innerClient.keyValueStoreKeys({
            stateKeyValueStoreKeysRequest: {
                key_value_store_address: recordsKvStoreAddress,
                cursor: cursor
            }
        });

        if (!keysResponse.items || keysResponse.items.length === 0) {
            return {
                records: [],
                domain_name: domainName,
                pagination: {
                    next_page: null,
                    previous_page: currentPage > 1 ? currentPage - 1 : null,
                    total_count: 0,
                    current_page_count: 0
                }
            };
        }

        // Extract context names for this page
        const contexts: string[] = [];
        for (const item of keysResponse.items) {
            if (item.key.programmatic_json.kind === 'String') {
                contexts.push(item.key.programmatic_json.value);
            }
        }

        // Fetch all context records for this page
        const recordsResponse = await sdkInstance.state.innerClient.keyValueStoreData({
            stateKeyValueStoreDataRequest: {
                key_value_store_address: recordsKvStoreAddress,
                keys: contexts.map(context => ({
                    key_json: { kind: 'String' as const, value: context }
                }))
            }
        });

        // Parse all records into flat list
        const records: RecordItemI[] = [];
        
        if (recordsResponse.entries) {
            for (const entry of recordsResponse.entries) {
                const keyJson = entry.key.programmatic_json;
                const context = (keyJson && typeof keyJson === 'object' && 'value' in keyJson && typeof keyJson.value === 'string') 
                    ? keyJson.value 
                    : '';
                const directivesMap = entry.value.programmatic_json as ProgrammaticScryptoSborValueMap;
                
                const directives = parseDirectivesMap(directivesMap);
                
                // Create a record item for each directive
                for (const [directive, value] of Object.entries(directives)) {
                    records.push({
                        context,
                        directive,
                        value,
                        record_id: `${context}:${directive}`,
                        domain_name: domainName,
                        is_subdomain: false
                    });
                }
            }
        }

        // Calculate total count if on first page
        let totalCount = 0;
        if (currentPage === 1) {
            totalCount = await getTotalContextCount(recordsKvStoreAddress, { sdkInstance });
        }

        const paginationInfo: PaginationInfoI = {
            next_page: keysResponse.next_cursor ? currentPage + 1 : null,
            previous_page: currentPage > 1 ? currentPage - 1 : null,
            total_count: totalCount,
            current_page_count: records.length
        };

        return {
            records,
            domain_name: domainName,
            pagination: paginationInfo
        };
    } catch (e) {
        logger.error("requestRecords", e);
        return e as Error;
    }
}

/**
 * Fetches records for a subdomain with pagination support
 * Queries the subdomain_records KeyValueStore with subdomain name as key
 * 
 * Structure: KeyValueStore<String, HashMap<String, HashMap<String, String>>>
 * - Key: subdomain_name
 * - Value: HashMap<context, HashMap<directive, value>>
 * 
 * Note: Subdomain records are stored in a single KV entry, so pagination
 * is less relevant here but we maintain the consistent interface.
 */
async function requestSubdomainRecords(
    subdomainFullName: string,
    { sdkInstance }: InstancePropsI,
    pagination?: PaginationParamsI
): Promise<PaginatedRecordsResponseI | Error> {
    try {
        // Get root domain
        const rootDomainName = deriveRootDomain(subdomainFullName);
        const rootDomainData = await requestDomainDetails(rootDomainName, { sdkInstance });

        if (!rootDomainData || rootDomainData instanceof Error) {
            throw new Error("Root domain not found");
        }

        // Extract subdomain name (e.g., "blog" from "blog.example.xrd")
        const subdomainName = subdomainFullName.split('.')[0];

        // Get subdomain_records KeyValueStore address
        const subdomainRecordsKvStoreAddress = await getSubdomainRecordsKvStoreAddress(
            rootDomainData.subregistry_component_address,
            { sdkInstance }
        );

        // Query subdomain records with subdomain name as key
        const subdomainRecordsResponse = await sdkInstance.state.innerClient.keyValueStoreData({
            stateKeyValueStoreDataRequest: {
                key_value_store_address: subdomainRecordsKvStoreAddress,
                keys: [{ key_json: { kind: 'String', value: subdomainName } }]
            }
        });

        if (!subdomainRecordsResponse.entries || subdomainRecordsResponse.entries.length === 0) {
            return {
                records: [],
                domain_name: subdomainFullName,
                pagination: {
                    next_page: null,
                    previous_page: null,
                    total_count: 0,
                    current_page_count: 0
                }
            };
        }

        // Parse nested HashMap<context, HashMap<directive, value>>
        const contextMapValue = subdomainRecordsResponse.entries[0].value.programmatic_json as ProgrammaticScryptoSborValueMap;
        
        const records: RecordItemI[] = [];
        
        if (contextMapValue.entries) {
            for (const contextEntry of contextMapValue.entries) {
                const typedContextEntry = contextEntry as ProgrammaticScryptoSborValueMapEntry;
                
                if (typedContextEntry.key.kind === 'String' && typedContextEntry.value.kind === 'Map') {
                    const context = typedContextEntry.key.value;
                    const directivesMap = typedContextEntry.value as ProgrammaticScryptoSborValueMap;
                    const directives = parseDirectivesMap(directivesMap);
                    
                    // Create a record item for each directive
                    for (const [directive, value] of Object.entries(directives)) {
                        records.push({
                            context,
                            directive,
                            value,
                            record_id: `${context}:${directive}`,
                            domain_name: subdomainFullName,
                            is_subdomain: true
                        });
                    }
                }
            }
        }

        // Subdomain records are stored in a single entry, so no real pagination needed
        // But we maintain consistent interface
        return {
            records,
            domain_name: subdomainFullName,
            pagination: {
                next_page: null,
                previous_page: null,
                total_count: records.length,
                current_page_count: records.length
            }
        };
    } catch (e) {
        logger.error("requestSubdomainRecords", e);
        return e as Error;
    }
}

/**
 * Resolves a specific record by context and directive
 * 
 * @param domain - Domain or subdomain name
 * @param docket - Record query parameters (context, directive)
 * @param sdkInstance - SDK instance
 * @returns Record value if found, null if not found
 */
export async function resolveRecord(
    domain: string, 
    { context, directive }: DocketPropsI, 
    { sdkInstance }: InstancePropsI
): Promise<ResolvedRecordI | null | Error> {
    try {
        const domainTypeResult = deriveDomainType(domain);

        if (domainTypeResult.isValid && domainTypeResult.type === 'sub') {
            // Resolve subdomain record
            return await resolveSubdomainRecord(domain, context, directive, { sdkInstance });
        }

        // Get domain details to find subregistry address
        const domainData = await requestDomainDetails(domain, { sdkInstance });

        if (!domainData || domainData instanceof Error) {
            throw new Error("Domain not found");
        }

        if (!domainData.subregistry_component_address) {
            throw new Error("Subregistry component address not found");
        }

        // Get records KeyValueStore address
        const recordsKvStoreAddress = await getRecordsKvStoreAddress(
            domainData.subregistry_component_address,
            { sdkInstance }
        );

        // Query the specific context
        const contextResponse = await sdkInstance.state.innerClient.keyValueStoreData({
            stateKeyValueStoreDataRequest: {
                key_value_store_address: recordsKvStoreAddress,
                keys: [{ key_json: { kind: 'String', value: context } }]
            }
        });

        if (!contextResponse.entries || contextResponse.entries.length === 0) {
            return null; // Context doesn't exist
        }

        // Parse directives map
        const directivesMap = contextResponse.entries[0].value.programmatic_json as ProgrammaticScryptoSborValueMap;
        const directives = parseDirectivesMap(directivesMap);

        // Get the specific directive value
        const value = directives[directive] || null;

        return { value };
    } catch (e) {
        logger.error("resolveRecord", e);
        return e as Error;
    }
}

/**
 * Resolves a specific subdomain record
 */
async function resolveSubdomainRecord(
    subdomainFullName: string,
    context: string,
    directive: string,
    { sdkInstance }: InstancePropsI
): Promise<ResolvedRecordI | null | Error> {
    try {
        // Get root domain
        const rootDomainName = deriveRootDomain(subdomainFullName);
        const rootDomainData = await requestDomainDetails(rootDomainName, { sdkInstance });

        if (!rootDomainData || rootDomainData instanceof Error) {
            throw new Error("Root domain not found");
        }

        // Extract subdomain name
        const subdomainName = subdomainFullName.split('.')[0];

        // Get subdomain_records KeyValueStore address
        const subdomainRecordsKvStoreAddress = await getSubdomainRecordsKvStoreAddress(
            rootDomainData.subregistry_component_address,
            { sdkInstance }
        );

        // Query subdomain records
        const subdomainRecordsResponse = await sdkInstance.state.innerClient.keyValueStoreData({
            stateKeyValueStoreDataRequest: {
                key_value_store_address: subdomainRecordsKvStoreAddress,
                keys: [{ key_json: { kind: 'String', value: subdomainName } }]
            }
        });

        if (!subdomainRecordsResponse.entries || subdomainRecordsResponse.entries.length === 0) {
            return null; // No records for this subdomain
        }

        // Parse nested HashMap<context, HashMap<directive, value>>
        const contextMapValue = subdomainRecordsResponse.entries[0].value.programmatic_json as ProgrammaticScryptoSborValueMap;
        
        if (!contextMapValue.entries) {
            return null;
        }

        // Find the specific context
        for (const contextEntry of contextMapValue.entries) {
            const typedContextEntry = contextEntry as ProgrammaticScryptoSborValueMapEntry;
            
            if (typedContextEntry.key.kind === 'String' && typedContextEntry.key.value === context) {
                if (typedContextEntry.value.kind === 'Map') {
                    const directivesMap = typedContextEntry.value as ProgrammaticScryptoSborValueMap;
                    const directives = parseDirectivesMap(directivesMap);
                    
                    const value = directives[directive] || null;
                    return { value };
                }
            }
        }

        return null; // Context or directive not found
    } catch (e) {
        logger.error("resolveSubdomainRecord", e);
        return e as Error;
    }
}
