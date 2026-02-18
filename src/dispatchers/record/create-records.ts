import { sendTransaction } from "../../utils/transaction.utils";

import errors from "../../mappings/errors";
import { createRecordsManifest } from "../../manifests/records/create-records-manifest";

import { transactionError, transactionResponse } from "../../utils/response.utils";
import { TransactionFeedbackStackI, SdkTransactionResponseT } from "../../common/response.types";
import { CreateRecordsDispatcherPropsI } from "../../common/dispatcher.types";
import { SubDomainDataI, DomainDataI } from "../../common/domain.types";

/**
 * Create Records Dispatcher (Batch)
 * 
 * Creates multiple records by calling set_records_batch on the domain's DomainSubregistry component.
 * Records are stored as context-directive-value triplets in the subregistry's KeyValueStore.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account creating the records
 * @param domainDetails - Domain or subdomain details
 * @param records - Array of records to create
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchCreateRecords({
    sdkInstance,
    rdt,
    accountAddress,
    domainDetails,
    records,
    callbacks
}: CreateRecordsDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        if (!records || records.length === 0) {
            return transactionError(errors.record.batchCreation({ 
                verbose: "No records provided for batch creation" 
            }));
        }

        const isSubdomain = sdkInstance.utils.isSubdomain(domainDetails.name);

        let domainId: string;
        let subregistryAddress: string;
        let subdomainName: string | undefined;

        if (isSubdomain) {
            const subdomainDetails = domainDetails as SubDomainDataI;
            domainId = subdomainDetails.root_domain.id;
            subregistryAddress = subdomainDetails.root_domain.subregistry_component_address;
            subdomainName = subdomainDetails.name;
        } else {
            const rootDomainDetails = domainDetails as DomainDataI;
            domainId = rootDomainDetails.id;
            subregistryAddress = rootDomainDetails.subregistry_component_address;
            subdomainName = undefined;
        }

        if (!subregistryAddress) {
            return transactionError(errors.record.batchCreation({ 
                verbose: "Domain does not have a subregistry component address" 
            }));
        }

        // Validate all records have required fields
        for (const record of records) {
            if (!record.context || !record.directive) {
                return transactionError(errors.record.batchCreation({ 
                    verbose: "Each record must have a context and directive" 
                }));
            }
        }

        const manifest = createRecordsManifest({
            sdkInstance,
            accountAddress,
            domainId,
            subregistryAddress,
            subdomainName,
            records
        });

        await sendTransaction({
            rdt,
            message: `Set ${records.length} record(s) for ${domainDetails.name}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'RECORDS_SUCCESSFULLY_CREATED',
            details: `${records.length} record(s) were successfully set for ${domainDetails.name}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.record.batchCreation({ verbose: message }));
    }

}

