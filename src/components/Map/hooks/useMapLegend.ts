import { useEffect, useMemo, useState } from 'react';
import { sanitizeMapHtml } from '../internal/sanitizeHtml';
import { getMapWebResourceText } from '../internal/webResource';

export interface IUseMapLegend {
    /** Markup typed straight into the manifest. */
    html?: string;
    /** Web resource holding the markup instead. Takes precedence once it resolves. */
    webResourceName?: string;
}

/**
 * Resolves the legend's markup and cleans it.
 *
 * A web resource wins over the inline property once it loads. Cleaning happens here rather than in the
 * component, so nothing downstream ever holds markup that has not been through it.
 */
export const useMapLegend = (props: IUseMapLegend): string => {
    const { html, webResourceName } = props;
    const [resolved, setResolved] = useState('');

    useEffect(() => {
        if (!webResourceName) {
            setResolved('');
            return;
        }
        const controller = new AbortController();
        getMapWebResourceText(webResourceName, controller.signal)
            .then((text) => {
                if (!controller.signal.aborted) {
                    setResolved(sanitizeMapHtml(text));
                }
            });

        return () => {
            controller.abort();
        };
    }, [webResourceName]);

    //memoized so DOMPurify does not re-parse the markup on every render
    const inlineHtml = useMemo(() => sanitizeMapHtml(html), [html]);
    return resolved || inlineHtml;
};
