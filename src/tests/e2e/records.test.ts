import NamespaceSDK, { ResolvedRecordResponseT, DomainDataI } from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { matchObjectTypes, normaliseManifest } from '../utils';
import { RecordDocketI, RecordItemI } from '../../common/record.types';
const mocks = {
    domain: {
        name: "radixnamespace.xrd"
    },
    userDetails: {
        accountAddress: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v'
    },
    docket: {
        context: "receivers",
        directive: "*",
        value: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v'
    },
    callbacks: {},
    intentHash: 'txid_tdx_2_1p9j7njn5wuagry6j8mrmkvhhwvttskq2cy4e5nk2wpexhqjav2dszpptsr'
};

jest.mock('@radixdlt/radix-dapp-toolkit', () => {
    return {
        RadixDappToolkit: jest.fn(() => ({
            walletApi: {
                sendTransaction: jest.fn(() => {
                    return {
                        value: {
                            transactionIntentHash: mocks.intentHash,
                        },
                        isErr: jest.fn(() => false),
                    };
                }),
            },
        })),
    };
});

describe('RNS - Fetch Domain Records', () => {

    const namespace = new NamespaceSDK({ network: 'stokenet' });

    it(`should return a corresponding record array of docket objects`, async () => {

        const records = await namespace.getRecords({ domain: 'test-records-exist.xrd' });

        if (records.errors) {
            throw new Error('Record list fetch failed');
        }

        expect(Array.isArray(records.data.records)).toBe(true);
        expect(records.data.records.length).toBeGreaterThan(0);

        // Records have context, directive, value (no platform_identifier)
        if (!matchObjectTypes<RecordItemI>(records.data.records[0], ['context', 'directive', 'value'])) {
            throw new Error('Record did not match expected schema');
        }

    });

    it('should return a empty array', async () => {

        const records = await namespace.getRecords({ domain: 'test-records-absent.xrd' });

        if (records.errors) {
            throw new Error('Record list fetch failed');
        }

        expect(Array.isArray(records.data.records)).toBe(true);
        expect(records.data.records.length).toBeLessThan(1);

    });

    it('should return a specific stokenet address', async () => {

        const resolvedRecord = await namespace.resolveRecord({
            domain: 'test-records-exist.xrd',
            docket: {
                context: 'receivers',
                directive: '*'
            }
        });

        if (resolvedRecord.errors) {
            throw new Error('Record resolution failed');
        }

        expect(resolvedRecord.data.value).toBe('account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v');

    });



});

describe('RNS - Manage Domain Records', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    const dAppToolkit = RadixDappToolkit({
        dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
        networkId: RadixNetwork.Stokenet
    });

    const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

    it(`record creation should return a correctly formatted manifest string`, async () => {

        const domainDetails = await namespace.getDomainDetails({ domain: mocks.domain.name });
        if (domainDetails.errors) {
            throw new Error('Domain details could not be obtained');
        }

        const domainData = domainDetails.data as DomainDataI;

        const createRecord = await namespace.createRecord({
            domain: mocks.domain.name,
            accountAddress: mocks.userDetails.accountAddress,
            docket: mocks.docket as RecordDocketI
        });

        if (createRecord.errors) {
            throw new Error('Mock record creation failed');
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        const expectedString = `
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "create_proof_of_non_fungibles"
                Address("${namespace.entities.rnsCore.domainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${domainData.id}")
                );
            POP_FROM_AUTH_ZONE
                Proof("domain_proof");
            CALL_METHOD
                Address("${domainData.subregistry_component_address}")
                "set_record"
                Proof("domain_proof")
                Enum<0u8>()
                "${mocks.docket.context}"
                "${mocks.docket.directive}"
                "${mocks.docket.value}";
            DROP_ALL_PROOFS;
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });


    it(`record amendment should return a correctly formatted manifest string`, async () => {

        const domainDetails = await namespace.getDomainDetails({ domain: mocks.domain.name });
        if (domainDetails.errors) {
            throw new Error('Domain details could not be obtained');
        }

        const domainData = domainDetails.data as DomainDataI;

        const amendRecord = await namespace.amendRecord({
            domain: mocks.domain.name,
            accountAddress: mocks.userDetails.accountAddress,
            docket: mocks.docket as RecordDocketI
        });

        if (amendRecord.errors) {
            throw new Error('Mock record amendment failed');
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        // Note: Amendment is also set_record (same as create)
        const expectedString = `
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "create_proof_of_non_fungibles"
                Address("${namespace.entities.rnsCore.domainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${domainData.id}")
                );
            POP_FROM_AUTH_ZONE
                Proof("domain_proof");
            CALL_METHOD
                Address("${domainData.subregistry_component_address}")
                "set_record"
                Proof("domain_proof")
                Enum<0u8>()
                "${mocks.docket.context}"
                "${mocks.docket.directive}"
                "${mocks.docket.value}";
            DROP_ALL_PROOFS;
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

    it(`record deletion should return a correctly formatted manifest string`, async () => {

        const domainDetails = await namespace.getDomainDetails({ domain: mocks.domain.name });
        if (domainDetails.errors) {
            throw new Error('Domain details could not be obtained');
        }

        const domainData = domainDetails.data as DomainDataI;

        const deleteRecord = await namespace.deleteRecord({
            domain: mocks.domain.name,
            accountAddress: mocks.userDetails.accountAddress,
            docket: mocks.docket as RecordDocketI
        });

        if (deleteRecord.errors) {
            throw new Error('Mock record deletion failed');
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        const expectedString = `
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "create_proof_of_non_fungibles"
                Address("${namespace.entities.rnsCore.domainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${domainData.id}")
                );
            POP_FROM_AUTH_ZONE
                Proof("domain_proof");
            CALL_METHOD
                Address("${domainData.subregistry_component_address}")
                "delete_record"
                Proof("domain_proof")
                "${mocks.docket.context}"
                "${mocks.docket.directive}";
            DROP_ALL_PROOFS;
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

});
