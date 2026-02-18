import NamespaceSDK, { DomainDataI } from '../..';
import { matchObjectTypes } from '../utils';

describe('RNS - Verify Domain Owner Accounts', () => {

    const namespace = new NamespaceSDK({ network: 'stokenet' });

    it(`should return all domains within an account`, async () => {

        const ownerDomains = await namespace.getAccountDomains({ accountAddress: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v' });

        if (ownerDomains.errors) {
            throw new Error('Domain list fetch failed');
        }

        expect(Array.isArray(ownerDomains.data.domains)).toBe(true);
        expect(ownerDomains.data.domains.length).toBeGreaterThan(0);
        expect(ownerDomains.data.domains.every(domain => 
            matchObjectTypes<DomainDataI>(domain, ['name', 'created_timestamp', 'key_image_url', 'current_activated_owner', 'bond', 'subregistry_component_address', 'issuer_registrar_id'])
        )).toBe(true);

    });

    it(`should return as authentic`, async () => {

        const checkAuthenticity = await namespace.checkAuthenticity({
            domain: 'radixnamespace.xrd',
            accountAddress: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v'
        });

        if (checkAuthenticity.errors) {
            throw new Error('Authenticity check failed');
        }

        if (!matchObjectTypes<{ isAuthentic: boolean }>(checkAuthenticity.data, ['isAuthentic'])) {
            throw new Error('Authenticity object did not match expected schema');
        }

        expect('isAuthentic' in checkAuthenticity.data).toBe(true);

    });

    it(`should return as inauthentic`, async () => {

        const checkAuthenticity = await namespace.checkAuthenticity({
            domain: 'not-owner.xrd',
            accountAddress: 'account_tdx_2_12xalmh2ysnh2rkk8xmpj88dd7w3w937k8ejxh870qupsjtznj6f07v'
        });

        if (checkAuthenticity.errors) {
            throw new Error('Authenticity check failed');
        }

        if (!matchObjectTypes<{ isAuthentic: boolean }>(checkAuthenticity.data, ['isAuthentic'])) {
            throw new Error('Authenticity object did not match expected schema');
        }

        expect('isAuthentic' in checkAuthenticity && checkAuthenticity.data.isAuthentic).toBe(false);

    });

});
