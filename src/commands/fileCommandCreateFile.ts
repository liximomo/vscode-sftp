import { COMMAND_CREATE_FILE } from '../constants';
import { createRemoteFile } from '../fileHandlers';
// import { showConfirmMessage } from '../host';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';
import { window, Uri } from 'vscode';

export default checkFileCommand({
  id: COMMAND_CREATE_FILE,
  async getFileTarget(item, items) {
    const targets = await uriFromExplorerContextOrEditorContext(item, items);

    if (!targets) {
      return;
    }
   /* const filename = Array.isArray(targets)
    ? targets.map(t => upath.basename(t.fsPath)).join(',')
    : upath.basename(targets.fsPath);
*/
    const result = await window.showInputBox({
        value: '',
        prompt: 'Please input file name',
    });


    if (result !== undefined) {
        // window.showInformationMessage(targets.toString() + '%252F' + result);

        return Uri.parse(targets.toString() + '/' + result);
    }

    
    return undefined;
    
/*
    const filename = Array.isArray(targets)
      ? targets.map(t => upath.basename(t.fsPath)).join(',')
      : upath.basename(targets.fsPath);
    const result = await showConfirmMessage(
      `Are you sure you want to delete '${filename}'?`,
      'Delete',
      'Cancel'
    );

    return result ? targets : undefined;*/
  },

  handleFile: createRemoteFile,
});
