import { mergeStyleSets } from "@fluentui/react";
import { MAP_PROVIDER_LAYOUT } from "../layout";

export const getLeafletMapProviderStyles = (invertTiles: boolean) => {
    return mergeStyleSets({
        container: [MAP_PROVIDER_LAYOUT.container, {
            //raster tiles come in one fixed palette, so a dark theme filters them instead
            '.leaflet-tile-pane': invertTiles ? {
                filter: 'invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)'
            } : undefined
        }],
        map: MAP_PROVIDER_LAYOUT.map
    });
};
