import * as vscode from 'vscode';
import { EXTENSION_NAME } from '../constants';

let config;
let configInvalid = false;

vscode.workspace.onDidChangeConfiguration(_ => {
  configInvalid = true;
});

export function getConfig() {
  if (config === undefined || configInvalid) {
    config = vscode.workspace.getConfiguration(EXTENSION_NAME);
  }

  return config;
}
