export function flatten(items) {
  const accumulater = (result, item) => result.concat(item);
  return items.reduce(accumulater, []);
}

export function interpolate(str: string, props: { [x: string]: string }) {
  return str.replace(/\${([^{}]*)}/g, (match, expr) => {
    const value = props[expr];
    return typeof value === 'string' || typeof value === 'number' ? value : match;
  });
}
