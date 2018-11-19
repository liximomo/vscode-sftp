import { ExtensionContext } from 'vscode';
import logger from './logger';
import { registerCommand } from './host';
import Command from './commands/abstract/command';
import { createCommand, createFileCommand } from './commands/abstract/createCommand';

export default function init(context: ExtensionContext) {
  loadCommands(
    require.context(
      // Look for files in the commands directory
      './commands',
      // Do not look in subdirectories
      false,
      // Only include "_base-" prefixed .vue files
      /command.*.ts$/
    ),
    /command(.*)/,
    createCommand,
    context
  );
  loadCommands(
    require.context(
      // Look for files in the current directory
      './commands',
      // Do not look in subdirectories
      false,
      // Only include "_base-" prefixed .vue files
      /fileCommand.*.ts$/
    ),
    /fileCommand(.*)/,
    createFileCommand,
    context
  );
}

function nomalizeCommandName(rawName) {
  const firstLetter = rawName[0].toUpperCase();
  return firstLetter + rawName.slice(1).replace(/[A-Z]/g, token => ` ${token[0]}`);
}

async function loadCommands(requireContext, nameRegex, commandCreator, context: ExtensionContext) {
  requireContext.keys().forEach(fileName => {
    const clearName = fileName
      // Remove the "./" from the beginning
      .replace(/^\.\//, '')
      // Remove the file extension from the end
      .replace(/\.\w+$/, '');

    const match = nameRegex.exec(clearName);
    if (!match || !match[1]) {
      logger.warn(`Command name not found from ${fileName}`);
      return;
    }

    const commandOption = requireContext(fileName).default;
    commandOption.name = nomalizeCommandName(match[1]);

    try {
      // tslint:disable-next-line variable-name
      const Cmd = commandCreator(commandOption);
      const cmdInstance: Command = new Cmd();
      logger.debug(`register command "${commandOption.name}" from "${fileName}"`);
      registerCommand(context, commandOption.id, cmdInstance.run, cmdInstance);
    } catch (error) {
      logger.error(error, `load command "${fileName}"`);
    }
  });
}
