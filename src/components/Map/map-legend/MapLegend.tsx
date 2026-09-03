import { IconButton } from '@fluentui/react';
import { useMemo, useState } from 'react';
import { ITheme } from '@legacy';
import { IMapLabels } from '../translations';
import { getMapLegendStyles } from './styles';

export interface IMapLegendProps {
    /** Markup to show. Already cleaned by the control - a provider never sanitizes. */
    html: string;
    labels: IMapLabels;
    theme: ITheme;
}

/**
 * The legend, over the map.
 *
 * The markup is whatever a maker put in the `Legend` property or the web resource it names, cleaned before
 * it gets here. Collapsible, because a legend explains a map rather than replaces it.
 *
 * @param props Cleaned markup, the labels and the host theme.
 * @returns The legend, or nothing when there is no markup.
 */
export const MapLegend = (props: IMapLegendProps) => {
    const styles = useMemo(() => getMapLegendStyles(props.theme), [props.theme]);
    const [isOpen, setIsOpen] = useState(true);

    if (!props.html) {
        return null;
    }

    if (!isOpen) {
        return (
            <IconButton
                iconProps={{ iconName: 'Info' }}
                title={props.labels.legend()}
                ariaLabel={props.labels.legend()}
                styles={{
                    root: {
                        borderRadius: props.theme.effects.roundedCorner4,
                        boxShadow: props.theme.effects.elevation8,
                        backgroundColor: props.theme.semanticColors.bodyBackground
                    }
                }}
                onClick={() => setIsOpen(true)} />
        );
    }

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <span>{props.labels.legend()}</span>
                <IconButton
                    iconProps={{ iconName: 'ChevronDown' }}
                    title={props.labels.legendCollapse()}
                    ariaLabel={props.labels.legendCollapse()}
                    onClick={() => setIsOpen(false)} />
            </div>
            <div className={styles.content} dangerouslySetInnerHTML={{ __html: props.html }} />
        </div>
    );
};
