export function flatten(items) {
  const accumulater = (result, item) => result.concat(item);
  return items.reduce(accumulater, []);
}
