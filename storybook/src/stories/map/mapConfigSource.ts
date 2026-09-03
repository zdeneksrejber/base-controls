import type { IMapParameters } from '@talxis/base-controls/components/Map'
import { readHookDeclaration } from './sourceExtract'

/** Values long enough to bury the configuration they sit in are lifted out above it. */
const INLINE_LENGTH_LIMIT = 60

/** Turns `PinIcons` into `PIN_ICONS`, so a lifted-out value is named after the property it fills. */
const toConstantName = (propertyName: string) =>
    propertyName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()

const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/** Re-indents a multi-line block so it sits under whatever is holding it. */
const indent = (text: string, spaces: number) =>
    text.split('\n').map((line, index) => (index === 0 ? line : ' '.repeat(spaces) + line)).join('\n')

/**
 * How one configured value is written out: inline where it is short, and lifted into a named constant where
 * it is a JSON rule set or a block of markup that would otherwise bury the rest.
 */
interface IFormattedValue {
    inline: string
    /** Declaration to place above the component, when the value was lifted out. */
    declaration?: string
}

const formatValue = (propertyName: string, raw: unknown): IFormattedValue => {
    if (raw === null || raw === undefined) {
        return { inline: 'null' }
    }
    if (typeof raw === 'boolean' || typeof raw === 'number') {
        return { inline: `${raw}` }
    }
    if (typeof raw !== 'string') {
        return { inline: JSON.stringify(raw) }
    }

    const name = toConstantName(propertyName)
    const trimmed = raw.trim()

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            //a rule set reads as the JSON a maker types, not as one long escaped line
            const pretty = JSON.stringify(JSON.parse(trimmed), null, 4)
            return { inline: name, declaration: `const ${name} = JSON.stringify(${pretty});` }
        } catch {
            //not JSON after all, so it falls through to the plain string below
        }
    }
    if (raw.includes('\n') || raw.length > INLINE_LENGTH_LIMIT) {
        return { inline: name, declaration: `const ${name} = \`${raw.replace(/`/g, '\\`').trim()}\`;` }
    }
    return { inline: quote(raw) }
}

/** A one-line arrow reads better in the JSX than as a constant above it. */
const isOneLiner = (source: string) => !source.includes('\n')

/**
 * The type each hook prop declares.
 *
 * A function's own source comes back from the bundler with its type annotations already stripped, so the
 * signature is put back from the prop it is passed to - which is where it was declared in the first place.
 */
const HOOK_TYPES: { [propName: string]: string } = {
    onResolvePin: 'IMapPinResolver'
}

/**
 * How one code hook is written out: its own source, either inline in the JSX or lifted above it.
 *
 * The source comes from the function itself rather than from a snippet kept beside it, so what a reader
 * copies is what the page is actually running.
 */
const formatHook = (
    propName: string,
    hook: (...args: any[]) => any,
    moduleSource?: string
): IFormattedValue => {
    //what the story wrote, complete with its types and its comment, before anything transpiled it
    const authored = readHookDeclaration(moduleSource, hook.name)
    if (authored) {
        //a one-line hook reads better in the JSX than as a named constant above it
        const oneLine = isOneLiner(authored) && /^const [^=]+= (.+)$/.exec(authored)
        return oneLine
            ? { inline: oneLine[1] }
            : { inline: hook.name, declaration: authored }
    }
    const source = hook.toString()
    if (isOneLiner(source)) {
        return { inline: source }
    }
    const name = hook.name || `${propName.replace(/^on/, '')[0].toLowerCase()}${propName.replace(/^on/, '').slice(1)}`
    const type = HOOK_TYPES[propName] ? `: ${HOOK_TYPES[propName]}` : ''
    return { inline: name, declaration: `const ${name}${type} = ${source};` }
}

/**
 * Imports the emitted snippet needs, added only when it actually refers to the thing.
 *
 * These are the paths a **consumer** installs, which are not the ones the Storybook itself writes: only
 * `/dist` is published, and this repo's own stories reach the sources through a Vite alias. The deep ones
 * are deep on purpose - importing an optional peer's entry point from the barrel would pull it into every
 * build, which is the whole reason it lives behind its own.
 */
const IMPORTS: { needle: RegExp; statement: string }[] = [
    {
        needle: /\bADAPTIVE_MAP_CARD_RENDERERS\b/,
        statement: "import { ADAPTIVE_MAP_CARD_RENDERERS } from '@talxis/base-controls/dist/components/Map/map-card/adaptive-card';"
    },
    {
        needle: /\bIMapPinResolver\b/,
        statement: "import type { IMapPinResolver } from '@talxis/base-controls';"
    },
    {
        needle: /\bIRecord\b/,
        statement: "import type { IRecord } from '@talxis/client-libraries';"
    },
    {
        needle: /\bresolveLocationFromIpAddress\b/,
        statement: "import { resolveLocationFromIpAddress } from '@talxis/base-controls';"
    }
]

const BASE_IMPORTS = [
    "import { Map } from '@talxis/base-controls';",
    "import { googleMapsVendor } from '@talxis/base-controls/dist/components/Map/providers/google-maps';"
]

export interface IMapConfigSourceOptions {
    /**
     * Code hooks the page passes, keyed by prop name. Each is rendered from its own source, so the panel
     * cannot drift from the function it is describing.
     */
    hooks?: { [propName: string]: ((...args: any[]) => any) | undefined }
    /**
     * Raw text of the module those hooks were written in, as imported with Vite's `?raw`. With it a hook is
     * shown as it was authored; without it, as the bundler left it.
     */
    hookSource?: string
    /**
     * Props whose value is a fixed line rather than a function to read - what a wrapper writes verbatim,
     * the same on every page.
     */
    props?: { [propName: string]: string }
}

/**
 * Writes out the configuration a page hands the control, as the TSX a wrapper would contain.
 *
 * Generated from the parameters and the functions the story actually passed rather than kept alongside them,
 * so what a reader inspects cannot drift from what they are looking at.
 *
 * @param parameters Manifest properties the page set, `Dataset` excluded - it is the bound records.
 * @param options Code hooks to render alongside them.
 * @returns TSX with its imports, ready to render read only.
 */
export const getMapConfigSource = (
    parameters: Partial<IMapParameters>,
    options: IMapConfigSourceOptions = {}
): string => {
    const declarations: string[] = []
    const lines: string[] = []

    Object.entries(parameters).forEach(([propertyName, property]) => {
        if (propertyName === 'Dataset' || !property) {
            return
        }
        const raw = (property as { raw?: unknown }).raw
        //an unset property is the default, and listing every default is noise rather than configuration
        if (raw === '' || raw === undefined || raw === null) {
            return
        }
        const { inline, declaration } = formatValue(propertyName, raw)
        if (declaration) {
            declarations.push(declaration)
        }
        lines.push(`        ${propertyName}: { raw: ${indent(inline, 8)} },`)
    })

    const hookLines: string[] = []
    Object.entries(options.hooks ?? {}).forEach(([propName, hook]) => {
        if (!hook) {
            return
        }
        const { inline, declaration } = formatHook(propName, hook, options.hookSource)
        if (declaration) {
            declarations.push(declaration)
        }
        hookLines.push(`    ${propName}={${inline}}`)
    })

    Object.entries(options.props ?? {}).forEach(([propName, value]) =>
        hookLines.push(`    ${propName}={${value}}`))

    const body = [
        ...(declarations.length ? [declarations.join('\n\n'), ''] : []),
        '<Map',
        '    context={context}',
        '    parameters={{',
        '        Dataset: dataset,',
        ...lines,
        '    }}',
        ...hookLines,
        '/>'
    ].join('\n')

    const imports = [
        ...BASE_IMPORTS,
        ...IMPORTS.filter(({ needle }) => needle.test(body)).map(({ statement }) => statement)
    ]

    return `${imports.join('\n')}\n\n${body}`
}
