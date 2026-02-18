/**
 * Resource Metadata Types
 * 
 * Follows Radix metadata standards for wallet display
 * Reference: https://docs.radixdlt.com/docs/metadata-for-wallet-display
 */

/**
 * Resource type classification
 */
export type ResourceTypeT = 'fungible' | 'non-fungible';

/**
 * Resource details with flattened metadata structure
 * Follows Radix metadata standards for easy access
 * 
 * @example
 * ```typescript
 * resource.name         // "Fake USD"
 * resource.symbol       // "fUSD"
 * resource.icon_url     // "https://..."
 * ```
 */
export interface ResourceDetailsI {
    /** Resource address */
    address: string;
    
    /** Resource type */
    type: ResourceTypeT;
    
    /** 
     * Simple name of the asset (e.g., "Fake USD", "Bitcoin")
     * May be truncated after 32 characters
     */
    name: string | null;
    
    /** 
     * Short unique identifier for fungible resources (e.g., "BTC", "fUSD")
     * Max 5 characters, alphanumeric, all caps, no whitespace
     * null for non-fungible resources
     */
    symbol: string | null;
    
    /** 
     * Description of the asset and its purpose
     * May be truncated after 256 characters
     */
    description: string | null;
    
    /** 
     * Descriptive tags (e.g., ["badge", "gaming"])
     * Alphanumeric, no caps, dashes for spaces
     * May be truncated after 16 characters each, first 100 tags only
     */
    tags: string[];
    
    /** 
     * URL to image representing the token
     * Should be designed as circle for fungible, square for NFTs
     * Supported: JPG, PNG, GIF, WEBP, SVG
     */
    icon_url: string | null;
    
    /** 
     * Direct link to informational webpage about the resource
     */
    info_url: string | null;
}

