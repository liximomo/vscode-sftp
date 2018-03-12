import FileSystem from '../model/Fs/FileSystem';

export interface TransferOption {
  perserveTargetMode: boolean;
}

async function getFileMode(path: string, fs: FileSystem) {
  try {
    const stat = await fs.lstat(path);
    return stat.permissionMode;
  } catch (error) {
    return 0o666;
  }
}

export function transferFile(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: TransferOption
): Promise<void> {
  const transPromise = option.perserveTargetMode
    ? // $caution with ftp, mutilple remote cmd will cause previously opened inputstream to be closed.
      Promise.all([srcFs.get(src), getFileMode(des, desFs)]).then(([inputStream, mode]) =>
        desFs.put(inputStream, des, { mode })
      )
    : srcFs.get(src).then(inputStream => desFs.put(inputStream, des));

  return transPromise;
}

export function transferSymlink(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: TransferOption
): Promise<void> {
  return srcFs.readlink(src).then(targetPath => {
    return desFs.symlink(targetPath, des).catch(err => {
      // ignore file already exist
      if (err.code === 4 || err.code === 'EEXIST') {
        return;
      }
      throw err;
    });
  });
}

export function removeFile(path: string, fs: FileSystem, option): Promise<void> {
  return fs.unlink(path);
}

export function removeDir(path: string, fs: FileSystem, option): Promise<void> {
  return fs.rmdir(path, true);
}
