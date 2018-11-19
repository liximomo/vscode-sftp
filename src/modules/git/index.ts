import * as vscode from 'vscode';
import { GitExtension, API, Status, Change, Repository } from './git';

let git: API;

export { API as GitAPI, Repository, Status, Change };

export function getGitService(): API {
  const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git').exports;
  git = gitExtension.getAPI(1);
  return git;
}
