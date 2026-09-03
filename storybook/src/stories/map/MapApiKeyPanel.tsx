import { useState } from 'react'
import { DefaultButton, Link, MessageBar, MessageBarType, PrimaryButton, Stack, Text, TextField } from '@fluentui/react'
import {
    clearMapApiKeys,
    getMapApiKeys,
    IMapApiKeys,
    IMapApiKeyVendor,
    isReaderProvidedKey,
    MAP_API_KEY_VENDORS,
    setMapApiKeys,
    useMapApiKeys
} from './mapApiKeys'

/**
 * Lets a reader hand the demo their own api keys.
 *
 * The published Storybook is built without keys on purpose - one committed into a public bundle is a key
 * somebody else pays for - so this is how anyone but the author gets past the keyless OpenStreetMap provider.
 * Keys are kept in this browser's local storage and never sent anywhere but the map vendor itself.
 *
 * @param props Called once the reader is done, so the caller can close the panel.
 * @returns One field per vendor, with save and clear.
 */
const describeKey = (vendor: IMapApiKeyVendor, key: string) => {
    if (!key) {
        return 'not configured'
    }
    return isReaderProvidedKey(vendor) ? 'saved in this browser' : 'from this build'
}

export const MapApiKeyPanel = (props: { onDismiss?: () => void }) => {
    const keys = useMapApiKeys()
    const [draft, setDraft] = useState<IMapApiKeys>(keys)
    const [saved, setSaved] = useState(false)

    const onSave = () => {
        setMapApiKeys(draft)
        setSaved(true)
    }

    const onClear = () => {
        clearMapApiKeys()
        //back to whatever the build itself carries, which on a published one is nothing
        setDraft(getMapApiKeys())
        setSaved(true)
    }

    return (
        <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: 16, maxWidth: 640 } }}>
            <Text variant='mediumPlus' styles={{ root: { fontWeight: 600 } }}>Map provider api keys</Text>
            <Text variant='small'>
                Every story falls back to OpenStreetMap, which needs no key. Paste your own below to see the
                other three vendors, their geo-coding and their routing. Keys stay in this browser and are
                sent only to the vendor they belong to.
            </Text>
            {MAP_API_KEY_VENDORS.map((vendor) => (
                <TextField
                    key={vendor.id}
                    label={vendor.label}
                    description={describeKey(vendor.id, keys[vendor.id])}
                    type='password'
                    canRevealPassword
                    revealPasswordAriaLabel={`Show the ${vendor.label} key`}
                    value={draft[vendor.id]}
                    placeholder={`Paste a ${vendor.label} key`}
                    onChange={(_event, value) => {
                        setSaved(false)
                        setDraft((current) => ({ ...current, [vendor.id]: value ?? '' }))
                    }}
                    onRenderSuffix={() => (
                        <Link href={vendor.signupUrl} target='_blank' rel='noopener noreferrer'>Get one</Link>
                    )}
                />
            ))}
            {saved &&
                <MessageBar messageBarType={MessageBarType.success} isMultiline={false}>
                    Saved. Every map on the page has been redrawn with them.
                </MessageBar>}
            <Stack horizontal tokens={{ childrenGap: 8 }}>
                <PrimaryButton text='Save keys' onClick={onSave} />
                <DefaultButton text='Clear' onClick={onClear} />
                {props.onDismiss && <DefaultButton text='Close' onClick={props.onDismiss} />}
            </Stack>
        </Stack>
    )
}
