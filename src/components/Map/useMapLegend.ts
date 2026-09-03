import { useEffect, useState } from 'react';
import { sanitizeMapHtml } from './sanitizeHtml';
import { getMapWebResourceText } from './webResource';

export interface IUseMapLegend {
    /** Markup typed straight into the manifest. */
    html?: string;
    /** Web resource holding the markup instead. Takes precedence once it resolves. */
    webResourceName?: string;
}

/**
 * Resolves the legend's markup and cleans it.
 *
 * A web resource wins over the inline property once it loads, so a maker can start with something typed in
 * and move it into a web resource without changing anything else. Cleaning happens here rather than in the
 * component, so nothing downstream ever holds markup that has not been through it.
 *
 * @param props Inline markup and the web resource to prefer.
 * @returns Markup safe to insert, empty while there is nothing to show.
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

    return resolved || sanitizeMapHtml(html);
};
