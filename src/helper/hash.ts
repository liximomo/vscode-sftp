export default function hashCode(str: string) {
  let hash = 5381;
  let i = str.length;

  while (i) {
    // tslint:disable-next-line no-bitwise
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  // Convert to positive
  // tslint:disable-next-line no-bitwise
  return hash >>> 0;
}
