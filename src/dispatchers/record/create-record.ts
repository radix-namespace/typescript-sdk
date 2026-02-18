import { sendTransaction } from "../../utils/transaction.utils";

import errors from "../../mappings/errors";
import { createRecordManifest } from "../../manifests/records/create-record-manifest";

import { transactionError, transactionResponse } from "../../utils/response.utils";
import { TransactionFeedbackStackI, SdkTransactionResponseT } from "../../common/response.types";
import { CreateRecordDispatcherPropsI } from "../../common/dispatcher.types";
import { SubDomainDataI, DomainDataI } from "../../common/domain.types";

/**
 * Record Creation Dispatcher
 * 
 * Creates or updates a record by calling set_record on the domain's DomainSubregistry component.
 * Records are stored as context-directive-value triplets in the subregistry's KeyValueStore.
 * 
 * @param sdkInstance - RNS SDK instance
 * @param rdt - Radix dApp Toolkit instance
 * @param accountAddress - Account creating the record
 * @param domainDetails - Domain or subdomain details
 * @param docket - Record docket with context, directive, and value
 * @param callbacks - Optional transaction callbacks
 * @returns Transaction response
 */
export async function dispatchRecordCreation({
    sdkInstance,
    rdt,
    accountAddress,
    domainDetails,
    docket,
    callbacks
}: CreateRecordDispatcherPropsI): Promise<SdkTransactionResponseT<TransactionFeedbackStackI>> {

    try {
        const isSubdomain = sdkInstance.utils.isSubdomain(domainDetails.name);

        let domainId: string;
        let subregistryAddress: string;
        let subdomainName: string | undefined;

        if (isSubdomain) {
            const subdomainDetails = domainDetails as SubDomainDataI;
            domainId = subdomainDetails.root_domain.id;
            subregistryAddress = subdomainDetails.root_domain.subregistry_component_address;
            subdomainName = subdomainDetails.name; // Just the subdomain part
        } else {
            const rootDomainDetails = domainDetails as DomainDataI;
            domainId = rootDomainDetails.id;
            subregistryAddress = rootDomainDetails.subregistry_component_address;
            subdomainName = undefined;
        }

        if (!subregistryAddress) {
            return transactionError(errors.record.creation({ 
                docket, 
                verbose: "Domain does not have a subregistry component address" 
            }));
        }

        // Extract value from docket
        const value = typeof docket.value === 'string' ? docket.value : '';

        if (!docket.directive) {
            return transactionError(errors.record.creation({ 
                docket, 
                verbose: "Directive is required for record creation" 
            }));
        }

        const manifest = createRecordManifest({
            sdkInstance,
            accountAddress,
            domainId,
            subregistryAddress,
            subdomainName,
            context: docket.context,
            directive: docket.directive,
            value
        });

        await sendTransaction({
            rdt,
            message: `Set record for ${domainDetails.name}`,
            manifest,
            transaction: sdkInstance.transaction,
            callbacks
        });

        return transactionResponse({
            code: 'RECORD_SUCCESSFULLY_CREATED',
            details: `Record ${docket.context}:${docket.directive} was successfully set for ${domainDetails.name}.`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return transactionError(errors.record.creation({ docket, verbose: message }));
    }

}
