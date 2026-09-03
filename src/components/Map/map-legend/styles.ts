import { ITheme, mergeStyleSets } from '@fluentui/react';

/** Height the legend may reach before it scrolls, so it never takes the map over. */
const MAX_HEIGHT = 280;

export const getMapLegendStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            maxWidth: 260,
            borderRadius: theme.effects.roundedCorner4,
            boxShadow: theme.effects.elevation8,
            backgroundColor: theme.semanticColors.bodyBackground,
            color: theme.semanticColors.bodyText,
            overflow: 'hidden'
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '2px 2px 2px 10px',
            fontSize: theme.fonts.small.fontSize,
            fontWeight: 600
        },
        content: {
            maxHeight: MAX_HEIGHT,
            overflowY: 'auto',
            padding: '0 10px 10px',
            fontSize: theme.fonts.small.fontSize,
            //the legend brings its own markup, so it gets sane defaults rather than the page's
            'p, ul, ol, h1, h2, h3, h4, h5, h6': { margin: '4px 0' },
            ul: { paddingLeft: 18 },
            table: { borderCollapse: 'collapse' },
            'td, th': { padding: '2px 6px 2px 0', textAlign: 'left' },
            img: { maxWidth: '100%' },
            a: { color: theme.palette.themePrimary }
        }
    });
};
