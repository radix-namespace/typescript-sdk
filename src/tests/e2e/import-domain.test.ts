
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { normaliseManifest } from '../utils';
import { domainToNonFungId } from '../../utils/domain.utils';
import { getAccountBondBalances } from '../../utils/balance.utils';

const mocks = {
    domain: 'import-test.xrd',
    domainId: '', // Will be computed
    userDetails: {
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    importDomainData: {
        name: 'import-test.xrd',
        address: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    balances: {
        balances: [{
            resource: { address: 'resource_tdx_2_1tkzrxplc7a222vhpupt8gy77tmmah4s9n6604kv4gtupql7qshzxta', name: 'fUSD' },
            balance: '1000'
        }]
    },
    insufficientBalances: {
        balances: [{
            resource: { address: 'resource_tdx_2_1tkzrxplc7a222vhpupt8gy77tmmah4s9n6604kv4gtupql7qshzxta', name: 'fUSD' },
            balance: '0.5'
        }]
    },
    callbacks: {},
    intentHash: 'txid_tdx_2_1p9j7njn5wuagry6j8mrmkvhhwvttskq2cy4e5nk2wpexhqjav2dszpptsr'
};

// Compute domain ID before tests
beforeAll(async () => {
    mocks.domainId = await domainToNonFungId(mocks.domain);
});

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

// Mock balance utils
jest.mock('../../utils/balance.utils', () => ({
    ...jest.requireActual('../../utils/balance.utils'),
    getAccountBondBalances: jest.fn(() => Promise.resolve(mocks.balances))
}));

describe('RNS - Import Accepted Domain', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return a correctly formatted manifest string for import', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        // Mock domain not in registry
        namespace.state.innerClient.keyValueStoreData = jest.fn().mockResolvedValue({ entries: [] });

        const result = await namespace.importAcceptedDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress
        });

        if (result.errors) {
            throw new Error(`Mock import failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        // Get expected bond amount from price ladder (11 chars = default 4)
        const expectedBondAmount = '4';
        const expectedPaymentResource = namespace.entities.rnsCore.acceptedPaymentResources[0];

        const expectedString = `
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "create_proof_of_non_fungibles"
                Address("${namespace.entities.rnsCore.importDomainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${mocks.domainId}")
                );
            POP_FROM_AUTH_ZONE
                Proof("import_domain_proof");
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "withdraw"
                Address("${expectedPaymentResource}")
                Decimal("${expectedBondAmount}");
            TAKE_FROM_WORKTOP
                Address("${expectedPaymentResource}")
                Decimal("${expectedBondAmount}")
                Bucket("payment_bucket");
            CALL_METHOD
                Address("${namespace.entities.rnsCore.rootAddr}")
                "import_accepted_domain"
                Proof("import_domain_proof")
                Bucket("payment_bucket")
                Address("${mocks.userDetails.accountAddress}");
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
            DROP_ALL_PROOFS;
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

    it('should generate manifest with correct method calls and proof', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        // Mock domain not in registry
        namespace.state.innerClient.keyValueStoreData = jest.fn().mockResolvedValue({ entries: [] });

        const result = await namespace.importAcceptedDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress
        });

        if (result.errors) {
            throw new Error(`Mock import failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        // Verify the correct method calls and proof-based flow are present
        expect(transactionManifest).toContain('"create_proof_of_non_fungibles"');
        expect(transactionManifest).toContain('POP_FROM_AUTH_ZONE');
        expect(transactionManifest).toContain('Proof("import_domain_proof")');
        expect(transactionManifest).toContain('Bucket("payment_bucket")');
        expect(transactionManifest).toContain('"import_accepted_domain"');
        expect(transactionManifest).toContain('"deposit_batch"');
        expect(transactionManifest).toContain('DROP_ALL_PROOFS');

    });

    it('should use specified payment resource when provided', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });
        const customPaymentResource = 'resource_tdx_2_custom_payment_resource';

        // Mock domain not in registry
        namespace.state.innerClient.keyValueStoreData = jest.fn().mockResolvedValue({ entries: [] });

        const result = await namespace.importAcceptedDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress,
            paymentResource: customPaymentResource
        });

        if (result.errors) {
            throw new Error(`Mock import failed: ${JSON.stringify(result.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        expect(transactionManifest).toContain(customPaymentResource);

    });

    it('should return success response with correct details', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        // Mock domain not in registry
        namespace.state.innerClient.keyValueStoreData = jest.fn().mockResolvedValue({ entries: [] });

        const result = await namespace.importAcceptedDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeUndefined();
        expect(result.feedback).toBeDefined();

        if (result.feedback) {
            expect(result.feedback.messages).toBeDefined();
            expect(result.feedback.messages[0].code).toBe('IMPORT_SUCCESSFUL');
            expect(result.feedback.messages[0].details).toContain('successfully imported');
            expect(result.feedback.messages[0].details).toContain('no registrar fees');
        }

    });

});

describe('RNS - Import Accepted Domain Error Handling', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when domain is already imported', async () => {

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        // Mock domain already in registry
        namespace.state.innerClient.keyValueStoreData = jest.fn().mockResolvedValue({
            entries: [{ key: { programmatic_json: {} }, value: { programmatic_json: {} } }]
        });

        const result = await namespace.importAcceptedDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('DOMAIN_ALREADY_IMPORTED');

    });

    it('should return error when user has insufficient balance', async () => {

        // Override balance mock for this test
        (getAccountBondBalances as jest.Mock).mockResolvedValueOnce(mocks.insufficientBalances);

        const dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

        // Mock domain not in registry
        namespace.state.innerClient.keyValueStoreData = jest.fn().mockResolvedValue({ entries: [] });

        const result = await namespace.importAcceptedDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].code).toBe('INSUFFICIENT_BALANCE');
        expect(result.errors?.[0].verbose).toContain('Insufficient balance for import bond');

    });

});

