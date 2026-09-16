import { ITheme, mergeStyleSets } from "@fluentui/react";

export const getReadOnlyControlRendererStyles = (theme: ITheme) => {
    return mergeStyleSets({
        value: {
            //sits on the same baseline as the cell's label, which is a Fluent Label with 5px vertical padding
            padding: "5px 0",
            fontSize: theme.fonts.medium.fontSize,
            color: theme.semanticColors.bodyText,
            overflowWrap: "anywhere",
        },
        multiline: {
            whiteSpace: "pre-wrap",
        },
        empty: {
            color: theme.semanticColors.bodySubtext,
        },
    });
};
