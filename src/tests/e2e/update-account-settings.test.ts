
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { normaliseManifest } from '../utils';
import { requestDomainDetails } from '../../requests/account/domains';
import { requestAccountSettings } from '../../requests/account/account-settings';

const mocks = {
    rootDomain: 'test-settings.xrd',
    subdomain: 'blog.test-settings.xrd',
    domainId: '[abc123def456789012345678901234]',
    configBadgeId: '[config123]',
    userDetails: {
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    domainDetails: {
        id: '[abc123def456789012345678901234]',
        name: 'test-settings.xrd',
        current_activated_owner: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
        subregistry_component_address: 'component_tdx_2_1czxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        bond_resource_address: 'resource_tdx_2_1t4te4ausadl7kwqs057ugxve6msunqrcfd2enlw0fckp6mdpnj4vk6',
        bond_amount: '10',
        issuer_registrar_id: null
    },
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

// Mock the account settings request
jest.mock('../../requests/account/account-settings', () => ({
    requestAccountSettings: jest.fn(() => Promise.resolve({
        primaryDomain: mocks.rootDomain,
        discoveryEnabled: true,
        isAuthentic: true,
        accountAddress: mocks.userDetails.accountAddress,
        domainDetails: null
    }))
}));

describe('RNS - Update Account Settings (Set Primary Domain)', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a correctly formatted manifest for setting primary domain', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.updateAccountSettings({
            accountAddress: mocks.userDetails.accountAddress,
            primaryDomain: mocks.rootDomain
        });

        if (result.errors) {
            throw new Error(`Mock updateAccountSettings failed: ${JSON.stringify(result.errors)}`);
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
                    NonFungibleLocalId("${mocks.domainId}")
                );
            POP_FROM_AUTH_ZONE
                Proof("domain_proof");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "set_primary_domain"
                Proof("domain_proof")
                "${mocks.rootDomain}"
                Address("${mocks.userDetails.accountAddress}")
                false;
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

    it('should return a correctly formatted manifest with discovery enabled', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.updateAccountSettings({
            accountAddress: mocks.userDetails.accountAddress,
            primaryDomain: mocks.rootDomain,
            enableDiscovery: true
        });

        if (result.errors) {
            throw new Error(`Mock updateAccountSettings failed: ${JSON.stringify(result.errors)}`);
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
                    NonFungibleLocalId("${mocks.domainId}")
                );
            POP_FROM_AUTH_ZONE
                Proof("domain_proof");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "set_primary_domain"
                Proof("domain_proof")
                "${mocks.rootDomain}"
                Address("${mocks.userDetails.accountAddress}")
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

        const result = await namespace.updateAccountSettings({
            accountAddress: mocks.userDetails.accountAddress,
            primaryDomain: mocks.rootDomain
        });

        expect(result.errors).toBeUndefined();
        expect(result.feedback).toBeDefined();

        if (result.feedback) {
            expect(result.feedback.messages).toBeDefined();
            expect(result.feedback.messages[0].code).toBe('UPDATE_ACCOUNT_SETTINGS_SUCCESSFUL');
            expect(result.feedback.messages[0].details).toContain('primary domain');
            expect(result.feedback.messages[0].details).toContain('disabled');
        }

    });

    it('should set subdomain as primary domain', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.updateAccountSettings({
            accountAddress: mocks.userDetails.accountAddress,
            primaryDomain: mocks.subdomain
        });

        if (result.errors) {
            throw new Error(`Mock updateAccountSettings failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        // For subdomain, we use the ROOT domain's NFT ID but pass the subdomain name
        const expectedString = `
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "create_proof_of_non_fungibles"
                Address("${namespace.entities.rnsCore.domainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${mocks.domainId}")
                );
            POP_FROM_AUTH_ZONE
                Proof("domain_proof");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "set_primary_domain"
                Proof("domain_proof")
                "${mocks.subdomain}"
                Address("${mocks.userDetails.accountAddress}")
                false;
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

});

describe('RNS - Update Account Settings (Toggle Discovery Only)', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when no settings provided', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        // Neither primaryDomain nor enableDiscovery provided
        const result = await namespace.updateAccountSettings({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('NOTHING_TO_UPDATE');

    });

});

describe('RNS - Update Account Settings Error Handling', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when domain is not found', async () => {

        (requestDomainDetails as jest.Mock).mockResolvedValueOnce(new Error('Domain not found'));

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.updateAccountSettings({
            accountAddress: mocks.userDetails.accountAddress,
            primaryDomain: 'nonexistent.xrd'
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('ACCOUNT_SETTINGS_UPDATE_FAILED');

    });

    it('should return error when domain is not owned by account', async () => {

        (requestDomainDetails as jest.Mock).mockResolvedValueOnce({
            ...mocks.domainDetails,
            current_activated_owner: 'account_tdx_2_different_owner_address_here'
        });

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.updateAccountSettings({
            accountAddress: mocks.userDetails.accountAddress,
            primaryDomain: mocks.rootDomain
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('ACCOUNT_SETTINGS_UPDATE_FAILED');
        expect(result.errors?.[0].verbose).toContain('not activated for this account');

    });

    it('should return error for invalid domain format', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.updateAccountSettings({
            accountAddress: mocks.userDetails.accountAddress,
            primaryDomain: 'invalid-domain-without-extension'
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('ACCOUNT_SETTINGS_UPDATE_FAILED');

    });

});

describe('RNS - Resolve Account Domain', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return domain when discovery is enabled and authentic', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.resolveAccountDomain({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBe(mocks.rootDomain);

    });

    it('should return null when discovery is disabled', async () => {

        (requestAccountSettings as jest.Mock).mockResolvedValueOnce({
            primaryDomain: mocks.rootDomain,
            discoveryEnabled: false, // Discovery disabled
            isAuthentic: true,
            accountAddress: mocks.userDetails.accountAddress,
            domainDetails: null
        });

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.resolveAccountDomain({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeNull();

    });

    it('should return null when domain is not authentic (transferred away)', async () => {

        (requestAccountSettings as jest.Mock).mockResolvedValueOnce({
            primaryDomain: mocks.rootDomain,
            discoveryEnabled: true,
            isAuthentic: false, // Domain no longer owned
            accountAddress: mocks.userDetails.accountAddress,
            domainDetails: null
        });

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.resolveAccountDomain({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeNull();

    });

    it('should return null when no primary domain is set', async () => {

        (requestAccountSettings as jest.Mock).mockResolvedValueOnce(null);

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.resolveAccountDomain({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeNull();

    });

    it('should return error when request fails', async () => {

        (requestAccountSettings as jest.Mock).mockResolvedValueOnce(new Error('Network error'));

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        const result = await namespace.resolveAccountDomain({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('ACCOUNT_RETRIEVAL_ERROR');

    });

});

describe('RNS - Account Settings Flow Integration', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should demonstrate the difference between getAccountSettings and resolveAccountDomain', async () => {

        // Scenario: User has set primary domain but disabled discovery (privacy mode)
        // Setup: Primary domain set but discovery disabled
        const mockConfig = {
            primaryDomain: 'private-user.xrd',
            discoveryEnabled: false,
            isAuthentic: true,
            accountAddress: mocks.userDetails.accountAddress,
            domainDetails: null
        };
        
        (requestAccountSettings as jest.Mock).mockResolvedValue(mockConfig);

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        // getAccountSettings: Returns full config (for account owner)
        const fullConfig = await namespace.getAccountSettings({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(fullConfig.data).toBeDefined();
        expect(fullConfig.data?.primaryDomain).toBe('private-user.xrd');
        expect(fullConfig.data?.discoveryEnabled).toBe(false);

        // resolveAccountDomain: Respects privacy (for third parties)
        const resolvedDomain = await namespace.resolveAccountDomain({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(resolvedDomain.data).toBeNull(); // Null because discovery is disabled

    });

});

