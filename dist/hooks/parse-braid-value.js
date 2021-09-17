import { useState, useEffect, useRef, useMemo } from 'react';
import { SubscribeError } from '@bunchtogether/braid-client';
import { braidClient, cachedValue, cachedSubscribe, cachedUnsubscribe } from '../index';
export default function useParseBraidValue(name, parse) {
  const [value, setValue] = useState(typeof name === 'string' ? cachedValue(name) : undefined);
  const initialCallbackRef = useRef(typeof value !== 'undefined' || typeof name !== 'string');
  const errorStack = process.env.NODE_ENV !== 'production' ? useMemo(() => new Error().stack, []) : undefined;
  useEffect(() => {
    const skipInitialCallback = initialCallbackRef.current;
    initialCallbackRef.current = false;

    if (typeof name !== 'string') {
      if (!skipInitialCallback) {
        setValue(undefined);
      }

      return;
    }

    const handleError = process.env.NODE_ENV !== 'production' ? error => {
      if (!(error instanceof SubscribeError)) {
        return;
      }

      const originalStack = error.stack;

      if (typeof errorStack === 'string') {
        if (typeof originalStack === 'string') {
          error.stack = [originalStack.split('\n')[0], ...errorStack.split('\n').slice(1)].join('\n'); // eslint-disable-line no-param-reassign
        } else {
          error.stack = [`SubscribeError: Error for ${name}`, ...errorStack.split('\n').slice(1)].join('\n'); // eslint-disable-line no-param-reassign
        }
      }

      braidClient.logger.errorStack(error);
    } : undefined;
    cachedSubscribe(name, setValue, handleError, skipInitialCallback);
    return () => {
      // eslint-disable-line consistent-return
      cachedUnsubscribe(name, setValue, handleError);
    };
  }, [name]);
  return useMemo(() => parse(value), [parse, value]);
}
//# sourceMappingURL=parse-braid-value.js.map