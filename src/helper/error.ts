import * as vscode from 'vscode';
import logger from '../logger';

export function reportError(err: Error | string) {
  let errorString = err;
  if (err instanceof Error) {
    errorString = err.message;
    logger.error(`${err.stack}`);
  }

  return vscode.window.showErrorMessage(errorString as string);
}
