import { UResource } from '../core';
import app from '../app';
import { COMMAND_REVEAL_IN_REMOTE_EXPLORER } from '../constants';
import FileCommand from './abstract/fileCommand';
import { selectActivedFile } from './shared';

export default class RevealInRemoteExplorer extends FileCommand {
  static id = COMMAND_REVEAL_IN_REMOTE_EXPLORER;
  static option = {
    requireTarget: false,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource) {
    // todo: make this to a method of remoteExplorer
    await app.remoteExplorer.reveal({
      resource: UResource.makeResource(uResource.remoteUri),
      isDirectory: false,
    });
  }
}
