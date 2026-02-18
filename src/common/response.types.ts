import Decimal from "decimal.js";
import { StateNonFungibleDetailsResponseItem } from "@radixdlt/babylon-gateway-api-sdk";
import { DomainDataI, PaginatedDomainsResponseI, PaginatedSubdomainsResponseI, DomainStatusT } from "./domain.types";
import { RecordItemI } from "./record.types";
import { ComponentAddressString } from "./entities.types";

export interface ErrorStackI {
    errors: ErrorI[];
}

export interface ErrorI {
    code: string;
    error: string;
    verbose: string | null;
}

export interface ErrorGenerationI {
    verbose?: string | null;
}

export interface TransactionFeedbackI {
    code: string;
    details: string | null;
}

export interface TransactionFeedbackStackI {
    messages: TransactionFeedbackI[];
}

export type SdkResponseT<T> = | { data: T; errors?: undefined } | { data?: undefined; errors: ErrorI[] };

export type SdkTransactionResponseT<T> = | { feedback: T; errors?: undefined } | { feedback?: undefined; errors: ErrorI[] };

export interface ResolvedRecordI {
    value: string;
    nonFungibleDataList?: StateNonFungibleDetailsResponseItem[];
}

/**
 * Domain Status Response
 * Returns the availability status and required bond units for a domain
 */
export type DomainAttributesResponseT = {
    domain: string;
    status: DomainStatusT;
    /** Required bond units (e.g., Decimal("120") for 3-char domain) */
    required_bond_units: Decimal;
    /** Component address of the reserved claimant (only set when status is 'reserved') */
    reserved_for?: string;
};

export type RecordListResponseT = RecordItemI[] | [];
export type RecordResponseT = RecordItemI | null;

export type DomainListResponseT = DomainDataI[] | [];

export type PaginatedDomainListResponseT = PaginatedDomainsResponseI | [];

export type PaginatedSubdomainListResponseT = PaginatedSubdomainsResponseI | [];

export type CheckAuthenticityResponseT = { isAuthentic: boolean };

export type ResolvedRecordResponseT = ResolvedRecordI | null;

/**
 * Registration Cost Breakdown
 * Provides a detailed breakdown of costs for domain registration
 */
export interface RegistrationCostBreakdownI {
    /** Domain name being registered */
    domain: string;
    /** Bond amount (base price from pricing tier, refundable) */
    bondAmount: string;
    /** Registrar fee amount (percentage of bond, non-refundable) */
    registrarFee: string;
    /** Registrar fee percentage used */
    registrarFeePercentage: string;
    /** Total amount required (bond + registrar fee) */
    totalAmount: string;
    /** Payment resource address */
    paymentResource: string;
    /** Registrar badge ID used for the calculation */
    registrarId: string;
    /** Registrar name */
    registrarName: string;
}