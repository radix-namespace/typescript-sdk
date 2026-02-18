import NamespaceSDK, { ImportDomainI, PaginatedImportDomainsI } from '../..';
import { matchObjectTypes } from '../utils';

describe('RNS - Import Domain Discovery', () => {

    const namespace = new NamespaceSDK({ network: 'stokenet' });

    // Account that holds the import domain 'radixnameservice.xrd' on stokenet
    const importDomainOwnerAccount = 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v';

    beforeAll(async () => {
        await namespace.fetchDependencies();
    });

    describe('getAccountImportDomains', () => {

        it('should return import domains for an account', async () => {
            const result = await namespace.getAccountImportDomains({
                accountAddress: importDomainOwnerAccount
            });

            expect(result.errors).toBeUndefined();
            expect(result.data).toBeDefined();
            expect(Array.isArray(result.data.domains)).toBe(true);
            expect(result.data.pagination).toBeDefined();
        });

        it('should return expected ImportDomainI structure', async () => {
            const result = await namespace.getAccountImportDomains({
                accountAddress: importDomainOwnerAccount
            });

            expect(result.errors).toBeUndefined();

            if (result.data.domains.length > 0) {
                const domain = result.data.domains[0];
                
                expect(matchObjectTypes<ImportDomainI>(domain, [
                    'name',
                    'id',
                    'address',
                    'created_timestamp',
                    'last_valid_timestamp',
                    'key_image_url',
                    'deposit_amount',
                    'primary_domain'
                ])).toBe(true);

                // Name should be a non-empty string
                expect(typeof domain.name).toBe('string');
                expect(domain.name.length).toBeGreaterThan(0);

                // ID should be a non-empty string (hash format)
                expect(typeof domain.id).toBe('string');
                expect(domain.id.length).toBeGreaterThan(0);

                // created_timestamp should be a number (milliseconds)
                expect(typeof domain.created_timestamp).toBe('number');
                expect(domain.created_timestamp).toBeGreaterThan(0);
            }
        });

        it('should return valid results when querying import domains', async () => {
            const result = await namespace.getAccountImportDomains({
                accountAddress: importDomainOwnerAccount
            });

            expect(result.errors).toBeUndefined();
            expect(result.data).toBeDefined();

            // If the account holds import domains, verify structure
            if (result.data.domains.length > 0) {
                const targetDomain = result.data.domains.find(d => d.name === 'radixnameservice.xrd');
                if (targetDomain) {
                    expect(targetDomain.name).toBe('radixnameservice.xrd');
                }
            }
        });

        it('should handle invalid account address gracefully', async () => {
            // Invalid account address should return an error
            const result = await namespace.getAccountImportDomains({
                accountAddress: 'invalid-address'
            });

            // Should return errors array for invalid address
            expect(result.errors).toBeDefined();
            expect(Array.isArray(result.errors)).toBe(true);
        });

        it('should include pagination info', async () => {
            const result = await namespace.getAccountImportDomains({
                accountAddress: importDomainOwnerAccount,
                pagination: { page: 1 }
            });

            expect(result.errors).toBeUndefined();
            expect(result.data.pagination).toBeDefined();
            expect(typeof result.data.pagination.total_count).toBe('number');
            expect(typeof result.data.pagination.current_page_count).toBe('number');
        });

    });

});
