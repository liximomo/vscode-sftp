import { SourceControlResourceState } from 'vscode';
import { COMMAND_UPLOAD_CHANGEDFILE } from '../constants';
import { uploadFile } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';

export default checkFileCommand({
  id: COMMAND_UPLOAD_CHANGEDFILE,
  getFileTarget(...resourceStates: SourceControlResourceState[]) {
    return resourceStates.map(resourceState => resourceState.resourceUri);
  },

  async handleFile(ctx) {
    try {
      await uploadFile(ctx, { ignore: null });
    } catch (error) {
      // ignore error when try to upload a deleted file
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  },
});
