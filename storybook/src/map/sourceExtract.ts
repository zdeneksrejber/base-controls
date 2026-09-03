/** Characters that open a nesting level, mapped to the one that closes it. */
const BRACKETS: { [open: string]: string } = { '{': '}', '[': ']', '(': ')' }

/**
 * Walks past a quoted string or template literal, so brackets and comment markers inside one are ignored.
 *
 * @param source Text being scanned.
 * @param start Index of the opening quote.
 * @returns Index just past the closing quote.
 */
const skipString = (source: string, start: number): number => {
    const quote = source[start]
    let index = start + 1
    while (index < source.length) {
        const character = source[index]
        if (character === '\\') {
            index += 2
            continue
        }
        if (quote === '`' && character === '$' && source[index + 1] === '{') {
            //a template hole holds real code, brackets and all, so it is walked rather than skipped
            let depth = 1
            index += 2
            while (index < source.length && depth > 0) {
                const inner = source[index]
                if (inner === '{') { depth++ }
                else if (inner === '}') { depth-- }
                else if (inner === '"' || inner === "'" || inner === '`') { index = skipString(source, index) - 1 }
                index++
            }
            continue
        }
        if (character === quote) {
            return index + 1
        }
        index++
    }
    return index
}

/** Walks past a line or block comment. */
const skipComment = (source: string, start: number): number => {
    if (source[start + 1] === '/') {
        const end = source.indexOf('\n', start)
        return end === -1 ? source.length : end
    }
    const end = source.indexOf('*/', start)
    return end === -1 ? source.length : end + 2
}

/**
 * The doc comment sitting immediately above a declaration, which is usually the best thing written about it.
 *
 * @param source Text being scanned.
 * @param declarationStart Index the declaration begins at.
 * @returns The comment including its trailing newline, or an empty string.
 */
const readLeadingComment = (source: string, declarationStart: number): string => {
    const before = source.slice(0, declarationStart)
    const block = before.match(/(\/\*\*[\s\S]*?\*\/\s*)$/)
    if (block) {
        return block[1].trimEnd() + '\n'
    }
    const lines = before.split('\n')
    const comments: string[] = []
    for (let index = lines.length - 2; index >= 0; index--) {
        if (!lines[index].trimStart().startsWith('//')) {
            break
        }
        comments.unshift(lines[index])
    }
    return comments.length ? comments.join('\n') + '\n' : ''
}

/**
 * Lifts one top-level `const` declaration out of a module's own source text.
 *
 * The Code panel shows a demo hook as it was written - with its types and its comment - which neither
 * `Function.prototype.toString()` nor a snippet copied alongside it can manage: the first comes back from the
 * bundler already transpiled and minified, and the second drifts the moment somebody edits one and not the
 * other.
 *
 * @param source The module's raw text, as imported with Vite's `?raw`.
 * @param name Name of the declaration to lift out.
 * @returns The declaration with any doc comment above it, or `undefined` when there is no such declaration.
 */
export const extractDeclaration = (source: string, name: string): string | undefined => {
    const declaration = new RegExp(`^(?:export )?const ${name}\\b`, 'm').exec(source)
    if (!declaration) {
        return undefined
    }

    const start = declaration.index
    let index = start
    let depth = 0

    while (index < source.length) {
        const character = source[index]
        if (character === '"' || character === "'" || character === '`') {
            index = skipString(source, index)
            continue
        }
        if (character === '/' && (source[index + 1] === '/' || source[index + 1] === '*')) {
            index = skipComment(source, index)
            continue
        }
        if (BRACKETS[character]) {
            depth++
        } else if (character === '}' || character === ']' || character === ')') {
            depth--
        } else if (depth === 0 && (character === ';' || character === '\n')) {
            //a bracketed initializer ends with its closing bracket, a plain one at the end of its line
            return source.slice(start, index).trimEnd()
        }
        index++
    }
    return source.slice(start).trimEnd()
}

/**
 * The declaration a hook was written as, ready to place above the component that uses it.
 *
 * @param source The defining module's raw text, if the caller has it.
 * @param name Name of the declaration, which survives minification because esbuild keeps function names.
 * @returns The authored source, or `undefined` to fall back to the function itself.
 */
export const readHookDeclaration = (source: string | undefined, name: string): string | undefined => {
    if (!source || !name) {
        return undefined
    }
    const declaration = extractDeclaration(source, name)
    if (!declaration) {
        return undefined
    }
    const start = source.indexOf(declaration)
    return `${readLeadingComment(source, start)}${declaration}`
}
