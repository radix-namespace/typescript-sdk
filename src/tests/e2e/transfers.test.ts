import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';
import NamespaceSDK, { DomainDataI } from '../..';
import { normaliseManifest } from '../utils';

const mocks = {
    domain: {
        name: "radixnamespace.xrd"
    },
    fromAddress: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v',
    destinationAddress: 'account_tdx_2_12y9gtvtcfah0kvnluefk7tpaknhx90mr9mn5gjprqzfnc0dyjdkw3d',
    preferences: {
        cleanTransfer: false
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


describe('RNS - Transfer Domain', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    const dAppToolkit = RadixDappToolkit({
        dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
        networkId: RadixNetwork.Stokenet
    });

    const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

    it(`domain transfer creation should return a correctly formatted manifest string`, async () => {

        const transferDomain = await namespace.transferDomain({
            domain: mocks.domain.name,
            fromAddress: mocks.fromAddress,
            destinationAddress: mocks.destinationAddress,
            preferences: mocks.preferences
        });

        if (transferDomain.errors) {
            throw new Error('Mock transfer failed');
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        // Simple NFT transfer (no spawn_new_subregistry since cleanTransfer is false)
        const expectedString = `
            CALL_METHOD
                Address("${mocks.fromAddress}")
                "withdraw_non_fungibles"
                Address("${namespace.entities.rnsCore.domainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${mocks.domain.name}")
                );
            CALL_METHOD
                Address("${mocks.destinationAddress}")
                "try_deposit_batch_or_refund"
                Expression("ENTIRE_WORKTOP")
                None;
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

});
