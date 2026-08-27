import { mergeStyleSets } from "@fluentui/react";

export const getLeafletMapProviderStyles = (invertTiles: boolean) => {
    return mergeStyleSets({
        container: {
            width: '100%',
            height: '100%',
            flex: 1,
            //the box the overlay is positioned against
            position: 'relative',
            //raster tiles come in one fixed palette, so a dark theme filters them instead
            '.leaflet-tile-pane': invertTiles ? {
                filter: 'invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)'
            } : undefined
        },
        map: {
            width: '100%',
            height: '100%'
        }
    });
};
