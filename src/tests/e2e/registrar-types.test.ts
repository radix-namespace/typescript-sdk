import NamespaceSDK from '../..';

describe('RNS - Registrar Types & Entity Expansion', () => {

    const namespace = new NamespaceSDK({ network: 'stokenet' });

    it('should expand entities with registrar badge resource', async () => {

        await namespace.fetchDependencies();

        expect(namespace.entities).toBeDefined();
        expect(namespace.entities.rnsCore).toBeDefined();
        
        // Check that registrar badge resource was extracted
        expect(namespace.entities.rnsCore.registrarBadgeResource).toBeDefined();
        expect(typeof namespace.entities.rnsCore.registrarBadgeResource).toBe('string');
        expect(namespace.entities.rnsCore.registrarBadgeResource.length).toBeGreaterThan(0);

    });

    it('should have all required resource addresses', async () => {

        await namespace.fetchDependencies();

        const { rnsCore } = namespace.entities;

        // Domain resources
        expect(rnsCore.domainResource).toBeDefined();
        expect(rnsCore.importDomainResource).toBeDefined();

        // Badge resources
        expect(rnsCore.adminBadgeResource).toBeDefined();
        expect(rnsCore.configBadgeResource).toBeDefined();
        expect(rnsCore.registrarBadgeResource).toBeDefined();

    });

    it('should have KeyValueStore addresses for registrar data', async () => {

        await namespace.fetchDependencies();

        const { rnsCore } = namespace.entities;

        // Registrar-related KVStores
        expect(rnsCore.registrarStats).toBeDefined();
        expect(rnsCore.registrarFeeVaults).toBeDefined();
        
        // Verify they're valid addresses
        expect(rnsCore.registrarStats.startsWith('internal_keyvaluestore_')).toBe(true);
        expect(rnsCore.registrarFeeVaults.startsWith('internal_keyvaluestore_')).toBe(true);

    });

    it('should have accepted payment resources', async () => {

        await namespace.fetchDependencies();

        const { rnsCore } = namespace.entities;

        expect(rnsCore.acceptedPaymentResources).toBeDefined();
        expect(Array.isArray(rnsCore.acceptedPaymentResources)).toBe(true);
        expect(rnsCore.acceptedPaymentResources.length).toBeGreaterThan(0);

        // Each should be a valid resource address
        rnsCore.acceptedPaymentResources.forEach(resource => {
            expect(typeof resource).toBe('string');
            expect(resource.startsWith('resource_')).toBe(true);
        });

    });

    it('should have subregistry configuration', async () => {

        await namespace.fetchDependencies();

        const { rnsCore } = namespace.entities;

        expect(rnsCore.subregistryConfig).toBeDefined();
        expect(rnsCore.subregistryConfig.name).toBeDefined();
        expect(rnsCore.subregistryConfig.description).toBeDefined();
        expect(Array.isArray(rnsCore.subregistryConfig.tags)).toBe(true);
        expect(rnsCore.subregistryConfig.iconUrl).toBeDefined();

    });

    it('should only load entities once per SDK instance', async () => {

        await namespace.fetchDependencies();

        // First access
        const entities1 = namespace.entities;
        
        // Second access should be same reference (not re-fetched)
        const entities2 = namespace.entities;

        expect(entities1).toBe(entities2);
        expect(entities1).toBeDefined();

    });

});


describe('RNS - Registrar Type Validation', () => {

    it('should export RegistrarDetailsI type', () => {

        // TypeScript compile-time check
        const registrarInfo: import('../..').RegistrarDetailsI = {
            id: 'registrar_1',
            name: 'Test Registrar',
            icon_url: 'https://example.com/icon.png',
            website_url: 'https://example.com',
            fee_percentage: new (require('decimal.js'))(10),
            created_at: Date.now(),
            updated_at: Date.now()
        };

        expect(registrarInfo).toBeDefined();

    });

    it('should export RegistrarFeeVaultI type', () => {

        // TypeScript compile-time check - create partial object for type validation
        const feeVault: Partial<import('../..').RegistrarFeeVaultI> = {
            resource_address: 'resource_tdx_...',
            amount: new (require('decimal.js'))(100)
        };

        expect(feeVault).toBeDefined();
        expect(feeVault.resource_address).toBe('resource_tdx_...');
        expect(feeVault.amount?.toNumber()).toBe(100);

    });

    it('should export PaginatedRegistrarFeesI type', () => {

        // TypeScript compile-time check
        const paginatedFees: import('../..').PaginatedRegistrarFeesI = {
            fees: [],
            pagination: {
                next_page: null,
                previous_page: null,
                total_count: 0,
                current_page_count: 0
            }
        };

        expect(paginatedFees).toBeDefined();

    });

});


