
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';
import Decimal from 'decimal.js';

import { getDomainPrice } from '../../utils/pricing.utils';
import { normaliseManifest } from '../utils';

const mocks = {
    availableDomain: `test-registration-${(Math.random() + 1).toString(36).substring(3)}.xrd`,
    userDetails: {
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    registrarId: '1',
    registrarDetails: {
        id: '1',
        name: 'Test Registrar',
        icon_url: 'https://example.com/icon.png',
        website_url: 'https://example.com',
        fee_percentage: new Decimal(2.5),
        created_at: 0,
        updated_at: 0
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

// Mock the registrar details request
jest.mock('../../requests/registrar/details', () => ({
    requestRegistrarDetails: jest.fn(() => Promise.resolve(mocks.registrarDetails))
}));

// Mock the balance utilities
jest.mock('../../utils/balance.utils', () => ({
    getAccountBondBalances: jest.fn(() => Promise.resolve({
        balances: [{ resource: { address: 'resource_mock', type: 'fungible', name: 'Mock Token', symbol: 'MOCK', description: null, tags: [], icon_url: null, info_url: null }, balance: '1000' }]
    })),
    checkAccountBondAffordability: jest.fn(() => ({
        requiredAmount: '10',
        sufficientBalances: [{ resource: { address: 'resource_mock', type: 'fungible', name: 'Mock Token', symbol: 'MOCK', description: null, tags: [], icon_url: null, info_url: null }, balance: '1000' }],
        insufficientBalances: []
    }))
}));

describe('RNS - Register Domain', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it(`should return a correctly formatted manifest string`, async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const register = await namespace.registerDomain({
            domain: mocks.availableDomain,
            accountAddress: mocks.userDetails.accountAddress,
            registrarId: mocks.registrarId
        });

        if (register.errors) {
            throw new Error('Mock registration failed');
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;
        
        // Calculate bond amount and registrar fee
        const bondAmount = getDomainPrice(mocks.availableDomain, namespace.entities.rnsCore.priceLadder);
        const bondAmountNum = parseFloat(bondAmount);
        const feePercentage = mocks.registrarDetails.fee_percentage.toNumber();
        const registrarFee = (bondAmountNum * (feePercentage / 100)).toFixed(6);

        const paymentResource = namespace.entities.rnsCore.acceptedPaymentResources[0];

        const expectedString = `
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "withdraw"
                Address("${paymentResource}")
                Decimal("${bondAmount}");
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "withdraw"
                Address("${paymentResource}")
                Decimal("${registrarFee}");
            TAKE_ALL_FROM_WORKTOP
                Address("${paymentResource}")
                Bucket("payment_bucket");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "register_and_bond_domain"
                "${mocks.availableDomain}"
                Bucket("payment_bucket")
                Address("${mocks.userDetails.accountAddress}")
                NonFungibleLocalId("#${mocks.registrarId}#");
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

});

describe('RNS - Get Cost Breakdown', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return correct cost breakdown including bond and registrar fee', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });
        await namespace.fetchDependencies();

        const result = await namespace.utils.getCostBreakdown({
            domain: mocks.availableDomain,
            registrarId: mocks.registrarId
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeDefined();

        if (result.data) {
            // Calculate expected values
            const expectedBondAmount = getDomainPrice(mocks.availableDomain, namespace.entities.rnsCore.priceLadder);
            const bondAmountNum = parseFloat(expectedBondAmount);
            const feePercentage = mocks.registrarDetails.fee_percentage.toNumber();
            const expectedRegistrarFee = (bondAmountNum * (feePercentage / 100)).toFixed(6);
            const expectedTotal = (bondAmountNum + parseFloat(expectedRegistrarFee)).toFixed(6);

            expect(result.data.domain).toBe(mocks.availableDomain);
            expect(result.data.bondAmount).toBe(expectedBondAmount);
            expect(result.data.registrarFee).toBe(expectedRegistrarFee);
            expect(result.data.registrarFeePercentage).toBe(mocks.registrarDetails.fee_percentage.toString());
            expect(result.data.totalAmount).toBe(expectedTotal);
            expect(result.data.registrarId).toBe(mocks.registrarId);
            expect(result.data.registrarName).toBe(mocks.registrarDetails.name);
            expect(result.data.paymentResource).toBe(namespace.entities.rnsCore.acceptedPaymentResources[0]);
        }

    });

});
