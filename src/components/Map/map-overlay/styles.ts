import { ITheme, mergeStyleSets } from '@fluentui/react';
import { IMapOverlayPosition } from './MapOverlay';

/** Distance, in pixels, the chrome keeps from the edge of the map. */
const EDGE_GAP = 8;

/**
 * Extra room left along the top left edge for the zoom control every tile based provider draws there.
 * Google draws no default controls, so this is dead space on that provider - a small price for chrome that
 * never lands on top of a button.
 */
const ZOOM_CONTROL_CLEARANCE = 44;

/**
 * Where each corner sits. Above the map's own panes and below the provider picker, so the picker stays
 * reachable however much chrome a maker turns on.
 */
const POSITIONS: { [position in IMapOverlayPosition]: object } = {
    'top-left': { top: EDGE_GAP, left: EDGE_GAP + ZOOM_CONTROL_CLEARANCE, alignItems: 'flex-start' },
    'top-right': { top: EDGE_GAP, right: EDGE_GAP, alignItems: 'flex-end' },
    'bottom-left': { bottom: EDGE_GAP, left: EDGE_GAP + ZOOM_CONTROL_CLEARANCE, alignItems: 'flex-start' },
    'bottom-right': { bottom: EDGE_GAP, right: EDGE_GAP, alignItems: 'flex-end' }
};

export const getMapOverlayStyles = (theme: ITheme, position: IMapOverlayPosition) => {
    return mergeStyleSets({
        root: {
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 900,
            //the container itself must not swallow drags meant for the map, only its contents take events
            pointerEvents: 'none',
            '> *': {
                pointerEvents: 'auto'
            },
            ...POSITIONS[position]
        },
        surface: {
            borderRadius: theme.effects.roundedCorner4,
            boxShadow: theme.effects.elevation8,
            backgroundColor: theme.semanticColors.bodyBackground,
            color: theme.semanticColors.bodyText
        }
    });
};
