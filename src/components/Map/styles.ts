import { mergeStyleSets } from "@fluentui/react";

export const getMapStyles = () => {
    return mergeStyleSets({
        root: {
            display: 'flex',
            flexDirection: 'column',
            //fills a responsive host, which sizes by flex; the height covers one that sizes by height instead
            flexGrow: 1,
            height: '100%',
            minWidth: 0,
            //a map has no content to be sized by, so it keeps a floor for a host that hands it no height at all
            minHeight: 200,
            //the box the provider picker is positioned against
            position: 'relative'
        }
    });
};
