import upath from '../modules/upath';

export default function fileDepth(file: string) {
  return upath.normalize(file).split('/').length;
}
