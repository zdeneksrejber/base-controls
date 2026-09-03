import type { IMapParameters } from '@talxis/base-controls/components/Map'

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

export interface IMapConfigSourceOptions {
    /** Code hooks the page passes, named as the story passes them. */
    props?: { [propName: string]: string }
}

/**
 * Writes out the configuration a page hands the control, as the TSX a wrapper would contain.
 *
 * This is generated from the parameters the story actually passed rather than kept alongside them, so what a
 * reader inspects cannot drift from what they are looking at.
 *
 * @param parameters Manifest properties the page set, `Dataset` excluded - it is the bound records.
 * @param options Code hooks to show alongside them.
 * @returns TSX, ready to render read only.
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

    const hooks = Object.entries(options.props ?? {})
        .map(([propName, value]) => `    ${propName}={${value}}`)

    return [
        ...(declarations.length ? [declarations.join('\n\n'), ''] : []),
        '<Map',
        '    context={context}',
        '    parameters={{',
        '        Dataset: dataset,',
        ...lines,
        '    }}',
        ...hooks,
        '/>'
    ].join('\n')
}
