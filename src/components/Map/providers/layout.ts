import { IStyle } from "@fluentui/react";

/**
 * How a provider fills the box the control gave it, shared so a provider states its looks and not its layout.
 * A map has no content to be sized by, so it can never let the host size it.
 *
 * This is the responsive PCF chain: every ancestor of the filling element is a flex column allowed to shrink,
 * and the filling element takes what is left. Compose it into the provider's own style set:
 *
 * ```ts
 * mergeStyleSets({
 *     container: [MAP_PROVIDER_LAYOUT.container, { ...whatever the vendor needs }],
 *     map: MAP_PROVIDER_LAYOUT.map
 * });
 * ```
 */
export const MAP_PROVIDER_LAYOUT: { container: IStyle; map: IStyle } = {
    /** The provider's outermost element, and the box its chrome - a vendor logo, say - is positioned against. */
    container: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minWidth: 0,
        minHeight: 0,
        position: 'relative'
    },
    /** The element the map itself is drawn into, filling whatever the container has left. */
    map: {
        flex: 1,
        minWidth: 0,
        minHeight: 0
    }
};
