import NamespaceSDK from "..";
import errors from "./errors";
import { normaliseDomain, validateDomain, validateDomainEntity, validateSubdomain } from "../utils/domain.utils";
import { validateAccountAddress } from "../utils/address.utils";
import { ParamProcessMapT } from "../common/validation.types";

// Default processors for common parameters (fallback when no override exists)
const defaultProcessors = {
    domain: {
        normalize: normaliseDomain,
        validate: validateDomain,
        missingError: errors.domain.generic
    },
    subdomain: {
        normalize: normaliseDomain,
        validate: validateSubdomain,
        missingError: errors.subdomain.generic
    },
    accountAddress: {
        normalize: (accountAddress: string) => accountAddress.toLowerCase(),
        validate: (accountAddress: string, instance: NamespaceSDK) => validateAccountAddress(accountAddress, { network: instance.network }),
        missingError: errors.account.invalidAddress
    }
};

// Domain entity processor - accepts both root domains and subdomains
const domainEntityProcessor = {
    domain: {
        normalize: normaliseDomain,
        validate: validateDomainEntity,
        missingError: errors.domain.generic
    }
};

// Method-specific overrides (supplements/replaces defaults for specific methods)
export const processorOverrides: ParamProcessMapT = {
    getRecords: domainEntityProcessor,
    resolveRecord: domainEntityProcessor,
    createRecord: domainEntityProcessor,
    amendRecord: domainEntityProcessor,
    deleteRecord: domainEntityProcessor,
    deleteRecordById: domainEntityProcessor,
    createRecords: domainEntityProcessor,
    deleteRecords: domainEntityProcessor,
    deleteContextRecords: domainEntityProcessor,
    getDomainDetails: domainEntityProcessor,
    transferDomain: {
        domain: {
            normalize: normaliseDomain,
            validate: validateDomain,
            missingError: errors.domain.generic
        },
        fromAddress: {
            normalize: (accountAddress: string) => accountAddress.toLowerCase(),
            validate: (accountAddress: string, instance: NamespaceSDK) => validateAccountAddress(accountAddress, { network: instance.network }),
            missingError: errors.account.invalidAddress
        },
        destinationAddress: {
            normalize: (accountAddress: string) => accountAddress.toLowerCase(),
            validate: (accountAddress: string, instance: NamespaceSDK) => validateAccountAddress(accountAddress, { network: instance.network }),
            missingError: errors.account.invalidAddress
        }
    },
    updateAccountSettings: domainEntityProcessor
};

// Combined for decorator consumption
export const parameterProcessMap: ParamProcessMapT = {
    _default: defaultProcessors,
    ...processorOverrides
};