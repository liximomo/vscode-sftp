import { FileSystem } from './fs';

interface FileOption {
  mode?: number;
}

export async function getFileMode(path: string, fs: FileSystem, fallbackMode: number) {
  try {
    const stat = await fs.lstat(path);
    return stat.mode;
  } catch (error) {
    return fallbackMode !== undefined ? fallbackMode : 0o666;
  }
}

export async function transferFile(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option?: FileOption
): Promise<void> {
  const inputStream = await srcFs.get(src, option);
  await desFs.put(inputStream, des, option);
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
