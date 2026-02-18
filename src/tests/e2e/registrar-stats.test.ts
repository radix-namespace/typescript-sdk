
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

const mocks = {
    registrarId: '1',
    formattedRegistrarId: '#1#',
    registrarStats: {
        domains_bonded: {
            'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6': 15,
            'resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk': 8
        },
        domains_bonded_cumulative: 25,
        fees_earned_cumulative: {
            'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6': '150.50',
            'resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk': '80.25'
        },
        fees_earned_current: {
            'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6': '45.50',
            'resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk': '22.75'
        },
        last_withdrawal: 1704067200 // 2024-01-01 00:00:00 UTC
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

// Mock the registrar stats request
jest.mock('../../requests/registrar/stats', () => ({
    requestRegistrarStats: jest.fn(({ registrarId }) => {
        // Return different results based on registrar ID
        if (registrarId === 'nonexistent' || registrarId === '#999#') {
            return Promise.resolve(null);
        }

        if (registrarId === 'error') {
            return Promise.resolve(new Error('Gateway error'));
        }

        // Default success case for registrar "1"
        return Promise.resolve(mocks.registrarStats);
    })
}));

describe('RNS - Get Registrar Stats', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return stats for a registrar', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarStats({
            registrarId: mocks.registrarId
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeDefined();
        expect(result.data).not.toBeNull();

    });

    it('should return domains_bonded per resource', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarStats({
            registrarId: mocks.registrarId
        });

        expect(result.data?.domains_bonded).toBeDefined();
        expect(result.data?.domains_bonded['resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6']).toBe(15);
        expect(result.data?.domains_bonded['resource_tdx_2_1thqcgjw37fjgycpvqr52nx4jc6ek68s8qh9clkjraqz8dpt5s95lpk']).toBe(8);

    });

    it('should return cumulative domain count', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarStats({
            registrarId: mocks.registrarId
        });

        expect(result.data?.domains_bonded_cumulative).toBe(25);

    });

    it('should return fees earned cumulative and current', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarStats({
            registrarId: mocks.registrarId
        });

        // Cumulative fees
        expect(result.data?.fees_earned_cumulative).toBeDefined();
        expect(result.data?.fees_earned_cumulative['resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6']).toBe('150.50');

        // Current available fees
        expect(result.data?.fees_earned_current).toBeDefined();
        expect(result.data?.fees_earned_current['resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6']).toBe('45.50');

    });

    it('should return last withdrawal timestamp', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarStats({
            registrarId: mocks.registrarId
        });

        expect(result.data?.last_withdrawal).toBe(1704067200);

    });

    it('should return null for non-existent registrar', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarStats({
            registrarId: 'nonexistent'
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeNull();

    });

});

describe('RNS - Get Registrar Stats Error Handling', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when Gateway request fails', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getRegistrarStats({
            registrarId: 'error'
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('GATEWAY_ERROR');
        expect(result.errors?.[0].verbose).toContain('Gateway error');

    });

});

describe('RNS - Registrar Stats Type Export', () => {

    it('should export RegistrarStatsI type', () => {

        // TypeScript compile-time check
        const stats: import('../..').RegistrarStatsI = {
            domains_bonded: { 'resource_...': 10 },
            domains_bonded_cumulative: 50,
            fees_earned_cumulative: { 'resource_...': '100.00' },
            fees_earned_current: { 'resource_...': '25.00' },
            last_withdrawal: 1704067200
        };

        expect(stats).toBeDefined();
        expect(stats.domains_bonded_cumulative).toBe(50);
        expect(stats.last_withdrawal).toBe(1704067200);

    });

    it('should allow null for last_withdrawal', () => {

        const stats: import('../..').RegistrarStatsI = {
            domains_bonded: {},
            domains_bonded_cumulative: 0,
            fees_earned_cumulative: {},
            fees_earned_current: {},
            last_withdrawal: null
        };

        expect(stats).toBeDefined();
        expect(stats.last_withdrawal).toBeNull();

    });

});
