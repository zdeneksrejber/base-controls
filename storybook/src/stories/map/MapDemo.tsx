import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Callout, DirectionalHint, Icon, Toggle, getTheme, mergeStyleSets } from '@fluentui/react'
import Editor from '@monaco-editor/react'
import type { IDataProviderEventListeners, IDataset } from '@talxis/client-libraries'
import { IMap, IMapOutputs, IMapParameters, IMapViewport, Map, resolveLocationFromIpAddress } from '@talxis/base-controls/components/Map'
import { googleMapsVendor } from '@talxis/base-controls/components/Map/providers/google-maps'
import { useEventEmitter } from '@talxis/base-controls/hooks'
import { usePcfContext } from '@talxis/base-controls/utils'
import { baseEditorOptions } from '../../form/shared/monacoEditor'
import { MapApiKeyPanel } from './MapApiKeyPanel'
import { MAP_API_KEY_VENDORS, useMapApiKeys } from './mapApiKeys'
import { getMapConfigSource } from './mapConfigSource'

const theme = getTheme()

const styles = mergeStyleSets({
    root: {
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        paddingBottom: 8,
        borderBottom: `1px solid ${theme.palette.neutralLighter}`
    },
    keysButton: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        padding: '4px 6px',
        borderRadius: theme.effects.roundedCorner4,
        color: theme.palette.neutralPrimary,
        fontSize: theme.fonts.small.fontSize,
        fontFamily: 'inherit',
        selectors: {
            ':hover': { background: theme.palette.neutralLighter },
            ':focus-visible': { outline: `2px solid ${theme.palette.themePrimary}` }
        }
    },
    code: {
        border: `1px solid ${theme.palette.neutralLight}`,
        borderRadius: 8,
        overflow: 'hidden'
    },
    readout: {
        fontFamily: 'monospace',
        fontSize: 12,
        margin: 0,
        opacity: 0.8
    }
})

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
    /**
     * Raw text of the story module, as `import source from './Whatever.stories.tsx?raw'`. The Code panel
     * uses it to show a hook the way it was written rather than the way the bundler left it.
     */
    hookSource?: string
}

const formatViewport = (viewport: IMapViewport) =>
    `${viewport.center.latitude.toFixed(3)}, ${viewport.center.longitude.toFixed(3)} @ zoom ${viewport.zoom}`

/** How many vendors currently have a key, for the label on the button that opens the panel. */
const useConfiguredKeyCount = () => {
    const keys = useMapApiKeys()
    return MAP_API_KEY_VENDORS.filter((vendor) => !!keys[vendor.id]).length
}

/**
 * Hosts the Map control the way a PCF wrapper would: manifest properties in, outputs out, api keys resolved
 * from whatever the reader or the build supplied, and Google Maps registered as a vendor.
 *
 * @param props Dataset, the manifest properties under demonstration, and the box to draw in.
 * @returns The control, a Code toggle showing the configuration behind it, and a readout of what it reported.
 */
export const MapDemo = (props: IMapDemoProps) => {
    const context = usePcfContext()
    const apiKeys = useMapApiKeys()
    const configuredKeyCount = useConfiguredKeyCount()
    const [outputs, setOutputs] = useState<IMapOutputs>({})
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [showCode, setShowCode] = useState(false)
    const [showKeys, setShowKeys] = useState(false)
    const [providerId, setProviderId] = useState<string | undefined>(props.parameters?.DefaultVendor?.raw ?? undefined)
    //the one vendor a wrapper must name in code: importing it is what pulls in the optional Google Maps peer
    const onGetMapVendors = useMemo(() => () => [googleMapsVendor], [])

    useEventEmitter<IDataProviderEventListeners>(props.dataset, 'onRecordsSelected', (ids: string[]) => setSelectedIds(ids ?? []))
    useEffect(() => setSelectedIds(props.dataset.getSelectedRecordIds()), [props.dataset])

    //the ip lookup is a third party call, so only a story that asked to be centred on the user gets one
    const wantsUserLocation = props.parameters?.PrefillUserLocation?.raw === true

    const source = useMemo(() => getMapConfigSource(props.parameters ?? {}, {
        hooks: {
            onResolvePin: props.onResolvePin,
            onGetCardRenderers: props.onGetCardRenderers
        },
        hookSource: props.hookSource,
        //fixed lines rather than functions to read: defined here rather than in a story, and the same on
        //every page that passes them
        props: {
            ...(wantsUserLocation ? { onResolveFallbackLocation: 'resolveLocationFromIpAddress' } : {}),
            onGetMapVendors: '() => [googleMapsVendor]'
        }
    }), [props.parameters, props.onResolvePin, props.onGetCardRenderers, props.hookSource, wantsUserLocation])

    const height = props.height ?? 520

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <button
                    id='map-demo-keys'
                    type='button'
                    className={styles.keysButton}
                    aria-expanded={showKeys}
                    onClick={() => setShowKeys((current) => !current)}>
                    <Icon iconName={configuredKeyCount ? 'Permissions' : 'Warning'} />
                    <span>{configuredKeyCount
                        ? `Api keys · ${configuredKeyCount} of ${MAP_API_KEY_VENDORS.length}`
                        : 'Add api keys to see every vendor'}</span>
                </button>
                <Toggle
                    label='Code'
                    inlineLabel
                    checked={showCode}
                    styles={{ root: { marginBottom: 0 } }}
                    onChange={(_event, checked) => setShowCode(!!checked)} />
            </div>
            {showKeys &&
                <Callout
                    target='#map-demo-keys'
                    directionalHint={DirectionalHint.bottomLeftEdge}
                    onDismiss={() => setShowKeys(false)}
                    setInitialFocus>
                    <MapApiKeyPanel onDismiss={() => setShowKeys(false)} />
                </Callout>}
            <div style={{ height, display: 'flex', flexDirection: 'column' }}>
                {showCode
                    ? <div className={styles.code} style={{ height }}>
                        <Editor
                            height='100%'
                            defaultLanguage='typescript'
                            language='typescript'
                            value={source}
                            options={{ ...baseEditorOptions, domReadOnly: true, readOnly: true, padding: { top: 12, bottom: 12 } }}
                            theme='vs-light' />
                    </div>
                    : <Map
                        context={context}
                        parameters={{
                            Dataset: props.dataset,
                            HereApiKey: { raw: apiKeys.here },
                            MapyApiKey: { raw: apiKeys.mapy },
                            GoogleApiKey: { raw: apiKeys.google },
                            MapProviderId: { raw: providerId ?? null },
                            ...props.parameters
                        } as IMapParameters}
                        onGetMapVendors={onGetMapVendors}
                        onResolvePin={props.onResolvePin}
                        onGetCardRenderers={props.onGetCardRenderers}
                        onResolveFallbackLocation={wantsUserLocation ? resolveLocationFromIpAddress : undefined}
                        onNotifyOutputChanged={(changed: IMapOutputs) => {
                            setOutputs((current) => ({ ...current, ...changed }))
                            if (changed.MapProviderId) {
                                setProviderId(changed.MapProviderId)
                            }
                        }}
                    />}
            </div>
            {props.children}
            {props.showReadout !== false &&
                <p className={styles.readout}>
                    provider: {outputs.MapProviderId ?? providerId ?? 'default'}
                    {' | '}
                    selected: {selectedIds.join(', ') || 'nothing'}
                    {' | '}
                    {outputs.Viewport ? formatViewport(outputs.Viewport) : 'viewport not reported yet'}
                </p>}
        </div>
    )
}
