import { UResource } from '../core';
import app from '../app';
import { COMMAND_REVEAL_IN_REMOTE_EXPLORER } from '../constants';
import { checkFileCommand } from './abstract/createCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';

export default checkFileCommand({
  id: COMMAND_REVEAL_IN_REMOTE_EXPLORER,
  getFileTarget: uriFromExplorerContextOrEditorContext,

  async handleFile({ target }) {
    await app.remoteExplorer.reveal({
      resource: UResource.makeResource(target.remoteUri),
      isDirectory: false,
    });
  },
});
