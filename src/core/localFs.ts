import * as path from 'path';
import { LocalFileSystem } from './fs';

const fs = new LocalFileSystem(path);

export default fs;
