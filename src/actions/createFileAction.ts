import * as path from 'path';
import upath from '../modules/upath';
import { getHostInfo } from '../modules/config';
import getRemoteFs from '../modules/remoteFs';
import Ignore from '../modules/Ignore';
import * as paths from '../helper/paths';

export default function createFileAction(func) {
  return async (localFilePath, config) => {
    const localContext = config.context;
    const remoteContext = config.remotePath;

    const ignore = Ignore.from(config.ignore);
    const ignoreFunc = fsPath => {
      // vscode will always return path with / as separator
      const normalizedPath = path.normalize(fsPath);
      let relativePath;
      if (normalizedPath.indexOf(localContext) === 0) {
        // local path
        relativePath = path.relative(localContext, fsPath);
      } else {
        // remote path
        relativePath = upath.relative(remoteContext, fsPath);
      }

      // skip root
      return relativePath !== '' && ignore.ignores(relativePath);
    };

    const remoteFs = await getRemoteFs(getHostInfo(config));
    return await func(localFilePath, {
      ...config,
      remotePath: paths.toRemote(path.relative(localContext, localFilePath), remoteContext),
      ignore: ignoreFunc,
    }, remoteFs);
  };
}
