import * as path from 'path';
import LocalFileSystem from './Fs/LocalFileSystem';

const fs = new LocalFileSystem(path);

export default fs;
