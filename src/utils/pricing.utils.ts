import Decimal from "decimal.js";
import { stripExtension } from "./domain.utils";
import { RegistrationCostBreakdownI } from "../common/response.types";

/**
 * Gets required bond units from the price ladder
 * 
 * @param domain - Domain name (e.g., "example.xrd")
 * @param priceLadder - Price ladder from Radix Namespace component (keys are string representations of i64)
 * @returns Required bond units as string (e.g., "120" for 3-char domain)
 */
export function getDomainPrice(domain: string, priceLadder: Record<string, string>): string {
    const domainWithoutExtension = stripExtension(domain);
    const length = domainWithoutExtension.length;
    
    // Check if length exists in price ladder
    const price = priceLadder[length.toString()];
    
    if (price) {
        return price;
    }
    
    // Default fallback
    return "4";
}

/**
 * Gets the full registration cost breakdown
 * 
 * Provides a detailed breakdown of all costs for domain registration:
 * - Bond amount: Base price from pricing tier (refundable when domain is released)
 * - Registrar fee: Percentage of bond amount (non-refundable, goes to registrar)
 * - Total: Combined amount needed to complete registration
 * 
 * @param domain - Domain name (e.g., "example.xrd")
 * @param priceLadder - Price ladder from Radix Namespace component
 * @param registrarFeePercentage - Registrar's fee percentage (e.g., Decimal(2.5) for 2.5%)
 * @param registrarId - Registrar badge ID
 * @param registrarName - Registrar name for display
 * @param paymentResource - Payment resource address
 * @returns Detailed cost breakdown
 */
export function getCostBreakdown(
    domain: string,
    priceLadder: Record<string, string>,
    registrarFeePercentage: Decimal,
    registrarId: string,
    registrarName: string,
    paymentResource: string
): RegistrationCostBreakdownI {
    // Get bond amount from price ladder
    const bondAmount = getDomainPrice(domain, priceLadder);
    const bondAmountDecimal = new Decimal(bondAmount);
    
    // Calculate registrar fee: bondAmount * (feePercentage / 100)
    const feePercentageNum = registrarFeePercentage.toNumber();
    const registrarFeeDecimal = bondAmountDecimal.mul(feePercentageNum).div(100);
    
    // Calculate total
    const totalDecimal = bondAmountDecimal.plus(registrarFeeDecimal);
    
    return {
        domain,
        bondAmount,
        registrarFee: registrarFeeDecimal.toFixed(6),
        registrarFeePercentage: registrarFeePercentage.toString(),
        totalAmount: totalDecimal.toFixed(6),
        paymentResource,
        registrarId,
        registrarName
    };
}