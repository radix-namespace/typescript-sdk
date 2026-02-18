import { sendTransaction } from "../../utils/transaction.utils";

import errors from "../../mappings/errors";
import { deleteContextRecordsManifest } from "../../manifests/records/delete-context-manifest";

import { transactionError, transactionResponse } from "../../utils/response.utils";
import { TransactionFeedbackStackI, SdkTransactionResponseT } from "../../common/response.types";
import { DeleteContextRecordsDispatcherPropsI } from "../../common/dispatcher.types";
import { SubDomainDataI, DomainDataI } from "../../common/domain.types";

/**
 * Delete Context Records Dispatcher
 * 
 * Deletes all records within a context by calling delete_context_records 
 * on the domain's DomainSubregistry component.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account deleting the records
 * @param domainDetails - Domain or subdomain details
 * @param context - Context to delete all records from
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchDeleteContextRecords({
    sdkInstance,
    rdt,
    accountAddress,
    domainDetails,
    context,
    callbacks
}: DeleteContextRecordsDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        if (!context) {
            return transactionError(errors.record.contextDeletion({ 
                context: '', 
                verbose: "Context is required" 
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
            return transactionError(errors.record.contextDeletion({ 
                context, 
                verbose: "Domain does not have a subregistry component address" 
            }));
        }

        const manifest = deleteContextRecordsManifest({
            sdkInstance,
            accountAddress,
            domainId,
            subregistryAddress,
            subdomainName,
            context
        });

        await sendTransaction({
            rdt,
            message: `Delete all records in context "${context}" from ${domainDetails.name}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'CONTEXT_RECORDS_SUCCESSFULLY_DELETED',
            details: `All records in context "${context}" were successfully deleted from ${domainDetails.name}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.record.contextDeletion({ context, verbose: message }));
    }

}

