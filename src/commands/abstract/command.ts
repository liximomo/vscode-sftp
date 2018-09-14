import { reportError } from '../../helper';
import logger from '../../logger';

export interface ITarget {
  fsPath: string;
}

export interface CommandOption {
  [x: string]: any;
}

export default abstract class Command {
  id: string;
  name: string;
  private _commandDoneListeners: Array<(...args: any[]) => void>;

  constructor() {
    this._commandDoneListeners = [];
  }

  onCommandDone(listener) {
    this._commandDoneListeners.push(listener);

    return () => {
      const index = this._commandDoneListeners.indexOf(listener);
      if (index > -1) this._commandDoneListeners.splice(index, 1);
    };
  }

  protected abstract async doCommandRun(...args: any[]);

  async run(...args) {
    logger.trace(`run command '${this.name}'`);
    try {
      await this.doCommandRun(...args);
    } catch (error) {
      reportError(error);
    } finally {
      this.commitCommandDone(...args);
    }
  }

  private commitCommandDone(...args: any[]) {
    this._commandDoneListeners.forEach(listener => listener(...args));
  }
}
