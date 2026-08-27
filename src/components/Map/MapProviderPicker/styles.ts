import { mergeStyleSets } from "@fluentui/react";
import { ITheme } from "@legacy";

export const getMapProviderPickerStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            position: 'absolute',
            top: 8,
            right: 8,
            width: 180,
            //leaflet draws its own controls on 800
            zIndex: 1000,
            '.ms-Dropdown-title': {
                boxShadow: theme.effects.elevation8
            }
        }
    });
};
