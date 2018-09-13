import { UResource, FileService } from '../core';
import { COMMAND_DIFF } from '../constants';
import { diff } from '../fileHandlers';
import FileCommand from './abstract/fileCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';

export default class Diff extends FileCommand {
  static id = COMMAND_DIFF;
  static getFileTarget = uriFromExplorerContextOrEditorContext;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await diff(uResource, fileService, config);
  }
}
