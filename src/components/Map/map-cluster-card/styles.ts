import { ITheme, mergeStyleSets } from '@fluentui/react';

/** Height the stack of member cards may reach before it scrolls. */
const MAX_HEIGHT = 300;

export const getMapClusterCardStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            minWidth: 240,
            maxWidth: 340,
            color: theme.semanticColors.bodyText
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 6
        },
        title: {
            fontWeight: 600,
            fontSize: theme.fonts.mediumPlus.fontSize
        },
        list: {
            maxHeight: MAX_HEIGHT,
            overflowY: 'auto'
        },
        member: {
            padding: '8px 0',
            borderTop: `1px solid ${theme.semanticColors.bodyDivider}`,
            ':first-child': {
                borderTop: 'none',
                paddingTop: 0
            }
        },
        more: {
            display: 'block',
            paddingTop: 8,
            fontSize: theme.fonts.small.fontSize,
            color: theme.semanticColors.bodySubtext
        }
    });
};
