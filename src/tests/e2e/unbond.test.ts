
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { normaliseManifest } from '../utils';
import { requestDomainDetails } from '../../requests/account/domains';

const mocks = {
    domain: 'test-unbond.xrd',
    domainId: '[abc123def456789012345678901234]',
    userDetails: {
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    domainDetails: {
        id: '[abc123def456789012345678901234]',
        name: 'test-unbond.xrd',
        current_activated_owner: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
        subregistry_component_address: 'component_tdx_2_1czxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        bond_resource_address: 'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6',
        bond_amount: '10',
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

describe('RNS - Unbond Domain', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a correctly formatted manifest string for unbonding without preserving data', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const unbond = await namespace.unbondDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress
        });

        if (unbond.errors) {
            throw new Error(`Mock unbond failed: ${JSON.stringify(unbond.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        const expectedString = `
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "withdraw_non_fungibles"
                Address("${namespace.entities.rnsCore.domainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${mocks.domainId}")
                );
            TAKE_NON_FUNGIBLES_FROM_WORKTOP
                Address("${namespace.entities.rnsCore.domainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${mocks.domainId}")
                )
                Bucket("domain_bucket");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "unbond"
                Bucket("domain_bucket")
                false;
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

    it('should return a correctly formatted manifest string for unbonding with preserving data', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const unbond = await namespace.unbondDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress,
            preserveSubregistryData: true
        });

        if (unbond.errors) {
            throw new Error(`Mock unbond failed: ${JSON.stringify(unbond.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        const expectedString = `
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "withdraw_non_fungibles"
                Address("${namespace.entities.rnsCore.domainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${mocks.domainId}")
                );
            TAKE_NON_FUNGIBLES_FROM_WORKTOP
                Address("${namespace.entities.rnsCore.domainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${mocks.domainId}")
                )
                Bucket("domain_bucket");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "unbond"
                Bucket("domain_bucket")
                true;
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

    it('should return success response with correct details', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const unbond = await namespace.unbondDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(unbond.errors).toBeUndefined();
        expect(unbond.feedback).toBeDefined();

        if (unbond.feedback) {
            expect(unbond.feedback.messages).toBeDefined();
            expect(unbond.feedback.messages[0].code).toBe('UNBOND_SUCCESSFUL');
            expect(unbond.feedback.messages[0].details).toContain('successfully unbonded');
        }

    });

});

describe('RNS - Unbond Domain Error Handling', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when domain is not found', async () => {

        // Mock domain details to return null
        (requestDomainDetails as jest.Mock).mockResolvedValueOnce(new Error('Domain not found'));

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const unbond = await namespace.unbondDomain({
            domain: 'nonexistent.xrd',
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(unbond.errors).toBeDefined();
        expect(unbond.errors?.[0].code).toBe('DOMAIN_UNBOND_FAILED');

    });

    it('should return error when domain is not owned by account', async () => {

        // Mock domain details with different owner
        (requestDomainDetails as jest.Mock).mockResolvedValueOnce({
            ...mocks.domainDetails,
            current_activated_owner: 'account_tdx_2_different_owner_address_here'
        });

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const unbond = await namespace.unbondDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(unbond.errors).toBeDefined();
        expect(unbond.errors?.[0].code).toBe('DOMAIN_UNBOND_FAILED');
        expect(unbond.errors?.[0].verbose).toContain('not activated for this account');

    });

});

