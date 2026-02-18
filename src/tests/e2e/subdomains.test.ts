
import NamespaceSDK, { DomainDataI, PaginatedSubdomainsResponseI } from '../..';

import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';

import { matchObjectTypes, normaliseManifest } from '../utils';
import { deriveRootDomain, normaliseDomain } from '../../utils/domain.utils';

const mocks = {
    domains: {
        withSubdomains: 'subdomains-exist.xrd',
        withoutSubdomains: 'subdomains-absent.xrd'
    },
    rootDomain: {
        name: "subdomains-exist.xrd"
    },
    subdomain: `test.subdomains-exist.xrd`,
    subdomainName: `test`,
    userDetails: {
        accountAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k'
    },
    callbacks: {},
    intentHash: 'txid_tdx_2_1p9j7njn5wuagry6j8mrmkvhhwvttskq2cy4e5nk2wpexhqjav2dszpptsr'
};

const dAppToolkit = RadixDappToolkit({
    dAppDefinitionAddress: 'account_tdx_2_129076yrjr5k4lumhp3fl2r88xt3eqgxwed6saplvf2ezz5szrhet8k',
    networkId: RadixNetwork.Stokenet
});

const namespace = new NamespaceSDK({ network: 'stokenet', rdt: dAppToolkit });

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

describe('RNS - Create Subdomain', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it(`should return a correctly formatted manifest string`, async () => {

        const domainDetails = await namespace.getDomainDetails({ domain: mocks.rootDomain.name });
        if (domainDetails.errors) {
            throw new Error('Domain details could not be obtained');
        }

        const domainData = domainDetails.data as DomainDataI;

        const createSubdomain = await namespace.createSubdomain({
            subdomain: mocks.subdomain,
            accountAddress: mocks.userDetails.accountAddress
        });

        if (createSubdomain.errors) {
            throw new Error('Mock subdomain creation failed');
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
                    NonFungibleLocalId("${domainData.id}")
                );
            POP_FROM_AUTH_ZONE
                Proof("domain_proof");
            CALL_METHOD
                Address("${domainData.subregistry_component_address}")
                "create_subdomain"
                Proof("domain_proof")
                "${mocks.subdomainName}"
                Map<String, String>();
            CALL_METHOD
                Address("${mocks.userDetails.accountAddress}")
                "deposit_batch"
                Expression("ENTIRE_WORKTOP");
            DROP_ALL_PROOFS;
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

});

describe('RNS - Get Subdomain', () => {

    it('should return paginated subdomains for domain with subdomains', async () => {

        const subdomainsResponse = await namespace.getSubdomains({
            domain: mocks.domains.withSubdomains
        });

        expect(subdomainsResponse.errors).toBeUndefined();
        expect(subdomainsResponse.data).toBeDefined();
        expect(matchObjectTypes<PaginatedSubdomainsResponseI>(subdomainsResponse.data, ['subdomains', 'pagination'])).toBe(true);

        expect(subdomainsResponse.data.pagination).toBeDefined();
        expect(matchObjectTypes(subdomainsResponse.data.pagination, ['next_page', 'previous_page', 'total_count', 'current_page_count'])).toBe(true);

        expect(Array.isArray(subdomainsResponse.data.subdomains)).toBe(true);

        if (subdomainsResponse.data.subdomains.length > 0) {
            // Subdomains have different fields (no id or key_image_url)
            expect(subdomainsResponse.data.subdomains.every(subdomain =>
                matchObjectTypes(subdomain, ['name', 'full_name', 'created_timestamp', 'updated_timestamp', 'metadata', 'root_domain'])
            )).toBe(true);
        }
    });

    it('should indicate subdomain count in domain details', async () => {

        const domainDetails = await namespace.getDomainDetails({
            domain: mocks.domains.withSubdomains
        });

        const domainData = domainDetails.data as DomainDataI;
        expect(typeof domainData.subdomain_count).toBe('number');
        expect(domainData.subdomain_count).toBeGreaterThan(0);

    });

    it('should return empty subdomains array for domain without subdomains', async () => {
        const subdomainsResponse = await namespace.getSubdomains({
            domain: mocks.domains.withoutSubdomains
        });

        if (!subdomainsResponse.errors) {
            expect(subdomainsResponse.data.subdomains).toBeDefined();
            expect(Array.isArray(subdomainsResponse.data.subdomains)).toBe(true);
            expect(subdomainsResponse.data.subdomains.length).toBe(0);
            expect(subdomainsResponse.data.pagination.total_count).toBe(0);
        }
    });

    it('should handle pagination parameters correctly', async () => {
        
        const page1Response = await namespace.getSubdomains({
            domain: mocks.domains.withSubdomains,
            pagination: { page: 1 }
        });

        expect(page1Response.data.pagination.previous_page).toBeNull();

        if (page1Response.data.pagination.total_count > 100) {
            expect(page1Response.data.pagination.next_page).toBe(2);

            const page2Response = await namespace.getSubdomains({
                domain: mocks.domains.withSubdomains,
                pagination: { page: 2 }
            });

            if (!page2Response.errors) {
                expect(page2Response.data.pagination.previous_page).toBe(1);
            }
        }
    });

});

describe('RNS - Delete Subdomain', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it(`should return a correctly formatted manifest string`, async () => {

        const rootDomainDetails = await namespace.getDomainDetails({ domain: deriveRootDomain(mocks.subdomain) });

        if (rootDomainDetails.errors) {
            throw new Error('Root domain details could not be obtained');
        }

        const rootDomainData = rootDomainDetails.data as DomainDataI;

        const deleteSubdomain = await namespace.deleteSubdomain({
            subdomain: mocks.subdomain,
            accountAddress: mocks.userDetails.accountAddress
        });

        if (deleteSubdomain.errors) {
            throw new Error('Mock subdomain deletion failed');
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
                    NonFungibleLocalId("${rootDomainData.id}")
                );
            POP_FROM_AUTH_ZONE
                Proof("domain_proof");
            CALL_METHOD
                Address("${rootDomainData.subregistry_component_address}")
                "delete_subdomain"
                Proof("domain_proof")
                "${mocks.subdomainName}";
            DROP_ALL_PROOFS;
        `;

        expect(normaliseManifest(transactionManifest)).toBe(normaliseManifest(expectedString));

    });

});
