
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { normaliseManifest } from '../utils';

const mocks = {
    registrarId: '1',
    formattedRegistrarId: '#1#',
    resourceAddress1: 'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6',
    resourceAddress2: 'resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk',
    userDetails: {
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
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

// Mock fee balances for auto-discovery tests
jest.mock('../../requests/registrar/fee-balances', () => ({
    requestRegistrarFeeBalances: jest.fn((registrarId) => {
        if (registrarId === 'no-fees') {
            return Promise.resolve({
                fees: [],
                pagination: { next_page: null, previous_page: null, total_count: 0, current_page_count: 0 }
            });
        }

        if (registrarId === 'error') {
            return Promise.resolve(new Error('Gateway error'));
        }

        // Default: return mock fee balances
        return Promise.resolve({
            fees: [
                {
                    resource_address: mocks.resourceAddress1,
                    amount: { isZero: () => false, toString: () => '25.5' },
                    resource: { symbol: 'fUSD', name: 'Fake USD' }
                },
                {
                    resource_address: mocks.resourceAddress2,
                    amount: { isZero: () => false, toString: () => '12.75' },
                    resource: { symbol: 'sUSD', name: 'Super USD' }
                }
            ],
            pagination: { next_page: null, previous_page: null, total_count: 2, current_page_count: 2 }
        });
    })
}));

describe('RNS - Withdraw Registrar Fees (Specific Resource)', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a correctly formatted manifest for withdrawing from a specific resource', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.withdrawRegistrarFees({
            registrarId: mocks.registrarId,
            accountAddress: mocks.userDetails.accountAddress,
            resourceAddress: mocks.resourceAddress1
        });

        if (result.errors) {
            throw new Error(`Mock withdraw failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        const expectedString = `
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "create_proof_of_non_fungibles"
                Address("${namespace.entities.rnsCore.registrarBadgeResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${mocks.formattedRegistrarId}")
                );
            POP_FROM_AUTH_ZONE
                Proof("registrar_proof");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "withdraw_registrar_fees"
                Proof("registrar_proof")
                Address("${mocks.resourceAddress1}");
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

    it('should return success response with correct details for specific resource', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.withdrawRegistrarFees({
            registrarId: mocks.registrarId,
            accountAddress: mocks.userDetails.accountAddress,
            resourceAddress: mocks.resourceAddress1
        });

        expect(result.errors).toBeUndefined();
        expect(result.feedback).toBeDefined();

        if (result.feedback) {
            expect(result.feedback.messages).toBeDefined();
            expect(result.feedback.messages[0].code).toBe('REGISTRAR_WITHDRAWAL_SUCCESSFUL');
            expect(result.feedback.messages[0].details).toContain('1 resource');
        }

    });

});

describe('RNS - Withdraw Registrar Fees (Auto-Discovery)', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should auto-discover and withdraw from all fee vaults', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        // Call without resourceAddress to trigger auto-discovery
        const result = await namespace.withdrawRegistrarFees({
            registrarId: mocks.registrarId,
            accountAddress: mocks.userDetails.accountAddress
        });

        if (result.errors) {
            throw new Error(`Mock withdraw failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        // Should contain withdrawal calls for BOTH resources
        expect(transactionManifest).toContain(mocks.resourceAddress1);
        expect(transactionManifest).toContain(mocks.resourceAddress2);

        // Should have both withdrawal calls
        const withdrawCount = (transactionManifest.match(/withdraw_registrar_fees/g) || []).length;
        expect(withdrawCount).toBe(2);

    });

    it('should return success with correct count for multiple resources', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.withdrawRegistrarFees({
            registrarId: mocks.registrarId,
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.feedback).toBeDefined();

        if (result.feedback) {
            expect(result.feedback.messages[0].code).toBe('REGISTRAR_WITHDRAWAL_SUCCESSFUL');
            expect(result.feedback.messages[0].details).toContain('2 resources');
        }

    });

    it('should only use single proof for multiple withdrawals', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.withdrawRegistrarFees({
            registrarId: mocks.registrarId,
            accountAddress: mocks.userDetails.accountAddress
        });

        if (result.errors) {
            throw new Error(`Mock withdraw failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        const transactionManifest = sendTransactionMock.mock.calls[0][0].transactionManifest;

        // Should only create proof once
        const proofCount = (transactionManifest.match(/create_proof_of_non_fungibles/g) || []).length;
        expect(proofCount).toBe(1);

        // Should only pop from auth zone once
        const popCount = (transactionManifest.match(/POP_FROM_AUTH_ZONE/g) || []).length;
        expect(popCount).toBe(1);

        // Should only deposit once at the end
        const depositCount = (transactionManifest.match(/deposit_batch/g) || []).length;
        expect(depositCount).toBe(1);

    });

});

describe('RNS - Withdraw Registrar Fees Error Handling', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when no fees are available', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.withdrawRegistrarFees({
            registrarId: 'no-fees',
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('REGISTRAR_NO_FEES_AVAILABLE');
        expect(result.errors?.[0].error).toContain('No fees available');

    });

    it('should return error when fee discovery fails', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.withdrawRegistrarFees({
            registrarId: 'error',
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('REGISTRAR_WITHDRAWAL_ERROR');
        expect(result.errors?.[0].verbose).toContain('Gateway error');

    });

    it('should return error when transaction fails', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        // Mock transaction failure
        (dAppToolkit.walletApi.sendTransaction as jest.Mock).mockImplementationOnce(() => {
            return {
                value: null,
                isErr: jest.fn(() => true),
                error: { message: 'User rejected transaction' }
            };
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.withdrawRegistrarFees({
            registrarId: mocks.registrarId,
            accountAddress: mocks.userDetails.accountAddress,
            resourceAddress: mocks.resourceAddress1
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('REGISTRAR_WITHDRAWAL_ERROR');

    });

});
