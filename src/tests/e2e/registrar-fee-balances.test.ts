
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

const mocks = {
    registrarId: '1',
    formattedRegistrarId: '#1#',
    feeVaultKeys: [
        {
            key: {
                programmatic_json: {
                    kind: 'Tuple',
                    fields: [
                        { kind: 'NonFungibleLocalId', value: '#1#' },
                        { kind: 'Reference', value: 'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6' }
                    ]
                }
            }
        },
        {
            key: {
                programmatic_json: {
                    kind: 'Tuple',
                    fields: [
                        { kind: 'NonFungibleLocalId', value: '#1#' },
                        { kind: 'Reference', value: 'resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk' }
                    ]
                }
            }
        },
        {
            key: {
                programmatic_json: {
                    kind: 'Tuple',
                    fields: [
                        { kind: 'NonFungibleLocalId', value: '#2#' },  // Different registrar
                        { kind: 'Reference', value: 'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6' }
                    ]
                }
            }
        }
    ],
    feeVaultData: [
        {
            key: {
                programmatic_json: {
                    kind: 'Tuple',
                    fields: [
                        { kind: 'NonFungibleLocalId', value: '#1#' },
                        { kind: 'Reference', value: 'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6' }
                    ]
                }
            },
            value: {
                programmatic_json: {
                    kind: 'Decimal',
                    value: '25.5'
                }
            }
        },
        {
            key: {
                programmatic_json: {
                    kind: 'Tuple',
                    fields: [
                        { kind: 'NonFungibleLocalId', value: '#1#' },
                        { kind: 'Reference', value: 'resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk' }
                    ]
                }
            },
            value: {
                programmatic_json: {
                    kind: 'Decimal',
                    value: '12.75'
                }
            }
        }
    ],
    resourceMetadata: {
        'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6': {
            address: 'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6',
            type: 'fungible',
            name: 'Fake USD',
            symbol: 'fUSD',
            description: 'Stokenet test stablecoin',
            tags: [],
            icon_url: null,
            info_url: null
        },
        'resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk': {
            address: 'resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk',
            type: 'fungible',
            name: 'Super USD',
            symbol: 'sUSD',
            description: 'Another test stablecoin',
            tags: [],
            icon_url: null,
            info_url: null
        }
    }
};

jest.mock('@radixdlt/radix-dapp-toolkit', () => {
    return {
        RadixDappToolkit: jest.fn(() => ({
            walletApi: {
                sendTransaction: jest.fn()
            }
        }))
    };
});

// Mock the fee balances request
jest.mock('../../requests/registrar/fee-balances', () => ({
    requestRegistrarFeeBalances: jest.fn((registrarId) => {
        // Return different results based on registrar ID
        if (registrarId === 'nonexistent') {
            return Promise.resolve({
                fees: [],
                pagination: {
                    next_page: null,
                    previous_page: null,
                    total_count: 0,
                    current_page_count: 0
                }
            });
        }

        if (registrarId === 'error') {
            return Promise.resolve(new Error('Gateway error'));
        }

        // Default success case for registrar "1"
        return Promise.resolve({
            fees: [
                {
                    resource_address: 'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6',
                    amount: { toString: () => '25.5' },
                    resource: mocks.resourceMetadata['resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6']
                },
                {
                    resource_address: 'resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk',
                    amount: { toString: () => '12.75' },
                    resource: mocks.resourceMetadata['resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk']
                }
            ],
            pagination: {
                next_page: null,
                previous_page: null,
                total_count: 2,
                current_page_count: 2
            }
        });
    })
}));

describe('RNS - Get Registrar Fee Balances', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return fee balances for a registrar', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarFeeBalances({
            registrarId: mocks.registrarId
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeDefined();
        expect(result.data?.fees).toHaveLength(2);
        expect(result.data?.pagination.total_count).toBe(2);

    });

    it('should return fee balances with correct resource metadata', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarFeeBalances({
            registrarId: mocks.registrarId
        });

        expect(result.data).toBeDefined();

        const firstFee = result.data?.fees[0];
        expect(firstFee?.resource.symbol).toBe('fUSD');
        expect(firstFee?.resource.name).toBe('Fake USD');
        expect(firstFee?.amount.toString()).toBe('25.5');

        const secondFee = result.data?.fees[1];
        expect(secondFee?.resource.symbol).toBe('sUSD');
        expect(secondFee?.resource.name).toBe('Super USD');
        expect(secondFee?.amount.toString()).toBe('12.75');

    });

    it('should return empty fees array for registrar with no fee history', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarFeeBalances({
            registrarId: 'nonexistent'
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeDefined();
        expect(result.data?.fees).toHaveLength(0);
        expect(result.data?.pagination.total_count).toBe(0);

    });

    it('should return pagination info', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarFeeBalances({
            registrarId: mocks.registrarId
        });

        expect(result.data?.pagination).toBeDefined();
        expect(result.data?.pagination.current_page_count).toBe(2);
        expect(result.data?.pagination.next_page).toBeNull();
        expect(result.data?.pagination.previous_page).toBeNull();

    });

});

describe('RNS - Get Registrar Fee Balances Error Handling', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when Gateway request fails', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarFeeBalances({
            registrarId: 'error'
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('REGISTRAR_FEE_BALANCES_ERROR');
        expect(result.errors?.[0].verbose).toContain('Gateway error');

    });

});

