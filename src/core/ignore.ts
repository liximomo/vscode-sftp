import * as GitIgnore from 'ignore/ignore';

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
    return this.ignore.ignores(pathname);
  }
}
