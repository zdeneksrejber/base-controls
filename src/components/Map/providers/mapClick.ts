/**
 * Whether a click that reached the map was really a click on the map.
 *
 * Anything the control draws over the map - a card, its buttons - lives inside the map's own element, and a
 * map library only knows to ignore those clicks while it can still walk the target's ancestors and find its
 * own chrome there. A button that removes itself as it is pressed, which is exactly what a card's Delete
 * does, is already detached by the time the click finishes bubbling: its ancestors are gone, the map sees a
 * click it cannot attribute, and a control that creates records on click would create one.
 *
 * @param target Element the browser reported as the click target.
 * @returns `false` for a target that has left the page, `true` otherwise.
 */
export const isMapSurfaceClick = (target: EventTarget | null | undefined): boolean => {
    const node = target as Node | null | undefined;
    if (!node || typeof (node as Node).isConnected !== 'boolean') {
        return true;
    }
    return node.isConnected;
};
