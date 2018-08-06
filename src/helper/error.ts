import logger from '../logger';
import { showErrorMessage } from '../host';

export function reportError(err: Error | string) {
  let errorString = err;
  if (err instanceof Error) {
    errorString = err.message;
    logger.error(`${err.stack}`);
  }

  return showErrorMessage(errorString as string);
}
