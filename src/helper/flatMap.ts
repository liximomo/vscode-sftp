export default function flatMap<T, U>(items: Array<T>, handle: (item: T) => Array<U> | U): Array<U> {
  return items.reduce((result, item) => result.concat(handle(item)), []);
}
