import importDomainManifest from "../../manifests/domains/import-domain-manifest";

import { sendTransaction } from "../../utils/transaction.utils";
import { transactionError, transactionResponse } from "../../utils/response.utils";
import { getDomainPrice } from "../../utils/pricing.utils";
import { getAccountBondBalances, checkAccountBondAffordability } from "../../utils/balance.utils";
import { domainToNonFungId } from "../../utils/domain.utils";
import errors from "../../mappings/errors";

import { ImportDomainDispatcherPropsI } from "../../common/dispatcher.types";
import { SdkTransactionResponseT, TransactionFeedbackStackI } from "../../common/response.types";

/**
 * Import Accepted Domain Dispatcher
 * 
 * Imports an accepted domain into the Radix Namespace system. The import domain NFT
 * stays in the user's account and only a proof is presented to the component.
 * A new domain NFT is issued with a dedicated subregistry component.
 * 
 * Key differences from regular registration:
 * - No registrar required (no registrar fees)
 * - Uses import domain NFT proof as input
 * - Import domain stays in user's account
 * - Payment covers only the bond amount (refundable on unbond)
 * 
 * Note: Import domain ownership is validated by proving the NFT via create_proof_of_non_fungibles.
 * If the user doesn't own the import domain, the transaction will fail.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param domain - Domain name to import (e.g., "example.xrd")
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account holding the import domain
 * @param paymentResource - Optional payment resource (defaults to first accepted)
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchImportDomain({
    sdkInstance,
    domain,
    rdt,
    accountAddress,
    paymentResource,
    callbacks
}: ImportDomainDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {

        // Get the import domain NFT ID
        const importDomainId = await domainToNonFungId(domain);

        // Check if domain is already registered
        try {
            const registryResponse = await sdkInstance.state.innerClient.keyValueStoreData({
                stateKeyValueStoreDataRequest: {
                    key_value_store_address: sdkInstance.entities.rnsCore.domainRegistry,
                    keys: [{ key_json: { kind: 'String', value: domain } }]
                }
            });

            if (registryResponse.entries && registryResponse.entries.length > 0) {
                return transactionError(errors.importDomain.alreadyImported({ 
                    domain, 
                    verbose: "Domain has already been imported/registered" 
                }));
            }
        } catch {
            // KVS lookup failed - continue with import attempt
        }

        // Determine payment resource (default to first accepted)
        const selectedPaymentResource = paymentResource 
            || sdkInstance.entities.rnsCore.acceptedPaymentResources[0];

        if (!selectedPaymentResource) {
            return transactionError(errors.importDomain.generic({ 
                domain, 
                verbose: "No accepted payment resources configured" 
            }));
        }

        // Calculate bond amount from price ladder (no registrar fees for imports)
        const bondAmount = getDomainPrice(domain, sdkInstance.entities.rnsCore.priceLadder);

        // Pre-check if user has sufficient balance before attempting transaction
        const balances = await getAccountBondBalances(
            accountAddress,
            sdkInstance.entities.rnsCore.acceptedPaymentResources,
            { sdkInstance }
        );

        const affordabilityCheck = checkAccountBondAffordability(balances.balances, bondAmount);

        if (affordabilityCheck.sufficientBalances.length === 0) {
            const shortfalls = affordabilityCheck.insufficientBalances
                .map(r => `${r.resource.name || r.resource.address}: have ${r.balance}, need ${bondAmount} (short ${r.shortfall})`)
                .join('; ');
            
            return transactionError(errors.balance.insufficientFunds({ 
                requiredAmount: bondAmount,
                verbose: `Insufficient balance for import bond. ${shortfalls}`
            }));
        }

        const manifest = await importDomainManifest({
            sdkInstance,
            accountAddress,
            importDomainId,
            paymentResource: selectedPaymentResource,
            paymentAmount: bondAmount
        });

        await sendTransaction({
            rdt,
            message: `Import ${domain} into Radix Namespace`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'IMPORT_SUCCESSFUL',
            details: `${domain} was successfully imported. Bond amount: ${bondAmount} (no registrar fees).`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.importDomain.generic({ domain, verbose: message }));
    }

}
