import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';
import Decimal from 'decimal.js';

import { normaliseManifest } from '../utils';

const mocks = {
    registrarDetails: {
        name: 'Test Registrar Service',
        iconUrl: 'https://radixnameservice.com/icon.png',
        websiteUrl: 'https://radixnameservice.com',
        feePercentage: new Decimal(2.5),
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    registrarId: '1',  // SDK formats to "#1#" automatically
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

describe('RNS - Register as Registrar', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a correctly formatted manifest string', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });
        await namespace.fetchDependencies();

        const register = await namespace.registerAsRegistrar({
            name: mocks.registrarDetails.name,
            iconUrl: mocks.registrarDetails.iconUrl,
            websiteUrl: mocks.registrarDetails.websiteUrl,
            feePercentage: mocks.registrarDetails.feePercentage,
            accountAddress: mocks.registrarDetails.accountAddress
        });

        if (register.errors) {
            throw new Error('Mock registrar registration failed');
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        const expectedString = `
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "register_as_registrar"
                "${mocks.registrarDetails.name}"
                "${mocks.registrarDetails.iconUrl}"
                "${mocks.registrarDetails.websiteUrl}"
                Decimal("${mocks.registrarDetails.feePercentage.toString()}");
            CALL_METHOD
                Address("${mocks.registrarDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

});

describe('RNS - Update Registrar Metadata', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a correctly formatted manifest for partial update', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });
        await namespace.fetchDependencies();

        // Update only fee percentage (other fields undefined = None)
        const update = await namespace.updateRegistrar({
            registrarId: mocks.registrarId,
            accountAddress: mocks.registrarDetails.accountAddress,
            feePercentage: new Decimal(3)
        });

        if (update.errors) {
            throw new Error('Mock registrar update failed');
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        const expectedString = `
            CALL_METHOD
                Address("${mocks.registrarDetails.accountAddress}")
                "create_proof_of_non_fungibles"
                Address("${namespace.entities.rnsCore.registrarBadgeResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("#${mocks.registrarId}#")
                );
            POP_FROM_AUTH_ZONE
                Proof("registrar_proof");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "update_registrar_metadata"
                Proof("registrar_proof")
                None
                None
                None
                Some(Decimal("3"));
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

    it('should return a correctly formatted manifest for full update', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });
        await namespace.fetchDependencies();

        // Update all fields
        const update = await namespace.updateRegistrar({
            registrarId: mocks.registrarId,
            accountAddress: mocks.registrarDetails.accountAddress,
            name: 'Updated Service Name',
            iconUrl: 'https://newservice.com/logo.png',
            websiteUrl: 'https://newservice.com',
            feePercentage: new Decimal(5)
        });

        if (update.errors) {
            throw new Error('Mock registrar update failed');
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        const expectedString = `
            CALL_METHOD
                Address("${mocks.registrarDetails.accountAddress}")
                "create_proof_of_non_fungibles"
                Address("${namespace.entities.rnsCore.registrarBadgeResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("#${mocks.registrarId}#")
                );
            POP_FROM_AUTH_ZONE
                Proof("registrar_proof");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "update_registrar_metadata"
                Proof("registrar_proof")
                Some("Updated Service Name")
                Some("https://newservice.com/logo.png")
                Some("https://newservice.com")
                Some(Decimal("5"));
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

});

describe('RNS - Burn Registrar Badge', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a correctly formatted manifest string', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });
        await namespace.fetchDependencies();

        const burn = await namespace.burnRegistrarBadge({
            registrarId: mocks.registrarId,
            accountAddress: mocks.registrarDetails.accountAddress
        });

        if (burn.errors) {
            throw new Error('Mock registrar burn failed');
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        const expectedString = `
            CALL_METHOD
                Address("${mocks.registrarDetails.accountAddress}")
                "withdraw_non_fungibles"
                Address("${namespace.entities.rnsCore.registrarBadgeResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("#${mocks.registrarId}#")
                );
            TAKE_NON_FUNGIBLES_FROM_WORKTOP
                Address("${namespace.entities.rnsCore.registrarBadgeResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("#${mocks.registrarId}#")
                )
                Bucket("registrar_badge");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "burn_registrar_badge"
                Bucket("registrar_badge");
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

});

