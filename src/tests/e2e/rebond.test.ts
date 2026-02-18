
import NamespaceSDK from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { normaliseManifest } from '../utils';
import { requestDomainDetails } from '../../requests/account/domains';

// Note: These resources must be actual accepted resources on the stokenet component
// The first resource is used as the "old" bond, the second as the "new" rebond target
const mocks = {
    domain: 'test-rebond.xrd',
    domainId: '[abc123def456789012345678901234]',
    userDetails: {
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    // Will be populated dynamically from SDK
    acceptedResources: [] as string[],
    domainDetails: null as any,
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

// Mock the domain details request - will be configured in beforeAll
jest.mock('../../requests/account/domains', () => ({
    ...jest.requireActual('../../requests/account/domains'),
    requestDomainDetails: jest.fn()
}));

describe('RNS - Rebond Domain', () => {

    let rns: NamespaceSDK;
    let dAppToolkit: any;

    beforeAll(async () => {
        dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        rns = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });
        await rns.fetchDependencies();

        // Get actual accepted resources from the SDK
        mocks.acceptedResources = rns.entities.rnsCore.acceptedPaymentResources;

        // Set up domain details mock with first accepted resource as the current bond
        mocks.domainDetails = {
            id: mocks.domainId,
            name: mocks.domain,
            current_activated_owner: mocks.userDetails.accountAddress,
            subregistry_component_address: 'component_tdx_2_1czxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            bond: {
                resource: {
                    address: mocks.acceptedResources[0],
                    symbol: 'Resource1'
                },
                amount: '10'
            },
            issuer_registrar_id: null
        };
    });

    beforeEach(() => {
        // Reset mock to default domain details
        (requestDomainDetails as jest.Mock).mockResolvedValue(mocks.domainDetails);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a correctly formatted manifest string for rebonding', async () => {

        // Skip if we don't have at least 2 accepted resources for rebonding
        if (mocks.acceptedResources.length < 2) {
            console.log('Skipping test: Need at least 2 accepted resources for rebond test');
            return;
        }

        const newPaymentResource = mocks.acceptedResources[1]; // Use second resource

        const rebond = await rns.rebondDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress,
            newPaymentResource
        });

        if (rebond.errors) {
            throw new Error(`Mock rebond failed: ${JSON.stringify(rebond.errors)}`);
        }

        const sendTransactionMock = dAppToolkit.walletApi.sendTransaction as jest.Mock;
        expect(sendTransactionMock).toHaveBeenCalled();

        const sendTransactionArgs = sendTransactionMock.mock.calls[0][0];
        const transactionManifest = sendTransactionArgs.transactionManifest;

        // The manifest should create a proof, withdraw payment, call rebond, and deposit returns
        const expectedString = `
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "create_proof_of_non_fungibles"
                Address("${rns.entities.rnsCore.domainResource}")
                Array<NonFungibleLocalId>(
                    NonFungibleLocalId("${mocks.domainId}")
                );
            POP_FROM_AUTH_ZONE
                Proof("domain_proof");
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "withdraw"
                Address("${newPaymentResource}")
                Decimal("4");
            TAKE_FROM_WORKTOP
                Address("${newPaymentResource}")
                Decimal("4")
                Bucket("payment_bucket");
            CALL_METHOD
                Address("${rns.entities.rnsCore.rootAddr}")
                "rebond"
                Proof("domain_proof")
                Bucket("payment_bucket");
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
            DROP_ALL_PROOFS;
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

    it('should return success response with correct details', async () => {

        // Skip if we don't have at least 2 accepted resources for rebonding
        if (mocks.acceptedResources.length < 2) {
            console.log('Skipping test: Need at least 2 accepted resources for rebond test');
            return;
        }

        const newPaymentResource = mocks.acceptedResources[1];

        const rebond = await rns.rebondDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress,
            newPaymentResource
        });

        expect(rebond.errors).toBeUndefined();
        expect(rebond.feedback).toBeDefined();

        if (rebond.feedback) {
            expect(rebond.feedback.messages).toBeDefined();
            expect(rebond.feedback.messages[0].code).toBe('REBOND_SUCCESSFUL');
            expect(rebond.feedback.messages[0].details).toContain('successfully rebonded');
        }

    });

});

describe('RNS - Rebond Domain Error Handling', () => {

    let rns: NamespaceSDK;
    let dAppToolkit: any;

    beforeAll(async () => {
        dAppToolkit = RadixDappToolkit({
            dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
            networkId: RadixNetwork.Stokenet
        });

        rns = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });
        await rns.fetchDependencies();

        mocks.acceptedResources = rns.entities.rnsCore.acceptedPaymentResources;

        mocks.domainDetails = {
            id: mocks.domainId,
            name: mocks.domain,
            current_activated_owner: mocks.userDetails.accountAddress,
            subregistry_component_address: 'component_tdx_2_1czxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            bond: {
                resource: {
                    address: mocks.acceptedResources[0],
                    symbol: 'Resource1'
                },
                amount: '10'
            },
            issuer_registrar_id: null
        };
    });

    beforeEach(() => {
        (requestDomainDetails as jest.Mock).mockResolvedValue(mocks.domainDetails);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when domain is not found', async () => {

        // Mock domain details to return error
        (requestDomainDetails as jest.Mock).mockResolvedValueOnce(new Error('Domain not found'));

        const newPaymentResource = mocks.acceptedResources.length >= 2 
            ? mocks.acceptedResources[1] 
            : mocks.acceptedResources[0];

        const rebond = await rns.rebondDomain({
            domain: 'nonexistent.xrd',
            accountAddress: mocks.userDetails.accountAddress,
            newPaymentResource
        });

        expect(rebond.errors).toBeDefined();
        expect(rebond.errors?.[0].code).toBe('DOMAIN_REBOND_FAILED');

    });

    it('should return error when domain is not owned by account', async () => {

        // Mock domain details with different owner
        (requestDomainDetails as jest.Mock).mockResolvedValueOnce({
            ...mocks.domainDetails,
            current_activated_owner: 'account_tdx_2_different_owner_address_here'
        });

        const newPaymentResource = mocks.acceptedResources.length >= 2 
            ? mocks.acceptedResources[1] 
            : mocks.acceptedResources[0];

        const rebond = await rns.rebondDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress,
            newPaymentResource
        });

        expect(rebond.errors).toBeDefined();
        expect(rebond.errors?.[0].code).toBe('DOMAIN_REBOND_FAILED');
        expect(rebond.errors?.[0].verbose).toContain('not activated for this account');

    });

    it('should return error when payment resource is not accepted', async () => {

        const rebond = await rns.rebondDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress,
            newPaymentResource: 'resource_tdx_2_invalid_not_accepted_resource'
        });

        expect(rebond.errors).toBeDefined();
        expect(rebond.errors?.[0].code).toBe('INVALID_REBOND_RESOURCE');

    });

    it('should return error when trying to rebond with same resource', async () => {

        // Try to rebond with the same resource the domain is already bonded with
        const rebond = await rns.rebondDomain({
            domain: mocks.domain,
            accountAddress: mocks.userDetails.accountAddress,
            newPaymentResource: mocks.domainDetails.bond.resource.address
        });

        expect(rebond.errors).toBeDefined();
        expect(rebond.errors?.[0].code).toBe('REBOND_SAME_RESOURCE');

    });

});
