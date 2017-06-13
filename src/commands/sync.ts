import * as output from '../modules/output';
import { getConfig } from '../modules/config';
import { upload, download, sync2Remote, sync2Local } from '../modules/sync';
import { createFileCommand } from '../helper/createCommand';

// item:
// fsPath:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// external:"file:///Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// $mid:1
// path:"/Users/mymomo/workspace/lanyilv/src/htdocs/lanyicj_platform/environments"
// scheme:"file"

export const sync2RemoteCommand = createFileCommand(sync2Remote);
export const sync2LocalCommand = createFileCommand(sync2Local);

export const uploadCommand = createFileCommand(upload);
export const downloadCommand = createFileCommand(download);
