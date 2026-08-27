import { mergeStyleSets } from "@fluentui/react";

export const getGoogleMapsProviderStyles = () => {
    return mergeStyleSets({
        container: {
            width: '100%',
            height: '100%',
            flex: 1,
        },
        map: {
            width: '100%',
            height: '100%',
            //@vis.gl drops its own default style once a className is set, so this repeats all of it
            position: 'relative',
            zIndex: 0
        }
    });
};
