import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { normaliseManifest } from '../utils';
import { requestDomainDetails } from '../../requests/account/domains';

const mocks = {
    domain: {
        name: "radixnamespace.xrd"
    },
    userDetails: {
        accountAddress: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v'
    },
    iconUrl: 'https://example.com/new-icon.png',
    dappDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
    newDomainResourceAddress: 'resource_tdx_2_1new_domain_resource_address',
    domainDetails: {
        id: '#123#',
        name: 'radixnamespace.xrd',
        subregistry_component_address: 'component_tdx_2_1cp3x7h3k9jqaqkmxs5fz7m3djfnm0lgkdnxqd74j87tn20s2qr35hm',
        current_activated_owner: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v',
        bond_amount: '1',
        bond_resource: 'resource_tdx_2_1t5dapa27qscvsgj2tndfj5q44fej80gwjjq9a0r58qvgslsvzyhgz4',
        created_timestamp: Date.now().toString(),
        updated_timestamp: Date.now().toString(),
        key_image_url: 'https://example.com/key.png',
        issuer_registrar_id: null
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

// Mock the domain details request
jest.mock('../../requests/account/domains', () => ({
    ...jest.requireActual('../../requests/account/domains'),
    requestDomainDetails: jest.fn(() => Promise.resolve(mocks.domainDetails))
}));

const mockRequestDomainDetails = requestDomainDetails as jest.MockedFunction<typeof requestDomainDetails>;

describe('RNS - Subregistry Management', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    const dAppToolkit = RadixDappToolkit({
        dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
        networkId: RadixNetwork.Stokenet
    });

    const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

    describe('updateSubregistryIcon', () => {

        it('should generate correct manifest for updating subregistry icon', async () => {

            const result = await namespace.updateSubregistryIcon({
                domain: mocks.domain.name,
                iconUrl: mocks.iconUrl,
                accountAddress: mocks.userDetails.accountAddress
            });

            if (result.errors) {
                throw new Error(`Update subregistry icon failed: ${result.errors[0].verbose}`);
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
                        NonFungibleLocalId("${mocks.domainDetails.id}")
                    );
                POP_FROM_AUTH_ZONE
                    Proof("domain_proof");
                CALL_METHOD
                    Address("${mocks.domainDetails.subregistry_component_address}")
                    "update_icon_url"
                    Proof("domain_proof")
                    "${mocks.iconUrl}";
                DROP_ALL_PROOFS;
            `;

            expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

        });

        it('should return success response on successful icon update', async () => {

            const result = await namespace.updateSubregistryIcon({
                domain: mocks.domain.name,
                iconUrl: mocks.iconUrl,
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeUndefined();
            expect(result.feedback).toBeDefined();

            if (result.feedback) {
                expect(result.feedback.messages[0].code).toBe('SUBREGISTRY_ICON_UPDATED');
            }

        });

        it('should return error when account is not the domain owner', async () => {

            mockRequestDomainDetails.mockResolvedValueOnce({
                ...mocks.domainDetails,
                current_activated_owner: 'account_tdx_2_different_owner_address_here'
            } as any);

            const result = await namespace.updateSubregistryIcon({
                domain: mocks.domain.name,
                iconUrl: mocks.iconUrl,
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('SUBREGISTRY_NOT_OWNER');

        });

        it('should return error for non-existent domain', async () => {

            mockRequestDomainDetails.mockResolvedValueOnce(new Error('Domain not found') as any);

            const result = await namespace.updateSubregistryIcon({
                domain: 'nonexistent-domain-12345.xrd',
                iconUrl: mocks.iconUrl,
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('SUBREGISTRY_ERROR');

        });

    });

    describe('updateSubregistryDappDefinition', () => {

        it('should generate correct manifest for updating dApp definition', async () => {

            const result = await namespace.updateSubregistryDappDefinition({
                domain: mocks.domain.name,
                dappDefinitionAddress: mocks.dappDefinitionAddress,
                accountAddress: mocks.userDetails.accountAddress
            });

            if (result.errors) {
                throw new Error(`Update dApp definition failed: ${result.errors[0].verbose}`);
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
                        NonFungibleLocalId("${mocks.domainDetails.id}")
                    );
                POP_FROM_AUTH_ZONE
                    Proof("domain_proof");
                CALL_METHOD
                    Address("${mocks.domainDetails.subregistry_component_address}")
                    "update_dapp_definition"
                    Proof("domain_proof")
                    Address("${mocks.dappDefinitionAddress}");
                DROP_ALL_PROOFS;
            `;

            expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

        });

        it('should return success response on successful dApp definition update', async () => {

            const result = await namespace.updateSubregistryDappDefinition({
                domain: mocks.domain.name,
                dappDefinitionAddress: mocks.dappDefinitionAddress,
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeUndefined();
            expect(result.feedback).toBeDefined();

            if (result.feedback) {
                expect(result.feedback.messages[0].code).toBe('SUBREGISTRY_DAPP_DEFINITION_UPDATED');
            }

        });

        it('should return error when account is not the domain owner', async () => {

            mockRequestDomainDetails.mockResolvedValueOnce({
                ...mocks.domainDetails,
                current_activated_owner: 'account_tdx_2_different_owner_address_here'
            } as any);

            const result = await namespace.updateSubregistryDappDefinition({
                domain: mocks.domain.name,
                dappDefinitionAddress: mocks.dappDefinitionAddress,
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('SUBREGISTRY_NOT_OWNER');

        });

    });

    describe('updateDomainResource', () => {

        it('should generate correct manifest for updating domain resource', async () => {

            const result = await namespace.updateDomainResource({
                domain: mocks.domain.name,
                newDomainResourceAddress: mocks.newDomainResourceAddress,
                accountAddress: mocks.userDetails.accountAddress
            });

            if (result.errors) {
                throw new Error(`Update domain resource failed: ${result.errors[0].verbose}`);
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
                        NonFungibleLocalId("${mocks.domainDetails.id}")
                    );
                POP_FROM_AUTH_ZONE
                    Proof("domain_proof");
                CALL_METHOD
                    Address("${mocks.domainDetails.subregistry_component_address}")
                    "update_domain_resource"
                    Proof("domain_proof")
                    Address("${mocks.newDomainResourceAddress}");
                DROP_ALL_PROOFS;
            `;

            expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

        });

        it('should return success response on successful domain resource update', async () => {

            const result = await namespace.updateDomainResource({
                domain: mocks.domain.name,
                newDomainResourceAddress: mocks.newDomainResourceAddress,
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeUndefined();
            expect(result.feedback).toBeDefined();

            if (result.feedback) {
                expect(result.feedback.messages[0].code).toBe('DOMAIN_RESOURCE_UPDATED');
            }

        });

        it('should return error when account is not the domain owner', async () => {

            mockRequestDomainDetails.mockResolvedValueOnce({
                ...mocks.domainDetails,
                current_activated_owner: 'account_tdx_2_different_owner_address_here'
            } as any);

            const result = await namespace.updateDomainResource({
                domain: mocks.domain.name,
                newDomainResourceAddress: mocks.newDomainResourceAddress,
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('SUBREGISTRY_NOT_OWNER');

        });

    });

    describe('replaceSubregistry', () => {

        it('should generate correct manifest for replacing subregistry', async () => {

            const result = await namespace.replaceSubregistry({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress
            });

            if (result.errors) {
                throw new Error(`Replace subregistry failed: ${result.errors[0].verbose}`);
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
                        NonFungibleLocalId("${mocks.domainDetails.id}")
                    );
                POP_FROM_AUTH_ZONE
                    Proof("domain_proof");
                CALL_METHOD
                    Address("${namespace.entities.rnsCore.rootAddr}")
                    "spawn_new_subregistry"
                    Proof("domain_proof");
                DROP_ALL_PROOFS;
            `;

            expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

        });

        it('should return success response on successful subregistry replacement', async () => {

            const result = await namespace.replaceSubregistry({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeUndefined();
            expect(result.feedback).toBeDefined();

            if (result.feedback) {
                expect(result.feedback.messages[0].code).toBe('SUBREGISTRY_REPLACED');
                expect(result.feedback.messages[0].details).toContain('replaced');
                expect(result.feedback.messages[0].details).toContain('inaccessible');
            }

        });

        it('should return error when account is not the domain owner', async () => {

            mockRequestDomainDetails.mockResolvedValueOnce({
                ...mocks.domainDetails,
                current_activated_owner: 'account_tdx_2_different_owner_address_here'
            } as any);

            const result = await namespace.replaceSubregistry({
                domain: mocks.domain.name,
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('SUBREGISTRY_NOT_OWNER');

        });

        it('should return error for non-existent domain', async () => {

            mockRequestDomainDetails.mockResolvedValueOnce(new Error('Domain not found') as any);

            const result = await namespace.replaceSubregistry({
                domain: 'nonexistent-domain-12345.xrd',
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeDefined();
            expect(result.errors![0].code).toBe('SUBREGISTRY_ERROR');

        });

    });

});
