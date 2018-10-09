import { FileSystem } from './fs';

export interface FileOption {
  mode?: number;
  atime: number;
  mtime: number;
  perserveTargetMode: boolean;
}

export async function getFileMode(path: string, fs: FileSystem) {
  try {
    const stat = await fs.lstat(path);
    return stat.mode;
  } catch (error) {
    return 0o666;
  }
}

export async function transferFile(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: FileOption
): Promise<void> {
  const { perserveTargetMode } = option;
  let { mode } = option;
  let inputStream;
  if (mode === undefined && perserveTargetMode) {
    [inputStream, mode] = await Promise.all([srcFs.get(src), getFileMode(des, desFs)]);
  } else {
    inputStream = await srcFs.get(src);
  }
  await desFs.put(inputStream, des, { mode });
}

export function transferSymlink(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: FileOption
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
