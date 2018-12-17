import * as output from './ui/output';
import { getExtensionSetting } from './modules/ext';

const extSetting = getExtensionSetting();
const debug = extSetting.debug || extSetting.printDebugLog;

export interface Logger {
  trace(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string | Error, ...args: any[]): void;
  critical(message: string | Error, ...args: any[]): void;
}

class VSCodeLogger implements Logger {
  log(message: string, ...args: any[]) {
    output.print(message, ...args);
  }

  trace(message: string, ...args: any[]) {
    if (debug) {
      output.print('[trace]', message, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (debug) {
      output.print('[debug]', message, ...args);
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
