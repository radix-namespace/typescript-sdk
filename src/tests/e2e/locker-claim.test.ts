
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { normaliseManifest } from '../utils';

const mocks = {
    userDetails: {
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    accountLockerAddress: 'locker_tdx_2_1drmaxe56gkn4kzq6sxhz89nyah0gtwqzl5v8wjnqq7v7gl5kndraa',
    domainResourceAddress: 'resource_tdx_2_1nge8hph2csxm84q20cfz2aqn3s5drgqpjll7eza8kfwcnn5rs3frke',
    nftIds: [
        '#1#',
        '#2#'
    ],
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

/**
 * Helper to create an SDK instance with mocked entities that include accountLocker
 */
function createMockedSdk() {
    const dAppToolkit = RadixDappToolkit({
        dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
        networkId: RadixNetwork.Stokenet
    });

    const rns = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

    // Manually set entities with a mocked accountLocker address
    // (the real stokenet component may not have this field yet)
    rns.entities = {
        rnsCore: {
            rootAddr: 'component_tdx_2_1cq7z7h77e3g0enxs5nl6eqeq9yspgfkhlwedqxtdrnfadr0vae6nuv',
            domainResource: mocks.domainResourceAddress,
            importDomainResource: 'resource_tdx_2_mock_import_domain',
            adminBadgeResource: 'resource_tdx_2_mock_admin_badge',
            configBadgeResource: 'resource_tdx_2_mock_config_badge',
            registrarBadgeResource: 'resource_tdx_2_mock_registrar_badge',
            bondVaults: 'internal_keyvaluestore_tdx_2_mock_bond_vaults',
            domainRegistry: 'internal_keyvaluestore_tdx_2_mock_domain_registry',
            registrarStats: 'internal_keyvaluestore_tdx_2_mock_registrar_stats',
            registrarFeeVaults: 'internal_keyvaluestore_tdx_2_mock_registrar_fee_vaults',
            reservedDomainClaims: 'internal_keyvaluestore_tdx_2_mock_reserved',
            domainCounterKey: 0,
            accountLocker: mocks.accountLockerAddress,
            registrarCounterKey: 0,
            acceptedImportsUsed: 'internal_keyvaluestore_tdx_2_mock_imports_used',
            dappDefinition: null,
            isRegistrationActive: true,
            priceLadder: { '1': '2250', '2': '240', '3': '120', '4': '40' },
            subregistryConfig: { name: '', description: '', tags: [], iconUrl: '' },
            acceptedPaymentResources: ['resource_tdx_2_1tkzrxplc7a222vhpupt8gy77tmmah4s9n6604kv4gtupql7qshzxta']
        }
    };

    return { rns, dAppToolkit };
}

describe('RNS - Claim from AccountLocker', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should generate claim_non_fungibles manifest when nftIds are provided', async () => {

        const { rns, dAppToolkit } = createMockedSdk();

        const result = await rns.claimFromLocker({
            accountAddress: mocks.userDetails.accountAddress,
            nftIds: mocks.nftIds
        });

        if (result.errors) {
            throw new Error(`Mock claim failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        const expectedString = `
            CALL_METHOD
                Address("${mocks.accountLockerAddress}")
                "claim_non_fungibles"
                Address("${mocks.userDetails.accountAddress}")
                Address("${mocks.domainResourceAddress}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${mocks.nftIds[0]}"),
                    NonFungibleLocalId("${mocks.nftIds[1]}")
                );
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

    it('should generate claim by amount manifest when no nftIds provided', async () => {

        const { rns, dAppToolkit } = createMockedSdk();

        const result = await rns.claimFromLocker({
            accountAddress: mocks.userDetails.accountAddress
        });

        if (result.errors) {
            throw new Error(`Mock claim failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        // Should use claim by amount (100) when no IDs specified
        expect(transactionManifest).toContain('"claim"');
        expect(transactionManifest).toContain('Decimal("100")');
        expect(transactionManifest).toContain(mocks.accountLockerAddress);
        expect(transactionManifest).toContain(mocks.domainResourceAddress);
        expect(transactionManifest).toContain('"deposit_batch"');

    });

    it('should return success response with correct code when claiming by ID', async () => {

        const { rns } = createMockedSdk();

        const result = await rns.claimFromLocker({
            accountAddress: mocks.userDetails.accountAddress,
            nftIds: mocks.nftIds
        });

        expect(result.errors).toBeUndefined();
        expect(result.feedback).toBeDefined();

        if (result.feedback) {
            expect(result.feedback.messages).toBeDefined();
            expect(result.feedback.messages[0].code).toBe('LOCKER_CLAIM_SUCCESSFUL');
            expect(result.feedback.messages[0].details).toContain('2 specific domain NFT(s)');
        }

    });

    it('should return generic success message when claiming by amount', async () => {

        const { rns } = createMockedSdk();

        const result = await rns.claimFromLocker({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.feedback).toBeDefined();

        if (result.feedback) {
            expect(result.feedback.messages[0].code).toBe('LOCKER_CLAIM_SUCCESSFUL');
            expect(result.feedback.messages[0].details).toContain('domain NFTs');
        }

    });

    it('should include correct method calls in manifest with a single ID', async () => {

        const { rns, dAppToolkit } = createMockedSdk();

        const result = await rns.claimFromLocker({
            accountAddress: mocks.userDetails.accountAddress,
            nftIds: ['#42#']
        });

        if (result.errors) {
            throw new Error(`Mock claim failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        expect(transactionManifest).toContain('"claim_non_fungibles"');
        expect(transactionManifest).toContain('NonFungibleLocalId("#42#")');
        expect(transactionManifest).toContain('"deposit_batch"');

    });

    it('should include the account locker and domain resource addresses in manifest', async () => {

        const { rns, dAppToolkit } = createMockedSdk();

        const result = await rns.claimFromLocker({
            accountAddress: mocks.userDetails.accountAddress,
            nftIds: ['#1#']
        });

        if (result.errors) {
            throw new Error(`Mock claim failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        // Verify the locker address and domain resource address are present
        expect(transactionManifest).toContain(mocks.accountLockerAddress);
        expect(transactionManifest).toContain(mocks.domainResourceAddress);
        expect(transactionManifest).toContain(mocks.userDetails.accountAddress);

    });

});

describe('RNS - Claim from AccountLocker Error Handling', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when accountLocker address is not available', async () => {

        const { rns } = createMockedSdk();

        // Override the accountLocker to be empty (simulating missing field)
        rns.entities.rnsCore.accountLocker = '';

        const result = await rns.claimFromLocker({
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('LOCKER_NOT_AVAILABLE');

    });

    it('should return error when transaction sending fails', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        // Override sendTransaction to simulate failure
        (dAppToolkit.walletApi.sendTransaction as jest.Mock).mockImplementationOnce(() => {
            throw new Error('Transaction rejected by user');
        });

        const rns = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });
        rns.entities = {
            rnsCore: {
                ...createMockedSdk().rns.entities.rnsCore
            }
        };

        const result = await rns.claimFromLocker({
            accountAddress: mocks.userDetails.accountAddress,
            nftIds: ['#1#']
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('LOCKER_CLAIM_FAILED');
        expect(result.errors?.[0].verbose).toContain('Transaction rejected by user');

    });

});
