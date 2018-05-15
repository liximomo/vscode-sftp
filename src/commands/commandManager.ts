import * as vscode from 'vscode';
import BaseCommand from './BaseCommand';
import Command from './Command';
import FileCommand from './FileCommand';

const commands: BaseCommand[] = [];

function createCommand(id, name, handler) {
  const cmd = new Command(id, name, handler);
  commands.push(cmd);
  return cmd;
}

function createFileCommand(id, name, fileHandler, getFileTarget) {
  const cmd = new FileCommand(id, name, fileHandler, getFileTarget);
  commands.push(cmd);
  return cmd;
}

function registerAll(context: vscode.ExtensionContext) {
  commands.forEach(cmd => cmd.register(context));
}

export default { createCommand, createFileCommand, registerAll };
