export default function flatMap<T>(items: Array<T>, handle: (item: T) => Array<T> | T): Array<T> {
  return items.reduce((result, item) => result.concat(handle(item)), []);
}
