import logger from '../logger';
import { showErrorMessage } from '../host';

export function reportError(err: Error | string, ...args: any[]) {
  let errorString = err;
  if (err instanceof Error) {
    errorString = err.message;
    logger.error(`${err.stack}`, ...args);
  } else {
    logger.error(errorString, ...args);
  }

  return showErrorMessage(errorString as string, ...args);
}
