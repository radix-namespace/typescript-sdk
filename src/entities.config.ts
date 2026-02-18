import { EntitiesConfigT } from "./common/entities.types";

/**
 * Radix Namespace Configuration
 * 
 * This config only specifies the main Radix Namespace component address.
 * All resources (domains, badges, etc.) are auto-discovered from the component state
 * upon SDK initialization via the Gateway API.
 * See NamespaceCoreExpansionI interface for full list of available fields.
 */
const config: EntitiesConfigT = {

    stokenet: {
        rnsCore: "component_tdx_2_1cq3hzzgwypv3494aprg76c3pvxwpxmwalm7ld257pudj8urzc6l5ap"
    },

    mainnet: {
        // Note: mainnet component address can be added upon any deployment (upon which you should fork this repo and deploy your own SDK instance)
        rnsCore: null
    }

};

export default config;