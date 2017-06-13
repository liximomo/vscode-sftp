export default function flatMap<T, U>(items: T[], handle: (item: T) => U[] | U): U[] {
  return items.reduce((result, item) => result.concat(handle(item)), []);
}
