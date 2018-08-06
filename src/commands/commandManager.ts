import * as vscode from 'vscode';
import UResource from '../core/UResource';
import BaseCommand from './BaseCommand';
import Command from './Command';
import FileCommand from './FileCommand';

const commands: BaseCommand[] = [];

function createCommand(id, name, handler) {
  const cmd = new Command(id, name, handler);
  commands.push(cmd);
  return cmd;
}

function createFileCommand(
  id,
  name,
  fileHandler: (uResource: UResource, config: any) => any,
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
