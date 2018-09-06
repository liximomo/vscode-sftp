import * as path from 'path';
import LocalFileSystem from './fs/localFileSystem';

const fs = new LocalFileSystem(path);

export default fs;
