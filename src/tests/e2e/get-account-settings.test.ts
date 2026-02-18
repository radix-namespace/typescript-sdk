
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { matchObjectTypes } from '../utils';
import { requestAccountSettings } from '../../requests/account/account-settings';

const mocks = {
    userDetails: {
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    configBadgeResource: 'resource_tdx_2_1nfconfig_badge_resource_address',
    primaryDomain: 'test-primary.xrd',
    configBadgeId: '#1#',
    domainDetails: {
        id: '[abc123def456789012345678901234]',
        name: 'test-primary.xrd',
        current_activated_owner: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
        subregistry_component_address: 'component_tdx_2_1czxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        bond: {
            resource: {
                address: 'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6',
                type: 'fungible',
                name: 'Fake USD',
                symbol: 'fUSD',
                description: null,
                tags: [],
                icon_url: null,
                info_url: null
            },
            amount: { toString: () => '10' }
        },
        key_image_url: 'https://example.com/image.png',
        created_timestamp: 0,
        issuer_registrar_id: null
    }
};

jest.mock('@radixdlt/radix-dapp-toolkit', () => {
    return {
        RadixDappToolkit: jest.fn(() => ({
            walletApi: {
                sendTransaction: jest.fn(() => {
                    return {
                        value: {
                            transactionIntentHash: 'mock_hash',
                        },
                        isErr: jest.fn(() => false),
                    };
                }),
            },
        })),
    };
});

// Mock the account settings request
jest.mock('../../requests/account/account-settings', () => ({
    requestAccountSettings: jest.fn(() => Promise.resolve({
        primaryDomain: mocks.primaryDomain,
        discoveryEnabled: true,
        isAuthentic: true,
        accountAddress: mocks.userDetails.accountAddress,
        domainDetails: mocks.domainDetails
    }))
}));

describe('RNS - Get Account Settings', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return settings for account with config badge', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getAccountSettings({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeDefined();

        if (result.data) {
            expect(result.data.primaryDomain).toBe(mocks.primaryDomain);
            expect(result.data.discoveryEnabled).toBe(true);
            expect(result.data.isAuthentic).toBe(true);
            expect(result.data.accountAddress).toBe(mocks.userDetails.accountAddress);
        }

    });

    it('should return correct object structure', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getAccountSettings({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();

        if (result.data) {
            expect(matchObjectTypes(result.data, [
                'primaryDomain',
                'discoveryEnabled',
                'isAuthentic',
                'accountAddress',
                'domainDetails'
            ])).toBe(true);
        }

    });

    it('should return domain details when authentic', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getAccountSettings({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();

        if (result.data && result.data.isAuthentic) {
            expect(result.data.domainDetails).toBeDefined();
            expect(result.data.domainDetails?.name).toBe(mocks.domainDetails.name);
        }

    });

});

describe('RNS - Get Account Settings - No Config Badge', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return null when account has no config badge', async () => {

        (requestAccountSettings as jest.Mock).mockResolvedValueOnce(null);

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getAccountSettings({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeNull();

    });

});

describe('RNS - Get Account Settings - Non-Authentic Domain', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return isAuthentic false when primary domain is no longer owned', async () => {

        (requestAccountSettings as jest.Mock).mockResolvedValueOnce({
            primaryDomain: 'transferred-domain.xrd',
            discoveryEnabled: true,
            isAuthentic: false, // Domain was transferred away
            accountAddress: mocks.userDetails.accountAddress,
            domainDetails: null // No details since not authentic
        });

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getAccountSettings({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeDefined();

        if (result.data) {
            expect(result.data.primaryDomain).toBe('transferred-domain.xrd');
            expect(result.data.isAuthentic).toBe(false);
            expect(result.data.domainDetails).toBeNull();
        }

    });

});

describe('RNS - Get Account Settings - Error Handling', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when request fails', async () => {

        (requestAccountSettings as jest.Mock).mockResolvedValueOnce(new Error('Failed to fetch account data'));

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getAccountSettings({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('ACCOUNT_RETRIEVAL_ERROR');

    });

});

describe('RNS - Get Account Settings - Discovery Disabled', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return discoveryEnabled false when discovery is disabled', async () => {

        (requestAccountSettings as jest.Mock).mockResolvedValueOnce({
            primaryDomain: mocks.primaryDomain,
            discoveryEnabled: false, // Discovery disabled
            isAuthentic: true,
            accountAddress: mocks.userDetails.accountAddress,
            domainDetails: mocks.domainDetails
        });

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.getAccountSettings({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeDefined();

        if (result.data) {
            expect(result.data.primaryDomain).toBe(mocks.primaryDomain);
            expect(result.data.discoveryEnabled).toBe(false);
            expect(result.data.isAuthentic).toBe(true);
        }

    });

});

