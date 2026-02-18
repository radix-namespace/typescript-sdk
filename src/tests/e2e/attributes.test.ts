import NamespaceSDK, { DomainAttributesResponseT } from '../..';
import Decimal from 'decimal.js';
import { matchObjectTypes } from '../utils';

describe('RNS - Fetch Domain Attributes', () => {
    const namespace = new NamespaceSDK({ network: 'stokenet' });

    it(`should return domain status and required bond units as Decimal`, async () => {

        const attributes = await namespace.getDomainStatus({ domain: 'radixnamespace.xrd' });

        if (attributes.errors) {
            throw new Error('Domain status was not returned.');
        }

        if (!matchObjectTypes<DomainAttributesResponseT>(attributes.data, ['domain', 'status', 'required_bond_units'])) {
            throw new Error('Attributes did not match expected schema');
        }

        expect(attributes.data.domain).toBe('radixnamespace.xrd');
        expect(attributes.data.status).not.toBe('available');
        expect(attributes.data.required_bond_units).toBeInstanceOf(Decimal);
        expect(attributes.data.required_bond_units.toNumber()).toBeGreaterThan(0);
        expect(attributes.data.required_bond_units.toNumber()).toBe(4);

    });
});
