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
 * The markup is whatever a maker put in the `Legend` property or the web resource it names, cleaned before it
 * gets here. Its button stays beside the provider picker whether the legend is open or shut, and the panel
 * drops below that row - a legend explains a map rather than replaces it.
 */
export const MapLegend = (props: IMapLegendProps) => {
    const styles = useMemo(() => getMapLegendStyles(props.theme), [props.theme]);
    const [isOpen, setIsOpen] = useState(true);

    if (!props.html) {
        return null;
    }

    const label = isOpen ? props.labels.legendCollapse() : props.labels.legend();
    return (
        <div className={styles.root}>
            <IconButton
                className={styles.button}
                iconProps={{ iconName: 'Info' }}
                checked={isOpen}
                aria-expanded={isOpen}
                title={label}
                ariaLabel={label}
                onClick={() => setIsOpen((current) => !current)} />
            {isOpen &&
                <div className={styles.content} dangerouslySetInnerHTML={{ __html: props.html }} />}
        </div>
    );
};
