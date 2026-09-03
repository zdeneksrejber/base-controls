import { ReactNode, useEffect, useMemo, useState } from 'react'
import type { IDataProviderEventListeners, IDataset } from '@talxis/client-libraries'
import { IMap, IMapOutputs, IMapParameters, IMapViewport, Map, resolveLocationFromIpAddress } from '@talxis/base-controls/components/Map'
import { googleMapsVendor } from '@talxis/base-controls/components/Map/providers/google-maps'
import { useEventEmitter } from '@talxis/base-controls/hooks'
import { usePcfContext } from '@talxis/base-controls/utils'
import { MAP_API_KEYS } from './mapApiKeys'

//the one vendor a wrapper must name in code: importing it is what pulls in the optional Google Maps peer
const HOST_VENDORS = [googleMapsVendor]

export interface IMapDemoProps {
    dataset: IDataset
    /** Manifest properties this story exercises, on top of the coordinate bindings every story needs. */
    parameters?: Partial<IMapParameters>
    /** Height of the box the control is given, since a map fills whatever it is handed. */
    height?: number
    /** Whether the readout under the map is shown. */
    showReadout?: boolean
    /** Extra readout of the story's own. */
    children?: ReactNode
    /** Code hooks the story demonstrates, passed straight through to the control. */
    onResolvePin?: IMap['onResolvePin']
    onGetCardRenderers?: IMap['onGetCardRenderers']
}

const formatViewport = (viewport: IMapViewport) =>
    `${viewport.center.latitude.toFixed(3)}, ${viewport.center.longitude.toFixed(3)} @ zoom ${viewport.zoom}`

/**
 * Hosts the Map control the way a PCF wrapper would: manifest properties in, outputs out, api keys resolved
 * from the environment, and Google Maps registered as a vendor.
 *
 * @param props Dataset, the manifest properties under demonstration, and the box to draw in.
 * @returns The control plus a readout of what it reported back.
 */
export const MapDemo = (props: IMapDemoProps) => {
    const context = usePcfContext()
    const [outputs, setOutputs] = useState<IMapOutputs>({})
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [providerId, setProviderId] = useState<string | undefined>(props.parameters?.DefaultVendor?.raw ?? undefined)
    const onGetMapVendors = useMemo(() => () => HOST_VENDORS, [])

    useEventEmitter<IDataProviderEventListeners>(props.dataset, 'onRecordsSelected', (ids: string[]) => setSelectedIds(ids ?? []))
    useEffect(() => setSelectedIds(props.dataset.getSelectedRecordIds()), [props.dataset])

    return (
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: props.height ?? 520, display: 'flex', flexDirection: 'column' }}>
                <Map
                    context={context}
                    parameters={{
                        Dataset: props.dataset,
                        HereApiKey: { raw: MAP_API_KEYS.here },
                        MapyApiKey: { raw: MAP_API_KEYS.mapy },
                        GoogleApiKey: { raw: MAP_API_KEYS.google },
                        MapProviderId: { raw: providerId ?? null },
                        ...props.parameters
                    } as IMapParameters}
                    onGetMapVendors={onGetMapVendors}
                    onResolvePin={props.onResolvePin}
                    onGetCardRenderers={props.onGetCardRenderers}
                    onResolveFallbackLocation={resolveLocationFromIpAddress}
                    onNotifyOutputChanged={(changed: IMapOutputs) => {
                        setOutputs((current) => ({ ...current, ...changed }))
                        if (changed.MapProviderId) {
                            setProviderId(changed.MapProviderId)
                        }
                    }}
                />
            </div>
            {props.children}
            {props.showReadout !== false &&
                <p style={{ fontFamily: 'monospace', fontSize: 12, margin: 0, opacity: 0.8 }}>
                    provider: {outputs.MapProviderId ?? providerId ?? 'default'}
                    {' | '}
                    selected: {selectedIds.join(', ') || 'nothing'}
                    {' | '}
                    {outputs.Viewport ? formatViewport(outputs.Viewport) : 'viewport not reported yet'}
                </p>}
        </div>
    )
}
