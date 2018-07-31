import * as vscode from 'vscode';
import BaseCommand from './BaseCommand';
import Command from './Command';
import FileCommand, { FileTarget } from './FileCommand';

const commands: BaseCommand[] = [];

function createCommand(id, name, handler) {
  const cmd = new Command(id, name, handler);
  commands.push(cmd);
  return cmd;
}

function createFileCommand(
  id,
  name,
  fileHandler: (localPath: string, remotePatg: string, config: any) => any,
  getFileTarget,
  requireTarget
) {
  const cmd = new FileCommand(id, name, fileHandler, getFileTarget, requireTarget);
  commands.push(cmd);
  return cmd;
}

function registerAll(context: vscode.ExtensionContext) {
  commands.forEach(cmd => cmd.register(context));
}

export default { createCommand, createFileCommand, registerAll };
