import { newConfig } from '../modules/config';
import checkRequire from '../helper/checkRequire';

function editConfig() {
  newConfig();
}

export default checkRequire(editConfig);
