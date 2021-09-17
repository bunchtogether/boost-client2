import { SubscribeError } from '@bunchtogether/braid-client';
import { braidClient } from '../../index';
export function logSubscribeError(name, error) {
  const errorStack = process.env.NODE_ENV !== 'production' ? new Error().stack : undefined;

  if (process.env.NODE_ENV !== 'production') {
    if (error instanceof SubscribeError) {
      const originalStack = error.stack;

      if (typeof errorStack === 'string') {
        if (typeof originalStack === 'string') {
          error.stack = [originalStack.split('\n')[0], ...errorStack.split('\n').slice(1)].join('\n'); // eslint-disable-line no-param-reassign
        } else {
          error.stack = [`SubscribeError: Error for ${name || 'unknown name'}`, ...errorStack.split('\n').slice(1)].join('\n'); // eslint-disable-line no-param-reassign
        }

        braidClient.logger.errorStack(error);
      }
    }
  }
}
//# sourceMappingURL=error-logging.js.map