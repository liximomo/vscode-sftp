import GitIgnore from 'ignore';

export default class Ignore {
  static from(pattern) {
    return new Ignore(pattern);
  }

  pattern: string[] | string;
  private ignore: any;

  constructor(pattern) {
    this.ignore = GitIgnore();
    this.pattern = pattern;
    this.ignore.add(pattern);
  }

  ignores(pathname): boolean {
    if (!GitIgnore.isPathValid(pathname)) {
      return false;
    }

    return this.ignore.ignores(pathname);
  }
}
