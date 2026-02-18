/**
 * NFT ID Utilities
 * 
 * Utilities for handling NonFungibleLocalId formatting and parsing.
 * Radix NFTs use three bracket formats:
 * - #n# for integer IDs (e.g., #1#, #123#)
 * - [hex] for RUID/byte-based IDs (e.g., [abc123def456])
 * - {string} for string-based IDs (less common)
 */

/**
 * Strips brackets from a NonFungibleLocalId to get the raw value.
 * Used to normalize IDs returned from Gateway API for user-friendly output.
 * 
 * @param id - Formatted ID (e.g., "#1#", "[abc123]", "{abc123}")
 * @returns Raw ID without brackets (e.g., "1", "abc123")
 * 
 * @example
 * stripNonFungibleLocalIdBrackets("#1#")       // Returns "1"
 * stripNonFungibleLocalIdBrackets("[abc123]")  // Returns "abc123"
 * stripNonFungibleLocalIdBrackets("1")         // Returns "1" (no change)
 */
export function stripNonFungibleLocalIdBrackets(id: string): string {
    const trimmed = id.trim();
    
    if ((trimmed.startsWith('#') && trimmed.endsWith('#')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        return trimmed.slice(1, -1);
    }
    
    return trimmed;
}

/**
 * Formats a NonFungibleLocalId for use in transaction manifests.
 * Always strips any existing brackets and re-formats consistently.
 * 
 * @param id - Raw ID with or without brackets (e.g., "1", "#1#", "[abc123]")
 * @returns Formatted NonFungibleLocalId string
 * 
 * @example
 * formatNonFungibleLocalId("1")           // Returns "#1#"
 * formatNonFungibleLocalId("#1#")         // Returns "#1#"
 * formatNonFungibleLocalId("123")         // Returns "#123#"
 * formatNonFungibleLocalId("abc123def")   // Returns "[abc123def]"
 * formatNonFungibleLocalId("[abc123]")    // Returns "[abc123]"
 * formatNonFungibleLocalId("{abc123}")    // Returns "[abc123]"
 */
export function formatNonFungibleLocalId(id: string): string {
    const raw = stripNonFungibleLocalIdBrackets(id);
    
    // If it's a pure integer, format as #n#
    if (/^\d+$/.test(raw)) {
        return `#${raw}#`;
    }
    
    // Otherwise assume it's a RUID/hex string, format as [hex]
    return `[${raw}]`;
}

/**
 * Checks if a NonFungibleLocalId is in integer format
 * 
 * @param id - ID to check (with or without brackets)
 * @returns true if the ID is an integer ID
 * 
 * @example
 * isIntegerId("#1#")      // Returns true
 * isIntegerId("123")      // Returns true
 * isIntegerId("[abc123]") // Returns false
 */
export function isIntegerId(id: string): boolean {
    const raw = stripNonFungibleLocalIdBrackets(id);
    return /^\d+$/.test(raw);
}

/**
 * Checks if a NonFungibleLocalId is in RUID/byte format
 * 
 * @param id - ID to check (with or without brackets)
 * @returns true if the ID is a RUID/byte ID
 * 
 * @example
 * isRuidId("[abc123]")    // Returns true
 * isRuidId("abc123def")   // Returns true
 * isRuidId("#1#")         // Returns false
 */
export function isRuidId(id: string): boolean {
    const raw = stripNonFungibleLocalIdBrackets(id);
    return !isIntegerId(id) && /^[a-f0-9]+$/i.test(raw);
}

