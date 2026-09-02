/** Query parameters a url is built with. Anything unset is left out rather than sent empty. */
export interface IUrlParameters {
    [name: string]: string | number | boolean | undefined | null;
}

export interface IJsonRequest {
    signal?: AbortSignal;
    headers?: { [name: string]: string };
    /** Sent as a JSON body, which also makes the request a POST. Omit for a GET. */
    body?: unknown;
}

/**
 * Builds a url, dropping the parameters that have no value.
 *
 * @param base Url without a query string.
 * @param parameters Query parameters. `undefined`, `null` and empty strings are left out.
 * @returns The url, with a query string when any parameter had a value.
 */
export const buildUrl = (base: string, parameters: IUrlParameters = {}): string => {
    const query = new URLSearchParams();
    Object.entries(parameters).forEach(([name, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }
        query.append(name, `${value}`);
    });
    const search = query.toString();
    return search ? `${base}?${search}` : base;
};

/**
 * Fetches JSON, turning a response the service rejected into an error rather than a parse failure.
 *
 * @param url Url to call.
 * @param request Abort signal, extra headers, and a body that makes the call a POST.
 * @returns The parsed response body.
 * @throws When the request is aborted, the network fails, or the service answers outside 2xx.
 */
export const getJson = async <T>(url: string, request: IJsonRequest = {}): Promise<T> => {
    const response = await fetch(url, {
        method: request.body === undefined ? 'GET' : 'POST',
        signal: request.signal,
        headers: {
            Accept: 'application/json',
            ...(request.body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...request.headers
        },
        body: request.body === undefined ? undefined : JSON.stringify(request.body)
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`${response.status} ${response.statusText}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
    }
    return response.json() as Promise<T>;
};

/** Runs work one call at a time, no faster than the interval it was built with. */
export type IRequestQueue = <T>(run: () => Promise<T>) => Promise<T>;

/**
 * Builds a queue that serializes calls and keeps a minimum gap between them.
 *
 * Public geocoding services publish a rate limit, and exceeding it gets an origin blocked rather than
 * throttled - so the limit belongs in the client.
 *
 * @param minimumIntervalMs Smallest gap between the start of one call and the next.
 * @returns A function that queues work and resolves with its result.
 */
export const createRequestQueue = (minimumIntervalMs: number): IRequestQueue => {
    let tail: Promise<unknown> = Promise.resolve();
    let previousStart = 0;

    return <T>(run: () => Promise<T>): Promise<T> => {
        const result = tail.then(async () => {
            const wait = previousStart + minimumIntervalMs - Date.now();
            if (wait > 0) {
                await new Promise((resolve) => setTimeout(resolve, wait));
            }
            previousStart = Date.now();
            return run();
        });
        //the queue must keep going after a rejection, so what it chains on never carries one
        tail = result.catch(() => undefined);
        return result;
    };
};

export interface IResultCache<T> {
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    delete(key: string): void;
    readonly size: number;
}

/**
 * Builds a bounded cache that discards whatever was used longest ago.
 *
 * @param maxEntries Entries to keep before evicting.
 * @returns The cache.
 */
export const createResultCache = <T>(maxEntries = 200): IResultCache<T> => {
    //a Map iterates in insertion order, so re-inserting on read is what makes eviction least-recently-used
    const entries = new Map<string, T>();

    return {
        get: (key) => {
            if (!entries.has(key)) {
                return undefined;
            }
            const value = entries.get(key) as T;
            entries.delete(key);
            entries.set(key, value);
            return value;
        },
        set: (key, value) => {
            entries.delete(key);
            entries.set(key, value);
            while (entries.size > maxEntries) {
                entries.delete(entries.keys().next().value as string);
            }
        },
        delete: (key) => {
            entries.delete(key);
        },
        get size() {
            return entries.size;
        }
    };
};

export interface IConcurrentRunOptions<TItem, TResult> {
    /** Items in flight at once. */
    limit: number;
    /** Called with each result as it arrives, so a caller can show progress rather than wait for all of it. */
    onResult?: (item: TItem, result: TResult) => void;
    /** Checked before each item is started; a cancelled run resolves with what it already had. */
    isCancelled?: () => boolean;
}

/**
 * Runs work over a list with a bounded number of calls in flight.
 *
 * A view can name hundreds of addresses to resolve, and firing them all at once is what gets an origin rate
 * limited - so the work is spread rather than batched.
 *
 * @param items Items to work through, in order.
 * @param run Does the work for one item. A rejection resolves to `undefined` rather than stopping the run.
 * @param options Concurrency, progress callback and cancellation check.
 * @returns Each item paired with its result, in the order the items were given.
 */
export const runWithConcurrency = async <TItem, TResult>(
    items: TItem[],
    run: (item: TItem) => Promise<TResult>,
    options: IConcurrentRunOptions<TItem, TResult>
): Promise<{ item: TItem; result: TResult | undefined }[]> => {
    const results: { item: TItem; result: TResult | undefined }[] = items.map((item) => ({ item, result: undefined }));
    let next = 0;

    const worker = async (): Promise<void> => {
        while (next < items.length) {
            if (options.isCancelled?.()) {
                return;
            }
            const index = next++;
            const item = items[index];
            try {
                const result = await run(item);
                results[index] = { item, result };
                options.onResult?.(item, result);
            } catch (error) {
                //one address the service cannot resolve must not stop the rest of them
                results[index] = { item, result: undefined };
            }
        }
    };

    await Promise.all(Array.from({ length: Math.max(1, Math.min(options.limit, items.length)) }, worker));
    return results;
};
