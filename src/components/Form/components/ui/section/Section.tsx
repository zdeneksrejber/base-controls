import { Text, useTheme } from "@fluentui/react";
import { SectionContext } from "./context";
import { getSectionStyles } from "./styles";
import React from "react";
import { ILayoutBreakpoints, Layout } from "@components/Form/layout";
import { useCalculatedColumns } from "@components/Form/layout/useCalculatedColumns";

/**
 * How a section is drawn.
 *
 * `card` is the default - a raised, bordered panel with its label as a heading. `banded` is the compact look
 * of a read-only record card: a flat body under a coloured header bar carrying the label in capitals.
 */
export type ISectionAppearance = "card" | "banded";

export interface ISectionProps {
    id?: string;
    showLabel?: boolean;
    showBar?: boolean;
    visible?: boolean;
    appearance?: ISectionAppearance;
    layout?: Partial<ILayoutBreakpoints>;
    labelWidth?: number;
    cellLabelCollapseBreakpoint?: number;
    cellLabelPosition?: "Top" | "Left";
    label?: string;
    children?: React.ReactNode;
}

export const Section = (props: ISectionProps) => {
    const { children, showBar = true, showLabel = true, label, id, appearance = "card" } = props;
    const isHeaderVisible = showBar && showLabel && label;

    const bodyContainerRef = React.useRef<HTMLDivElement>(null);
    const cellComponents = React.Children.toArray(children).filter(child => React.isValidElement(child));

    const breakpoints: Partial<ILayoutBreakpoints> = { ...{ lg: cellComponents.length }, ...props.layout };
    const columnBreakpoints = { ...Layout.createDefaultColumnBreakpoints(breakpoints), ...props.layout };

    const { containerStyles, columnsPerRow, containerWidth } = useCalculatedColumns({
        breakpoints: columnBreakpoints,
        ref: bodyContainerRef
    });

    const theme = useTheme();
    const styles = getSectionStyles({ section: props, theme });

    return <div className={styles.section} data-id={`section-${id}`} data-appearance={appearance}>
        {isHeaderVisible && (
            <div className={styles.header}>
                <Text variant={appearance === "banded" ? "small" : "mediumPlus"} className={styles.title}>
                    {label}
                </Text>
            </div>
        )}
        <div ref={bodyContainerRef} className={styles.body} style={containerStyles}>
            <SectionContext.Provider value={{ ...props, columnsPerRow, containerWidth }}>
                {children}
            </SectionContext.Provider>
        </div>
    </div>;
};
