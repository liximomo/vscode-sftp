import { getUserSetting } from '../host';
import { EXTENSION_NAME } from '../constants';

export function getExtensionSetting() {
  return getUserSetting(EXTENSION_NAME);
}
