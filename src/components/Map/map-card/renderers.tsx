import { IMapCardRenderers } from '../internal/cards';
import { MapCard } from './MapCard';

/**
 * The card renderers every control has without installing anything.
 *
 * `fields` shows the record's attributes. `function` renders nothing - the control runs the web resource it
 * names instead, which is how a pin can trigger custom code rather than open a card. `none` is inert.
 *
 * Adaptive Cards live behind their own entry point, because the packages that render them are optional peer
 * dependencies - see `Map/map-card/adaptive-card`.
 */
export const DEFAULT_MAP_CARD_RENDERERS: IMapCardRenderers = {
    fields: (props) => <MapCard {...props} />,
    function: () => null,
    none: () => null
};
