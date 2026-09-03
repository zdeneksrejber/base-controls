import { ReactNode, useCallback, useMemo, useState } from 'react';
import { executeFunctionAsync, IRecord } from '@talxis/client-libraries';
import { IContext } from '@interfaces';
import { ITheme } from '@legacy';
import {
    DEFAULT_MAP_CARD,
    getMapCardDefinition,
    IMapCardAction,
    IMapCardDefinition,
    IMapCardRenderers,
    IMapCardRule
} from './cards';
import { DEFAULT_MAP_CARD_RENDERERS } from './map-card';
import { MapClusterCard } from './map-cluster-card';
import { IMapLocation, IMapOpenCard } from './providers';
import { IMapLabels } from './translations';

export interface IUseMapCards {
    /** Records currently drawn, so a pin can be traced back to the record behind it. */
    records: IRecord[];
    /** Card rules from the `Cards` parameter. */
    rules: IMapCardRule[];
    /** The card used when no rule applies. */
    fallback?: IMapCardDefinition;
    /** Renderers on top of the built-in ones, keyed by card type. */
    renderers?: IMapCardRenderers;
    context: IContext;
    theme: ITheme;
    labels: IMapLabels;
    /** Zooms the map to where a group comes apart, for the button on a grouped card. */
    onZoomToCluster: (location: IMapLocation) => void;
    /** Deletes a record the map created, offered as a button on its card. */
    onDeleteLocation?: (location: IMapLocation) => void;
    /** Ids of the records the map created, which are the only ones it offers to delete. */
    deletableRecordIds?: string[];
}

export interface IMapCardsState {
    /** The one card that is open, ready to hand to the provider. */
    openCard?: IMapOpenCard;
    /** Whether activating this pin opens a card at all, so a provider can style it as activatable. */
    hasCard: (location: IMapLocation) => boolean;
    /** Opens the card for a pin, or runs the function its rules chose instead of showing one. */
    onOpenCard: (location: IMapLocation) => void;
    onCloseCard: () => void;
}

/**
 * Runs a card's button.
 *
 * @param action Web resource and function the button names.
 * @param record Record the card is about, handed to the function.
 */
const executeCardAction = (action: IMapCardAction, record: IRecord) => {
    //@ts-ignore - executeFunction is missing from @types/xrm
    if (typeof window.Xrm?.Utility?.executeFunction !== 'function') {
        console.warn(`Map: the card action "${action.functionName}" needs a host that provides Xrm, so nothing ran.`);
        return;
    }
    executeFunctionAsync(action.webResourceName, action.functionName, [{ recordId: record.getRecordId(), record }])
        .catch((error) => console.error(
            `Map: the card action "${action.functionName}" in "${action.webResourceName}" failed:`, error
        ));
};

/**
 * Owns what happens when a pin is activated.
 *
 * One card is open at a time, which the control enforces by holding a single open pin rather than by asking
 * providers to close each other's. Which card a pin opens comes from the same rule matching that chooses its
 * icon, so "depots open an Adaptive Card, service points run a function" is one line of configuration.
 *
 * @param props The drawn records, the card rules, the renderers, the host context and how to zoom.
 * @returns The open card and the ways to change it.
 */
export const useMapCards = (props: IUseMapCards): IMapCardsState => {
    const {
        records,
        rules,
        fallback,
        renderers,
        context,
        theme,
        labels,
        onZoomToCluster,
        onDeleteLocation,
        deletableRecordIds
    } = props;
    const [openLocation, setOpenLocation] = useState<IMapLocation>();

    const recordsById = useMemo(
        () => new Map(records.map((record) => [record.getRecordId(), record])),
        [records]
    );
    const allRenderers = useMemo(() => ({ ...DEFAULT_MAP_CARD_RENDERERS, ...renderers }), [renderers]);
    const getDefinition = useCallback(
        (record: IRecord) => getMapCardDefinition(record, rules, fallback ?? DEFAULT_MAP_CARD),
        [rules, fallback]
    );

    const onCloseCard = useCallback(() => setOpenLocation(undefined), []);

    const getClusterRecords = useCallback((location: IMapLocation): IRecord[] =>
        (location.cluster?.recordIds ?? [])
            .map((recordId) => recordsById.get(recordId))
            .filter((record): record is IRecord => !!record),
    [recordsById]);

    const deletableIds = useMemo(() => new Set(deletableRecordIds ?? []), [deletableRecordIds]);

    const renderRecordCard = useCallback((record: IRecord, location: IMapLocation): ReactNode => {
        const definition = getDefinition(record);
        const renderer = allRenderers[definition.type];
        if (!renderer) {
            console.warn(`Map: no renderer is registered for the card type "${definition.type}".`);
            return null;
        }
        return renderer({
            record,
            location,
            definition,
            context,
            theme,
            labels,
            onExecuteAction: (action) => executeCardAction(action, record),
            onDelete: onDeleteLocation && deletableIds.has(record.getRecordId())
                ? () => {
                    onDeleteLocation({ ...location, id: record.getRecordId() });
                    onCloseCard();
                }
                : undefined,
            onClose: onCloseCard
        });
    }, [allRenderers, getDefinition, context, theme, labels, onCloseCard, onDeleteLocation, deletableIds]);

    const hasCard = useCallback((location: IMapLocation): boolean => {
        if (location.cluster) {
            return getClusterRecords(location).length > 0;
        }
        const record = recordsById.get(location.id);
        return !!record && getDefinition(record).type !== 'none';
    }, [recordsById, getDefinition, getClusterRecords]);

    const onOpenCard = useCallback((location: IMapLocation) => {
        if (location.cluster) {
            setOpenLocation(getClusterRecords(location).length ? location : undefined);
            return;
        }
        const record = recordsById.get(location.id);
        if (!record) {
            return;
        }
        const definition = getDefinition(record);
        //a function card shows nothing - running the web resource is the whole reaction to the click
        if (definition.type === 'function') {
            if (definition.webResourceName && definition.functionName) {
                executeCardAction({
                    label: definition.functionName,
                    webResourceName: definition.webResourceName,
                    functionName: definition.functionName
                }, record);
            } else {
                console.warn('Map: a card of type "function" needs both webResourceName and functionName.');
            }
            setOpenLocation(undefined);
            return;
        }
        setOpenLocation(definition.type === 'none' ? undefined : location);
    }, [recordsById, getDefinition, getClusterRecords]);

    const openCard = useMemo<IMapOpenCard | undefined>(() => {
        if (!openLocation) {
            return undefined;
        }
        const content = openLocation.cluster
            ? <MapClusterCard
                cluster={openLocation.cluster}
                records={getClusterRecords(openLocation)}
                labels={labels}
                theme={theme}
                onRenderRecordCard={(record) => renderRecordCard(record, openLocation)}
                onZoomIn={() => {
                    onZoomToCluster(openLocation);
                    setOpenLocation(undefined);
                }} />
            : renderRecordCard(recordsById.get(openLocation.id) as IRecord, openLocation);
        if (!content) {
            return undefined;
        }
        return {
            locationId: openLocation.id,
            coordinates: { latitude: openLocation.latitude, longitude: openLocation.longitude },
            content
        };
    }, [openLocation, recordsById, renderRecordCard, getClusterRecords, labels, theme, onZoomToCluster]);

    return { openCard, hasCard, onOpenCard, onCloseCard };
};
