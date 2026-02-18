/**
 * Parses Radix ledger/wallet errors into human-readable messages
 */

interface ErrorPattern {
    pattern: RegExp;
    message: (match: RegExpMatchArray) => string;
}

const errorPatterns: ErrorPattern[] = [
    {
        // VaultDoesNotExist - user doesn't have the payment token
        pattern: /VaultDoesNotExist.*resource_address.*"(resource_[^"]+)"/,
        message: (match) => `Your wallet does not contain the required payment token (${shortenAddress(match[1])}). Please ensure you have the accepted payment resource in your account.`
    },
    {
        // InsufficientBalance
        pattern: /InsufficientBalance|insufficient.*balance/i,
        message: () => `Insufficient balance. Your account does not have enough tokens to complete this transaction.`
    },
    {
        // User rejected/cancelled transaction
        pattern: /user.*(?:rejected|cancelled|canceled|denied)/i,
        message: () => `Transaction was cancelled by user.`
    },
    {
        // User rejected in wallet
        pattern: /rejectedByUser/i,
        message: () => `Transaction was rejected in the wallet.`
    },
    {
        // Failed to submit
        pattern: /failed.*submit|submission.*failed/i,
        message: () => `Failed to submit transaction to the network. Please try again.`
    },
    {
        // Domain already registered
        pattern: /domain.*already.*(?:registered|exists|taken)/i,
        message: () => `This domain is already registered.`
    },
    {
        // Not authorized / Auth error
        pattern: /not.*authorized|authorization.*failed|auth.*error/i,
        message: () => `Authorization failed. You may not have permission to perform this action.`
    },
    {
        // Proof required
        pattern: /proof.*required|missing.*proof/i,
        message: () => `Required proof not found. Ensure you own the necessary NFT or badge.`
    },
    {
        // Invalid NonFungibleLocalId
        pattern: /NonFungibleLocalId|invalid.*id/i,
        message: () => `Invalid ID format provided.`
    },
    {
        // Network/connection errors
        pattern: /network.*error|connection.*(?:failed|refused|timeout)/i,
        message: () => `Network connection error. Please check your connection and try again.`
    },
    {
        // Wallet not connected
        pattern: /wallet.*not.*connected|no.*wallet/i,
        message: () => `Wallet is not connected. Please connect your Radix wallet.`
    },
    {
        // RDT not initialized
        pattern: /Radix.*Dapp.*Toolkit.*(?:not|must).*initialized/i,
        message: () => `Wallet connection not initialized. Please ensure the dApp is properly connected.`
    }
];

/**
 * Shortens a Radix address for display
 */
function shortenAddress(address: string): string {
    if (address.length <= 20) return address;
    return `${address.slice(0, 12)}...${address.slice(-8)}`;
}

/**
 * Parses a raw error message and returns a human-readable version
 * Falls back to the original message if no pattern matches
 */
export function parseErrorMessage(rawError: string): string {
    for (const { pattern, message } of errorPatterns) {
        const match = rawError.match(pattern);
        if (match) {
            return message(match);
        }
    }
    
    // If no pattern matched, clean up the raw error a bit
    // Remove "errorMessage=" prefix if present
    let cleaned = rawError.replace(/^errorMessage=/i, '');
    
    // If it's still very technical, return a generic message with the raw error
    if (cleaned.includes('ApplicationError') || cleaned.includes('::') || cleaned.length > 200) {
        return `Transaction failed. Technical details: ${cleaned.slice(0, 150)}${cleaned.length > 150 ? '...' : ''}`;
    }
    
    return cleaned;
}

