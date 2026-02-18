
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';
import { normaliseManifest } from '../utils';

const mocks = {
    userDetails: {
        accountAddress: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v'
    },
    callbacks: {},
    intentHash: 'txid_tdx_2_1p9j7njn5wuagry6j8mrmkvhhwvttskq2cy4e5nk2wpexhqjav2dszpptsr'
};

const inputs = {
    domain: {
        name: "radixnamespace.xrd"
    }
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

describe('RNS - Activate Domain', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it(`should return a correctly formatted manifest string`, async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const activate = await namespace.activateDomain({
            domain: inputs.domain.name,
            accountAddress: mocks.userDetails.accountAddress
        });

        if (activate.errors) {
            throw new Error('Mock activation failed');
        }

        if (activate.feedback?.messages[0]?.code === 'ACTIVATION_NOT_NEEDED') {
            // Domain is already activated for this account - test passes
            expect(activate.feedback.messages[0].details).toContain('is already activated for');
            return;
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
                    NonFungibleLocalId("${inputs.domain.name}")
                );
            POP_FROM_AUTH_ZONE
                Proof("domain_proof");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "activate_domain_ownership"
                Proof("domain_proof")
                Address("${mocks.userDetails.accountAddress}");
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

});
