import { ITheme, mergeStyleSets } from '@fluentui/react';
import { IMapOverlayDirection, IMapOverlayPosition } from './MapOverlay';

/** Distance, in pixels, the chrome keeps from the edge of the map. */
const EDGE_GAP = 8;

/**
 * Extra room left along the top left edge for the zoom control every tile based provider draws there.
 * Google draws no default controls, so this is dead space on that provider - a small price for chrome that
 * never lands on top of a button.
 */
const ZOOM_CONTROL_CLEARANCE = 44;

/** Where each corner sits. */
const POSITIONS: { [position in IMapOverlayPosition]: object } = {
    'top-left': { top: EDGE_GAP, left: EDGE_GAP + ZOOM_CONTROL_CLEARANCE },
    'top-right': { top: EDGE_GAP, right: EDGE_GAP },
    'bottom-left': { bottom: EDGE_GAP, left: EDGE_GAP + ZOOM_CONTROL_CLEARANCE },
    'bottom-right': { bottom: EDGE_GAP, right: EDGE_GAP }
};

/**
 * How the chrome packs across the axis it does not run along.
 *
 * A stack hugs the edge it hangs off, so nothing drifts into the middle of the map. A row instead keeps its
 * children level with the top or bottom edge, so a piece of chrome that grows - a legend being opened - grows
 * away from the map's corner rather than pushing what sits beside it.
 */
const getAlignItems = (position: IMapOverlayPosition, direction: IMapOverlayDirection) => {
    if (direction === 'row') {
        return position.startsWith('top') ? 'flex-start' : 'flex-end';
    }
    return position.endsWith('right') ? 'flex-end' : 'flex-start';
};

export const getMapOverlayStyles = (theme: ITheme, position: IMapOverlayPosition, direction: IMapOverlayDirection) => {
    return mergeStyleSets({
        root: {
            position: 'absolute',
            display: 'flex',
            flexDirection: direction,
            alignItems: getAlignItems(position, direction),
            gap: 8,
            //leaflet draws its own controls on 800
            zIndex: 1000,
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
