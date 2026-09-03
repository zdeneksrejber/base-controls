import { IEventEmitter } from "@talxis/client-libraries";
import { useCallback, useEffect, useRef } from "react";

export const useEventEmitter = <T extends { [K in keyof T]: (...args: any[]) => any }>(emitter: IEventEmitter<T> | null | undefined, event: keyof T | (keyof T)[], callback: T[keyof T]) => {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    const memoizedCallback = useCallback((...args) => {
        callbackRef.current(...args);
    }, []);

    const events = Array.isArray(event) ? event : [event];
    //callers pass inline array literals, so the effect keys off the names rather than the array identity
    const eventKey = events.join('|');

    useEffect(() => {
        if (!emitter) return;
        events.forEach(event => emitter.addEventListener(event, memoizedCallback as T[keyof T]));
        return () => {
            events.forEach(event => emitter.removeEventListener(event, memoizedCallback as T[keyof T]));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [emitter, eventKey, memoizedCallback]);
};
