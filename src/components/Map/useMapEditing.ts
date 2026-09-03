import { useCallback, useRef, useState } from 'react';
import { IDataset, IRecord } from '@talxis/client-libraries';
import { getAddressValues, hasAddressAttributes, IMapAddressAttributes } from './addressMapping';
import { IMapGeocoder } from './geocoding';
import { IMapLocation } from './providers';
import { IMapCoordinates } from './viewport';

export interface IUseMapEditing {
    dataset?: IDataset;
    /** Attributes the coordinates are written back to. Editing needs both. */
    latitudeAttribute?: string;
    longitudeAttribute?: string;
    /** Attributes the resolved address is written back to. */
    addressAttributes: IMapAddressAttributes;
    /** Whether a pin can be dragged to move its record. */
    canDrag: boolean;
    /** Whether clicking the map creates a record. */
    canCreate: boolean;
    /** Reverse geocoder, for filling the address of a moved or created pin. */
    geocoder?: IMapGeocoder;
    language?: string;
}

export interface IMapEditingState {
    /** Whether this pin can be dragged. */
    isPinDraggable: (location: IMapLocation) => boolean;
    /** Moves a record to where its pin was dropped. */
    onLocationDragEnd?: (location: IMapLocation, coordinates: IMapCoordinates) => void;
    /** Creates a record where the map was clicked. */
    onMapClick?: (coordinates: IMapCoordinates) => void;
    /** Deletes a record the map created, from its own pin. */
    onDeleteLocation?: (location: IMapLocation) => void;
    /** Whether a record is being written right now, so the map can say so. */
    isSaving: boolean;
    /** Ids of the records this control created, which are the ones its delete button offers. */
    createdRecordIds: string[];
}

/**
 * Writes the map back to the dataset.
 *
 * Both editing gestures are off unless a maker turns them on, because a map that moves records when a finger
 * slips is worse than one that does not move them at all. Where address attributes are configured, moving or
 * creating a pin also reverse geo-codes the point and writes the components back - which is what makes a map
 * click a usable way to fill in an address.
 *
 * @param props Bound dataset, the attributes to write, what is allowed, and the geocoder.
 * @returns The gestures a provider can offer, and what is going on.
 */
export const useMapEditing = (props: IUseMapEditing): IMapEditingState => {
    const { dataset, latitudeAttribute, longitudeAttribute, addressAttributes, canDrag, canCreate, geocoder, language } = props;
    const [isSaving, setIsSaving] = useState(false);
    const [createdRecordIds, setCreatedRecordIds] = useState<string[]>([]);
    //ids the control created, kept in a ref as well so a save that finishes late still knows about them
    const createdRef = useRef<Set<string>>(new Set());

    const canEdit = !!dataset && !!latitudeAttribute && !!longitudeAttribute;

    /** Fills a record's coordinates, and its address components where any are configured. */
    const applyCoordinates = useCallback(async (record: IRecord, coordinates: IMapCoordinates) => {
        record.setValue(latitudeAttribute as string, coordinates.latitude);
        record.setValue(longitudeAttribute as string, coordinates.longitude);

        if (!geocoder || !hasAddressAttributes(addressAttributes)) {
            return;
        }
        try {
            const place = await geocoder.reverseGeocode(coordinates, { language });
            if (!place) {
                return;
            }
            Object.entries(getAddressValues(place.address, addressAttributes)).forEach(([attribute, value]) => {
                record.setValue(attribute, value);
            });
        } catch (error) {
            //an address the service cannot resolve must not stop the coordinates being saved
            console.warn('Map: could not resolve the address of the point, saving the coordinates alone:', error);
        }
    }, [latitudeAttribute, longitudeAttribute, addressAttributes, geocoder, language]);

    const save = useCallback(async (record: IRecord, action: string) => {
        setIsSaving(true);
        try {
            const result = await record.save();
            if (result && result.success === false) {
                console.error(`Map: ${action} failed:`, result);
            }
            return result;
        } catch (error) {
            console.error(`Map: ${action} failed:`, error);
            return undefined;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const onLocationDragEnd = useCallback((location: IMapLocation, coordinates: IMapCoordinates) => {
        const record = dataset?.getDataProvider().getRecordsMap()[location.id];
        if (!record) {
            return;
        }
        void (async () => {
            await applyCoordinates(record, coordinates);
            await save(record, `moving the record "${location.label ?? location.id}"`);
        })();
    }, [dataset, applyCoordinates, save]);

    const onMapClick = useCallback((coordinates: IMapCoordinates) => {
        const provider = dataset?.getDataProvider();
        if (!provider) {
            return;
        }
        void (async () => {
            const record = provider.newRecord({ position: 'end' });
            await applyCoordinates(record, coordinates);
            const result = await save(record, 'creating a record');
            if (result && result.success === false) {
                return;
            }
            createdRef.current.add(record.getRecordId());
            setCreatedRecordIds([...createdRef.current]);
        })();
    }, [dataset, applyCoordinates, save]);

    const onDeleteLocation = useCallback((location: IMapLocation) => {
        const provider = dataset?.getDataProvider();
        if (!provider) {
            return;
        }
        void (async () => {
            setIsSaving(true);
            try {
                const result = await provider.deleteRecords([location.id]);
                if (!result.success) {
                    console.error(`Map: deleting the record "${location.label ?? location.id}" failed:`, result);
                    return;
                }
                createdRef.current.delete(location.id);
                setCreatedRecordIds([...createdRef.current]);
                await dataset?.refresh();
            } catch (error) {
                console.error(`Map: deleting the record "${location.label ?? location.id}" failed:`, error);
            } finally {
                setIsSaving(false);
            }
        })();
    }, [dataset]);

    return {
        //a group stands for several records and has no single one to move
        isPinDraggable: useCallback((location: IMapLocation) => canEdit && canDrag && !location.cluster, [canEdit, canDrag]),
        onLocationDragEnd: canEdit && canDrag ? onLocationDragEnd : undefined,
        onMapClick: canEdit && canCreate ? onMapClick : undefined,
        onDeleteLocation: canEdit && canCreate ? onDeleteLocation : undefined,
        isSaving,
        createdRecordIds
    };
};
