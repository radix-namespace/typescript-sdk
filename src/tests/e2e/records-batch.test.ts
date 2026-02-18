import NamespaceSDK, { DomainDataI, RecordEntryI, RecordRefI } from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { normaliseManifest } from '../utils';

const mocks = {
    domain: {
        name: "radixnamespace.xrd"
    },
    userDetails: {
        accountAddress: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v'
    },
    records: [
        { context: 'receivers', directive: '*', value: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v' },
        { context: 'social', directive: 'twitter', value: '@radixnameservice' },
        { context: 'social', directive: 'discord', value: 'radixnameservice' }
    ] as RecordEntryI[],
    recordRefs: [
        { context: 'receivers', directive: '*' },
        { context: 'social', directive: 'twitter' }
    ] as RecordRefI[],
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

describe('RNS - Batch Record Operations', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    const dAppToolkit = RadixDappToolkit({
        dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
        networkId: RadixNetwork.Stokenet
    });

    const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

    describe('createRecords', () => {

        it('should generate correct manifest for batch record creation', async () => {

            const domainDetails = await namespace.getDomainDetails({ domain: mocks.domain.name });
            if (domainDetails.errors) {
                throw new Error('Domain details could not be obtained');
            }

            const domainData = domainDetails.data as DomainDataI;

            const result = await namespace.createRecords({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress,
                records: mocks.records
            });

            if (result.errors) {
                throw new Error('Batch record creation failed');
            }

            const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
            expect(sendTransactionMock).toHaveBeenCalled();

            const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
            const transactionManifest = sendTransactionArgs.transactionManifest;

            // Build expected HashMap structure
            // Group by context: receivers -> { * -> account }, social -> { twitter -> @radix, discord -> radix }
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
                    "set_records_batch"
                    Proof("domain_proof")
                    Enum<0u8>()
                    HashMap<String, HashMap<String, String>>("receivers" => HashMap<String, String>("*" => "${mocks.records[0].value}"), "social" => HashMap<String, String>("twitter" => "@radixnameservice", "discord" => "radixnameservice"));
                DROP_ALL_PROOFS;
            `;

            expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

        });

        it('should return error when no records provided', async () => {

            const result = await namespace.createRecords({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress,
                records: []
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('RECORDS_BATCH_CREATION_FAILED');

        });

        it('should return error when record is missing required fields', async () => {

            const result = await namespace.createRecords({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress,
                records: [{ context: 'receivers', directive: '', value: 'test' }]
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('RECORDS_BATCH_CREATION_FAILED');

        });

        it('should return error for non-existent domain', async () => {

            const result = await namespace.createRecords({
                domain: 'nonexistent-domain-12345.xrd',
                accountAddress: mocks.userDetails.accountAddress,
                records: mocks.records
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('EMPTY_DOMAIN_DETAILS');

        });

    });

    describe('deleteRecords', () => {

        it('should generate correct manifest for batch record deletion', async () => {

            const domainDetails = await namespace.getDomainDetails({ domain: mocks.domain.name });
            if (domainDetails.errors) {
                throw new Error('Domain details could not be obtained');
            }

            const domainData = domainDetails.data as DomainDataI;

            const result = await namespace.deleteRecords({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress,
                records: mocks.recordRefs
            });

            if (result.errors) {
                throw new Error('Batch record deletion failed');
            }

            const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
            expect(sendTransactionMock).toHaveBeenCalled();

            const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
            const transactionManifest = sendTransactionArgs.transactionManifest;

            // Build expected Vec<Tuple> structure
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
                    "delete_records_batch"
                    Proof("domain_proof")
                    Enum<0u8>()
                    Array<Tuple>(Tuple("receivers", "*"), Tuple("social", "twitter"));
                DROP_ALL_PROOFS;
            `;

            expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

        });

        it('should return error when no records provided', async () => {

            const result = await namespace.deleteRecords({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress,
                records: []
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('RECORDS_BATCH_DELETION_FAILED');

        });

        it('should return error when record key is missing required fields', async () => {

            const result = await namespace.deleteRecords({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress,
                records: [{ context: 'receivers', directive: '' }]
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('RECORDS_BATCH_DELETION_FAILED');

        });

    });

    describe('deleteContextRecords', () => {

        it('should generate correct manifest for context deletion', async () => {

            const domainDetails = await namespace.getDomainDetails({ domain: mocks.domain.name });
            if (domainDetails.errors) {
                throw new Error('Domain details could not be obtained');
            }

            const domainData = domainDetails.data as DomainDataI;

            const result = await namespace.deleteContextRecords({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress,
                context: 'social'
            });

            if (result.errors) {
                throw new Error('Context records deletion failed');
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
                    "delete_context_records"
                    Proof("domain_proof")
                    Enum<0u8>()
                    "social";
                DROP_ALL_PROOFS;
            `;

            expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

        });

        it('should return error when context is empty', async () => {

            const result = await namespace.deleteContextRecords({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress,
                context: ''
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('CONTEXT_RECORDS_DELETION_FAILED');

        });

    });

});

