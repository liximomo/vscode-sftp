import { Uri } from 'vscode';
import logger from '../../logger';
import { reportError } from '../../helper';
import { handleCtxFromUri, FileHandlerContext } from '../../fileHandlers';
import Command from './command';

interface BaseCommandOption {
  id: string;
  name?: string;
}

interface CommandOption extends BaseCommandOption {
  handleCommand: (this: Command, ...args: any[]) => unknown | Promise<unknown>;
}

interface FileCommandOption extends BaseCommandOption {
  handleFile: (ctx: FileHandlerContext) => Promise<unknown>;
  getFileTarget: (...args: any[]) => Uri | Uri[] | Promise<Uri | Uri[]>;
}

function checkType<T>() {
  return (a: T) => a;
}

export const checkCommand = checkType<CommandOption>();
export const checkFileCommand = checkType<FileCommandOption>();

export function createCommand(commandOption: CommandOption) {
  return class NormalCommand extends Command {
    constructor() {
      super();
      this.id = commandOption.id;
      this.name = commandOption.name;
    }

    doCommandRun(...args) {
      commandOption.handleCommand.apply(this, args);
    }
  };
}

export function createFileCommand(commandOption: FileCommandOption) {
  return class FileCommand extends Command {
    constructor() {
      super();
      this.id = commandOption.id;
      this.name = commandOption.name;
    }

    protected async doCommandRun(...args) {
      const target = await commandOption.getFileTarget(...args);
      if (!target) {
        logger.warn(`The "${this.name}" command get canceled without because of missing targets.`);
        return;
      }

      const targetList: Uri[] = Array.isArray(target) ? target : [target];
      const pendingTasks = targetList.map(async uri => {
        try {
          await commandOption.handleFile(handleCtxFromUri(uri));
        } catch (error) {
          reportError(error);
        }
      });

      await Promise.all(pendingTasks);
    }
  };
}
