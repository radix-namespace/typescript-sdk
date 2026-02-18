import NamespaceSDK from '../..';
import { DomainDataI } from '../../common/domain.types';
import { matchObjectTypes } from '../utils';

describe('RNS - Fetch Domain Details', () => {

    const namespace = new NamespaceSDK({ network: 'stokenet' });

    it('should return correct domain details', async () => {

        const details = await namespace.getDomainDetails({ domain: 'radixnamespace.xrd' });

        if (details.errors) {
            throw new Error('Domain details were not returned.');
        }

        if (!matchObjectTypes<DomainDataI>(details.data, ['name', 'current_activated_owner', 'created_timestamp', 'key_image_url', 'bond', 'subregistry_component_address', 'issuer_registrar_id'])) {
            throw new Error('Domain object did not match expected schema');
        }

        expect(details.data.current_activated_owner).toBeTruthy();
        expect(details.data.subregistry_component_address).toBeTruthy();
        expect(details.data.bond).toBeDefined();

    });

});

