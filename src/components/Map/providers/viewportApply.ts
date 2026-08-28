import { IMapBounds, IMapCoordinates, IMapViewport } from '../viewport';

/**
 * Applies a viewport to a provider's underlying map instance: fit `bounds` when there are any, otherwise set
 * `center` and `zoom` directly. Shared so a provider's `ApplyViewport` effect states only its own map api - the
 * branch and the try/catch around it are the same for every vendor.
 */
export const applyMapViewport = (
    viewport: IMapViewport,
    fitBounds: (bounds: IMapBounds, padding: number) => void,
    setCenterZoom: (center: IMapCoordinates, zoom: number) => void,
    onError: (error: unknown) => void
): void => {
    try {
        if (viewport.bounds) {
            fitBounds(viewport.bounds, viewport.padding);
            return;
        }
        setCenterZoom(viewport.center, viewport.zoom);
    } catch (error) {
        onError(error);
    }
};
