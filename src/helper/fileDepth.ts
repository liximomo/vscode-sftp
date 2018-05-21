import upath from '../core/upath';

export default function fileDepth(file: string) {
  return upath.normalize(file).split('/').length;
}
