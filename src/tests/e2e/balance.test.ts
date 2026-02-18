
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

const mocks = {
    userDetails: {
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    sufficientBalance: '1000',
    insufficientBalance: '1',
    requiredAmount: '100',
    resourceDetails: {
        address: 'resource_mock',
        type: 'fungible' as const,
        name: 'Mock Token',
        symbol: 'MOCK',
        description: null,
        tags: [],
        icon_url: null,
        info_url: null
    }
};

jest.mock('@radixdlt/radix-dapp-toolkit', () => {
    return {
        RadixDappToolkit: jest.fn(() => ({
            walletApi: {
                sendTransaction: jest.fn(),
            },
        })),
    };
});

// Mock resource details request
jest.mock('../../requests/resource/details', () => ({
    requestResourceDetails: jest.fn(() => Promise.resolve(mocks.resourceDetails))
}));

// Mock the accepted bond tokens cache
jest.mock('../../utils/balance.utils', () => {
    const actual = jest.requireActual('../../utils/balance.utils');
    return {
        ...actual,
        getAcceptedBondTokensWithMetadata: jest.fn(() => Promise.resolve([{
            address: 'resource_mock',
            type: 'fungible',
            name: 'Mock Token',
            symbol: 'MOCK',
            description: 'A mock token for testing',
            tags: [],
            icon_url: null,
            info_url: null
        }]))
    };
});

describe('RNS - Balance Utilities', () => {

    let rns: NamespaceSDK;

    beforeAll(async () => {
        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: mocks.userDetails.accountAddress,
            networkId: RadixNetwork.Stokenet
        });

        rns = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });
        await rns.fetchDependencies();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAcceptedBondTokens', () => {

        it('should return the list of accepted payment resources with full resource details', async () => {
            const result = await rns.utils.getAcceptedBondTokens();

            expect(result.errors).toBeUndefined();
            expect(result.data).toBeDefined();
            expect(Array.isArray(result.data)).toBe(true);

            if (result.data && result.data.length > 0) {
                // Each token should have full ResourceDetailsI structure
                result.data.forEach(token => {
                    expect(token.address).toBeDefined();
                    expect(token.type).toBeDefined();
                    expect(typeof token.address).toBe('string');
                    // These can be null but should be present
                    expect('name' in token).toBe(true);
                    expect('symbol' in token).toBe(true);
                    expect('icon_url' in token).toBe(true);
                    expect('info_url' in token).toBe(true);
                });
            }
        });

    });

    describe('getAccountBondBalances', () => {

        it('should return balances for all accepted tokens', async () => {
            // Mock the balance check to return balance
            jest.spyOn(rns.state, 'getEntityDetailsVaultAggregated').mockResolvedValue({
                fungible_resources: {
                    items: [{
                        resource_address: rns.entities.rnsCore.acceptedPaymentResources[0],
                        vaults: {
                            items: [{ amount: mocks.sufficientBalance }]
                        }
                    }]
                }
            } as any);

            const result = await rns.utils.getAccountBondBalances({
                accountAddress: mocks.userDetails.accountAddress
            });

            expect(result.errors).toBeUndefined();
            expect(result.data).toBeDefined();
            expect(result.data?.balances).toBeDefined();
            
            // Check structure of balance item with nested resource
            if (result.data?.balances[0]) {
                expect(result.data.balances[0].resource).toBeDefined();
                expect(result.data.balances[0].resource.address).toBeDefined();
                expect(result.data.balances[0].balance).toBeDefined();
            }
        });

    });

    describe('checkAccountBondAffordability', () => {

        it('should return sufficientBalances when user has enough', async () => {
            // Mock the balance check to return sufficient balance
            jest.spyOn(rns.state, 'getEntityDetailsVaultAggregated').mockResolvedValue({
                fungible_resources: {
                    items: [{
                        resource_address: rns.entities.rnsCore.acceptedPaymentResources[0],
                        vaults: {
                            items: [{ amount: mocks.sufficientBalance }]
                        }
                    }]
                }
            } as any);

            const result = await rns.utils.checkAccountBondAffordability({
                accountAddress: mocks.userDetails.accountAddress,
                requiredAmount: mocks.requiredAmount
            });

            expect(result.errors).toBeUndefined();
            expect(result.data).toBeDefined();
            expect(result.data?.sufficientBalances.length).toBeGreaterThan(0);
            
            // Check structure of sufficient balance item (no shortfall property)
            if (result.data?.sufficientBalances[0]) {
                expect(result.data.sufficientBalances[0].resource).toBeDefined();
                expect(result.data.sufficientBalances[0].resource.address).toBeDefined();
                expect(result.data.sufficientBalances[0].balance).toBeDefined();
                expect('shortfall' in result.data.sufficientBalances[0]).toBe(false);
            }
        });

        it('should return insufficientBalances when user does not have enough', async () => {
            // Mock the balance check to return insufficient balance
            jest.spyOn(rns.state, 'getEntityDetailsVaultAggregated').mockResolvedValue({
                fungible_resources: {
                    items: [{
                        resource_address: rns.entities.rnsCore.acceptedPaymentResources[0],
                        vaults: {
                            items: [{ amount: mocks.insufficientBalance }]
                        }
                    }]
                }
            } as any);

            const result = await rns.utils.checkAccountBondAffordability({
                accountAddress: mocks.userDetails.accountAddress,
                requiredAmount: mocks.requiredAmount
            });

            expect(result.errors).toBeUndefined();
            expect(result.data).toBeDefined();
            expect(result.data?.insufficientBalances.length).toBeGreaterThan(0);
            
            // Check that shortfall is calculated correctly
            if (result.data?.insufficientBalances[0]) {
                expect(result.data.insufficientBalances[0].shortfall).toBeDefined();
                expect(result.data.insufficientBalances[0].resource).toBeDefined();
                expect(result.data.insufficientBalances[0].resource.address).toBeDefined();
            }
        });

        it('should return correct required amount in response', async () => {
            jest.spyOn(rns.state, 'getEntityDetailsVaultAggregated').mockResolvedValue({
                fungible_resources: {
                    items: []
                }
            } as any);

            const result = await rns.utils.checkAccountBondAffordability({
                accountAddress: mocks.userDetails.accountAddress,
                requiredAmount: mocks.requiredAmount
            });

            expect(result.data?.requiredAmount).toBe(mocks.requiredAmount);
        });

    });

});

