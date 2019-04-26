import * as output from './ui/output';
import { getExtensionSetting } from './modules/ext';

const extSetting = getExtensionSetting();
const debug = extSetting.debug || extSetting.printDebugLog;

const paddingTime = time => ('00' + time).slice(-2);

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
    const now = new Date();
    const month = paddingTime(now.getMonth() + 1);
    const date = paddingTime(now.getDate());
    const h = paddingTime(now.getHours());
    const m = paddingTime(now.getMinutes());
    const s = paddingTime(now.getSeconds());
    output.print(`[${month}-${date} ${h}:${m}:${s}]`, message, ...args);
  }

  trace(message: string, ...args: any[]) {
    if (debug) {
      this.log('[trace]', message, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (debug) {
      this.log('[debug]', message, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    this.log('[info]', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('[warn]', message, ...args);
  }

  error(message: string | Error, ...args: any[]) {
    this.log('[error]', message, ...args);
  }

  critical(message: string | Error, ...args: any[]) {
    this.log('[critical]', message, ...args);
  }
}

const logger = new VSCodeLogger();

export default logger;
