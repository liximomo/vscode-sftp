import * as output from './modules/output';
import { getConfig } from './host';

const config = getConfig();
const printDebugLog = config.printDebugLog;

export interface Logger {
  trace(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string | Error, ...args: any[]): void;
  critical(message: string | Error, ...args: any[]): void;
}

class VSCodeLogger implements Logger {
  trace(message: string, ...args: any[]) {
    if (printDebugLog) {
      output.print('[trace]', message, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (printDebugLog) {
      output.print('[info]', message, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    output.print('[info]', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    output.print('[warn]', message, ...args);
  }

  error(message: string | Error, ...args: any[]) {
    output.print('[error]', message, ...args);
  }

  critical(message: string | Error, ...args: any[]) {
    output.print('[critical]', message, ...args);
  }
}

const logger = new VSCodeLogger();

export default logger;
