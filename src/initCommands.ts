import * as path from 'path';
import { ExtensionContext } from 'vscode';
import * as fg from 'fast-glob';
import logger from './logger';
import { registerCommand } from './host';
import Command from './commands/abstract/command';
import { createCommand, createFileCommand } from './commands/abstract/createCommand';

const COMMAND_FILENAME_PATTERN = `${__dirname}/commands/@(command|fileCommand)*.js`;

export default function init(context: ExtensionContext) {
  return loadCommands(COMMAND_FILENAME_PATTERN, /[Cc]ommand([^.]+)\.js$/, context);
}

function nomalizeCommandName(rawName) {
  const firstLetter = rawName[0].toUpperCase();
  return firstLetter + rawName.slice(1).replace(/[A-Z]/g, token => ` ${token[0]}`);
}

async function loadCommands(pattern, nameRegex, context: ExtensionContext) {
  const entries = await fg<string>(pattern, {
    deep: false,
    onlyFiles: true,
    transform: entry => (typeof entry === 'string' ? entry : entry.path),
  });
  entries.forEach(file => {
    const basename = path.basename(file);
    const match = nameRegex.exec(basename);
    if (!match || !match[1]) {
      logger.warn(`Command name not found from ${file}`);
      return;
    }

    const commandOption = require(file).default;
    commandOption.name = nomalizeCommandName(match[1]);

    try {
      // tslint:disable-next-line variable-name
      let Cmd;
      if (basename.startsWith('command')) {
        Cmd = createCommand(commandOption);
      } else {
        Cmd = createFileCommand(commandOption);
      }
      const cmdInstance: Command = new Cmd();
      registerCommand(context, commandOption.id, cmdInstance.run, cmdInstance);
    } catch (error) {
      logger.error(error, `load command "${file}"`);
    }
  });
}
