import errors from "../../mappings/errors";
import { deleteRecordManifest } from "../../manifests/records/delete-record-manifest";

import { transactionError, transactionResponse } from "../../utils/response.utils";
import { sendTransaction } from "../../utils/transaction.utils";

import { TransactionFeedbackStackI, SdkTransactionResponseT } from "../../common/response.types";
import { DeleteRecordDispatcherByIdPropsI, DeleteRecordDispatcherPropsI } from "../../common/dispatcher.types";
import { SubDomainDataI, DomainDataI } from "../../common/domain.types";

/**
 * Record Deletion Dispatcher
 * 
 * Deletes a record by calling delete_record on the domain's DomainSubregistry component.
 * Records are identified by context+directive pairs.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account deleting the record
 * @param domainDetails - Domain or subdomain details
 * @param docket - Record docket with context and directive
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchRecordDeletion({
    sdkInstance,
    rdt,
    accountAddress,
    domainDetails,
    docket,
    callbacks
}: DeleteRecordDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        const isSubdomain = sdkInstance.utils.isSubdomain(domainDetails.name);

        let domainId: string;
        let subregistryAddress: string;

        if (isSubdomain) {
            const subdomainDetails = domainDetails as SubDomainDataI;
            domainId = subdomainDetails.root_domain.id;
            subregistryAddress = subdomainDetails.root_domain.subregistry_component_address;
        } else {
            const rootDomainDetails = domainDetails as DomainDataI;
            domainId = rootDomainDetails.id;
            subregistryAddress = rootDomainDetails.subregistry_component_address;
        }

        if (!subregistryAddress) {
            return transactionError(errors.record.deletion({ 
                docket, 
                verbose: "Domain does not have a subregistry component address" 
            }));
        }

        if (!docket.directive) {
            return transactionError(errors.record.deletion({ 
                docket, 
                verbose: "Directive is required for record deletion" 
            }));
        }

        const manifest = deleteRecordManifest({
            sdkInstance,
            accountAddress,
            domainId,
            subregistryAddress,
            context: docket.context,
            directive: docket.directive
        });

        await sendTransaction({
            rdt,
            message: `Delete record from ${domainDetails.name}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'RECORD_SUCCESSFULLY_DELETED',
            details: `Record ${docket.context}:${docket.directive} was successfully deleted from ${domainDetails.name}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.record.deletion({ docket, verbose: message }));
    }

}

/**
 * Record Deletion by ID Dispatcher
 * 
 * Deletes a record using a composite ID (format: "context:directive").
 * Parses the ID and calls the same delete_record method.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account deleting the record
 * @param domainDetails - Domain or subdomain details
 * @param recordId - Composite record ID (e.g., "profile:wallet_address")
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchRecordDeletionById({
    sdkInstance,
    rdt,
    accountAddress,
    domainDetails,
    recordId,
    callbacks
}: DeleteRecordDispatcherByIdPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        // Parse recordId format "context:directive"
        const [context, directive] = recordId.split(':');

        if (!context || !directive) {
            return transactionError(errors.record.deletionById({ 
                recordId, 
                verbose: "Invalid record ID format. Expected 'context:directive'" 
            }));
        }

        const isSubdomain = sdkInstance.utils.isSubdomain(domainDetails.name);

        let domainId: string;
        let subregistryAddress: string;

        if (isSubdomain) {
            const subdomainDetails = domainDetails as SubDomainDataI;
            domainId = subdomainDetails.root_domain.id;
            subregistryAddress = subdomainDetails.root_domain.subregistry_component_address;
        } else {
            const rootDomainDetails = domainDetails as DomainDataI;
            domainId = rootDomainDetails.id;
            subregistryAddress = rootDomainDetails.subregistry_component_address;
        }

        if (!subregistryAddress) {
            return transactionError(errors.record.deletionById({ 
                recordId, 
                verbose: "Domain does not have a subregistry component address" 
            }));
        }

        const manifest = deleteRecordManifest({
            sdkInstance,
            accountAddress,
            domainId,
            subregistryAddress,
            context,
            directive
        });

        await sendTransaction({
            rdt,
            message: `Delete record from ${domainDetails.name}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'RECORD_SUCCESSFULLY_DELETED',
            details: `Record ${recordId} was successfully deleted from ${domainDetails.name}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.record.deletionById({ recordId, verbose: message }));
    }

}
