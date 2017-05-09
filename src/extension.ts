'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { sync2Remote, sync2Local } from './commands/sync';
import editConfig from './commands/config';

function registerCommand(
    context: vscode.ExtensionContext,
    name: string,
    callback: (args: any[]) => any,
    thisArg?: any
) {
    const disposable = vscode.commands.registerCommand(name, callback, thisArg);
    context.subscriptions.push(disposable);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "sftp" is now active!');

    registerCommand(context, 'sftp.config.default', editConfig);

    registerCommand(context, 'extension.sayHello', () => {
        vscode.window.showInformationMessage('Hello World!');
    });

    registerCommand(context, 'sftp.sync.remote', sync2Remote);

    registerCommand(context, 'sftp.sync.local', sync2Local);
}

export function deactivate() {
}
