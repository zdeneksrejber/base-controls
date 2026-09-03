import { IMapCardRenderers } from '../../cards';
import { AdaptiveMapCard } from './AdaptiveMapCard';

/**
 * The Adaptive Card renderer, for a host that wants `Cards` rules of type `adaptiveCard`.
 *
 * It lives behind its own entry point because `adaptivecards` and `adaptivecards-templating` are optional
 * peer dependencies: importing this module is what pulls them into the build, so a consumer who renders
 * cards from record columns never installs a card engine they do not use.
 *
 * ```tsx
 * import { ADAPTIVE_MAP_CARD_RENDERERS } from '@talxis/base-controls/dist/components/Map/map-card/adaptive-card';
 *
 * <Map context={context} parameters={parameters} onGetCardRenderers={() => ADAPTIVE_MAP_CARD_RENDERERS} />
 * ```
 */
export const ADAPTIVE_MAP_CARD_RENDERERS: IMapCardRenderers = {
    adaptiveCard: (props) => <AdaptiveMapCard {...props} />
};
