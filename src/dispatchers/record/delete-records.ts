import { sendTransaction } from "../../utils/transaction.utils";

import errors from "../../mappings/errors";
import { deleteRecordsManifest } from "../../manifests/records/delete-records-manifest";

import { transactionError, transactionResponse } from "../../utils/response.utils";
import { TransactionFeedbackStackI, SdkTransactionResponseT } from "../../common/response.types";
import { DeleteRecordsDispatcherPropsI } from "../../common/dispatcher.types";
import { SubDomainDataI, DomainDataI } from "../../common/domain.types";

/**
 * Delete Records Dispatcher (Batch)
 * 
 * Deletes multiple records by calling delete_records_batch on the domain's DomainSubregistry component.
 * Records are identified by context+directive pairs.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account deleting the records
 * @param domainDetails - Domain or subdomain details
 * @param records - Array of record keys to delete
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchDeleteRecords({
    sdkInstance,
    rdt,
    accountAddress,
    domainDetails,
    records,
    callbacks
}: DeleteRecordsDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        if (!records || records.length === 0) {
            return transactionError(errors.record.batchDeletion({ 
                verbose: "No records provided for batch deletion" 
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
            return transactionError(errors.record.batchDeletion({ 
                verbose: "Domain does not have a subregistry component address" 
            }));
        }

        // Validate all records have required fields
        for (const record of records) {
            if (!record.context || !record.directive) {
                return transactionError(errors.record.batchDeletion({ 
                    verbose: "Each record must have a context and directive" 
                }));
            }
        }

        const manifest = deleteRecordsManifest({
            sdkInstance,
            accountAddress,
            domainId,
            subregistryAddress,
            subdomainName,
            records
        });

        await sendTransaction({
            rdt,
            message: `Delete ${records.length} record(s) from ${domainDetails.name}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'RECORDS_SUCCESSFULLY_DELETED',
            details: `${records.length} record(s) were successfully deleted from ${domainDetails.name}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.record.batchDeletion({ verbose: message }));
    }

}

