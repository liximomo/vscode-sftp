import { upload, download, downloadWithoutIgnore } from './transfer';
import { editConfig } from './config';
import { sync2Local, sync2Remote } from './sync';
import { removeRemote } from './remove';
import { diff } from './diff';

export {
  diff,
  upload,
  download,
  downloadWithoutIgnore,
  sync2Local,
  sync2Remote,
  removeRemote,
  editConfig,
};
