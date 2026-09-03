import { ThemeProvider } from '@fluentui/react';
import { ReactNode, useMemo } from 'react';
import { ITheme } from '@legacy';
import { getMapOverlayStyles } from './styles';

/** Corner of the map a piece of chrome is anchored to. */
export type IMapOverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Axis the chrome in one corner runs along. */
export type IMapOverlayDirection = 'row' | 'column';

export interface IMapOverlayProps {
    position: IMapOverlayPosition;
    /** How the chrome in this corner is laid out. Defaults to a stack. */
    direction?: IMapOverlayDirection;
    theme: ITheme;
    children: ReactNode;
}

/**
 * Anchors the control's chrome - the search box, the status pill, the legend - over whichever provider is
 * drawing, so none of them needs to know how a given map positions things.
 *
 * Only the chrome itself takes pointer events, so the empty space around it still pans the map.
 *
 * @param props Corner to anchor to, the axis to run along, the host theme, and the chrome to place there.
 * @returns The positioned chrome, or nothing when there is none.
 */
export const MapOverlay = (props: IMapOverlayProps) => {
    const direction = props.direction ?? 'column';
    const styles = useMemo(
        () => getMapOverlayStyles(props.theme, props.position, direction),
        [props.theme, props.position, direction]);

    if (!props.children) {
        return null;
    }

    return (
        <ThemeProvider theme={props.theme} applyTo='none' className={styles.root}>
            {props.children}
        </ThemeProvider>
    );
};
