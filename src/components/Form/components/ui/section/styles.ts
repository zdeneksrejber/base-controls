import { ITheme, mergeStyleSets } from "@fluentui/react";
import { ISectionProps } from "./Section";

interface ISectionStyleParams {
    section: ISectionProps;
    theme: ITheme;
}

const SECTION_LAYOUT_GAP = 10;
const SECTION_DEFAULT_ROW_HEIGHT = 10;

/** Cells sit closer together under a banded header, where each is one line of text. */
const BANDED_LAYOUT_GAP = 2;

export const getSectionStyles = ({ section, theme }: ISectionStyleParams) => {
    const isBanded = section.appearance === "banded";

    return mergeStyleSets({
        section: {
            borderRadius: isBanded ? 0 : 8,
            border: isBanded ? "none" : `1px solid ${theme.palette.neutralLight}`,
            backgroundColor: isBanded ? "transparent" : theme.semanticColors.bodyBackground,
            overflow: "hidden",
            boxShadow: isBanded ? "none" : theme.effects.elevation4,
            opacity: 1,
            transform: "translateY(0)",
            transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease-out 0.01s",
            '@starting-style': {
                opacity: 0,
                transform: "translateY(-16px)"
            },
            ...(section.visible === false ? { display: 'none' } : {})
        },
        header: {
            display: "flex",
            alignItems: "center",
            ...(isBanded
                ? {
                    padding: "6px 10px",
                    borderRadius: 2,
                    backgroundColor: theme.palette.themeLighter,
                }
                : {
                    padding: "12px 16px 4px 16px",
                }),
        },
        title: {
            fontSize: isBanded ? theme.fonts.small.fontSize : theme.fonts.medium.fontSize,
            fontFamily: theme.fonts.medium.fontFamily,
            fontWeight: 600,
            color: theme.semanticColors.bodyText,
            ...(isBanded
                ? {
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                }
                : {}),
        },
        body: {
            padding: isBanded ? "6px 10px 8px 10px" : "16px 16px 16px 16px",
            containerType: 'inline-size',
            gap: `${isBanded ? BANDED_LAYOUT_GAP : SECTION_LAYOUT_GAP}px`,
            gridAutoRows: `minmax(${SECTION_DEFAULT_ROW_HEIGHT}px, auto)`,
        },
    });
};
