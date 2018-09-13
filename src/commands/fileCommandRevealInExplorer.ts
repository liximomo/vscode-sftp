import { UResource } from '../core';
import { COMMAND_REVEAL_IN_EXPLORER } from '../constants';
import { executeCommand } from '../host';
import FileCommand from './abstract/fileCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';

export default class RevealInExplorer extends FileCommand {
  static id = COMMAND_REVEAL_IN_EXPLORER;
  static getFileTarget = uriFromExplorerContextOrEditorContext;

  async handleFile(uResource: UResource) {
    await executeCommand('revealInExplorer', uResource.localUri);
  }
}
