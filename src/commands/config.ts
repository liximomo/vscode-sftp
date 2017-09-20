import { newConfig } from '../modules/config';
import checkRequire from '../helper/checkRequire';

function editConfig() {
  // TODO pick workspaceFolder
  newConfig();
}

export default checkRequire(editConfig);
