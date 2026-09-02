import { ITheme, mergeStyleSets } from '@fluentui/react';

export const getMapStatusStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            position: 'absolute',
            top: 8,
            left: 8,
            //above the map's own panes, below the provider picker
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px',
            borderRadius: theme.effects.roundedCorner4,
            boxShadow: theme.effects.elevation8,
            backgroundColor: theme.semanticColors.bodyBackground,
            color: theme.semanticColors.bodyText,
            fontSize: theme.fonts.small.fontSize,
            pointerEvents: 'none'
        },
        warningIcon: {
            color: theme.semanticColors.severeWarningIcon
        }
    });
};
