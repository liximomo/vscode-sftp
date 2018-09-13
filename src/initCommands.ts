import * as path from 'path';
import { ExtensionContext } from 'vscode';
import * as fg from 'fast-glob';
import logger from './logger';
import { registerCommand } from './host';
import Command from './commands/abstract/command';

const COMMAND_FILENAME_PATTERN = `${__dirname}/commands/@(command|fileCommand)*.js`;

interface CommandConstructor {
  new (name: string): Command;
  id: string;
}

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
    absolute: false,
  });
  entries.forEach(file => {
    const match = nameRegex.exec(path.basename(file));
    if (!match || !match[1]) {
      logger.warn(`Command name not found from ${file}`);
      return;
    }

    const commandName = match[1];
    const commandClz: CommandConstructor = require(file).default;

    try {
      const cmd = new commandClz(nomalizeCommandName(commandName));
      registerCommand(context, commandClz.id, cmd.run, cmd);
    } catch (error) {
      logger.error(error, `load command "${file}"`);
    }
  });
}
