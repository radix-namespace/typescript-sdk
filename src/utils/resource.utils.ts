import { 
    EntityMetadataItem,
    EntityMetadataItemValue
} from "@radixdlt/babylon-gateway-api-sdk";

/**
 * Resource Metadata Parsing Utilities
 * 
 * These utilities parse Gateway API metadata responses into structured formats
 * following Radix metadata standards.
 */

/**
 * Extracts a string metadata value from Gateway API metadata items
 */
function getMetadataValue(metadataItems: EntityMetadataItem[], key: string): string | null {
    const item = metadataItems?.find((m) => m.key === key);
    if (!item?.value) return null;

    const value = item.value as EntityMetadataItemValue;
    
    // Handle typed values (most common)
    if ('typed' in value && value.typed) {
        const typedValue = value.typed;
        
        // String type has 'value' property
        if (typedValue.type === 'String' && 'value' in typedValue) {
            return typedValue.value;
        }
        
        // Url type also has 'value' property
        if (typedValue.type === 'Url' && 'value' in typedValue) {
            return typedValue.value;
        }
    }
    
    return null;
}

/**
 * Extracts metadata array values (like tags)
 */
function getMetadataArrayValue(metadataItems: EntityMetadataItem[], key: string): string[] {
    const item = metadataItems?.find((m) => m.key === key);
    if (!item?.value) return [];

    const value = item.value as EntityMetadataItemValue;
    
    if ('typed' in value && value.typed) {
        const typedValue = value.typed;
        
        // StringArray type has 'values' property with Array<string>
        if (typedValue.type === 'StringArray' && 'values' in typedValue) {
            return typedValue.values as string[];
        }
        
        // UrlArray type also has 'values' property with Array<string>
        if (typedValue.type === 'UrlArray' && 'values' in typedValue) {
            return typedValue.values as string[];
        }
    }
    
    return [];
}

/**
 * Parses Gateway API metadata items into a structured format
 * following Radix metadata standards
 * 
 * Reference: https://docs.radixdlt.com/docs/metadata-for-wallet-display
 * 
 * @param metadataItems - Raw metadata items from Gateway API
 * @returns Structured metadata object with parsed fields
 */
export function parseResourceMetadata(metadataItems: EntityMetadataItem[]): {
    name: string | null;
    symbol: string | null;
    description: string | null;
    tags: string[];
    icon_url: string | null;
    info_url: string | null;
} {
    return {
        name: getMetadataValue(metadataItems, 'name'),
        symbol: getMetadataValue(metadataItems, 'symbol'),
        description: getMetadataValue(metadataItems, 'description'),
        tags: getMetadataArrayValue(metadataItems, 'tags'),
        icon_url: getMetadataValue(metadataItems, 'icon_url'),
        info_url: getMetadataValue(metadataItems, 'info_url')
    };
}

