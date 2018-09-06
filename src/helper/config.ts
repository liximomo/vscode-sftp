import * as fs from 'fs';
import app from '../app';

const cache = app.ignoreFileCache;

export function filesIgnoredFromConfig(config): string[] {
  const ignore: string[] = config.ignore && config.ignore.length ? config.ignore : [];

  const ignoreFile = config.ignoreFile;
  if (!ignoreFile) {
    return ignore;
  }

  let ignoreFromFile;
  if (cache.has(ignoreFile)) {
    ignoreFromFile = cache.get(ignoreFile);
  } else if (fs.existsSync(ignoreFile)) {
    ignoreFromFile = fs
      .readFileSync(ignoreFile)
      .toString()
      .split(/\r?\n/g);
    cache.set(ignoreFile, ignoreFromFile);
  } else {
    throw new Error(`File ${ignoreFile} not found. Check your config of "ignoreFile"`);
  }

  return ignore.concat(ignoreFromFile);
}
