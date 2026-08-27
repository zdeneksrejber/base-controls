import { mergeStyleSets } from "@fluentui/react";
import { MAP_PROVIDER_LAYOUT } from "../layout";

export const getGoogleMapsProviderStyles = () => {
    return mergeStyleSets({
        container: MAP_PROVIDER_LAYOUT.container,
        map: [MAP_PROVIDER_LAYOUT.map, {
            //@vis.gl drops its own default style once a className is set, so this repeats all of it
            position: 'relative',
            zIndex: 0
        }]
    });
};
