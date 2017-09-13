const Trie = require('../src/model/Trie').default;

describe('Trie Tests', () => {
  describe('find all values', () => {
    // Defines a Mocha unit test
    test('multiple branch', () => {
      const tire = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/b/c/e': 3,
        'a/f': 4,
        'a/g/c': 5,
      });

      const result = tire.getAllValues();
      const expected = [1, 2, 3, 4, 5];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });

    test('deep branch', () => {
      const tire = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/b/c/e/f/g': 3,
        'a/f': 4,
        'a/g/b': 5,
        'a/h/b': 6,
      });

      const result = tire.getAllValues();
      const expected = [1, 2, 3, 4, 5, 6];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });

    test('multiple root branch', () => {
      const tire = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/f': 3,
        'b/c/d': 4,
        'b/c/e': 5,
        'b/g': 6,
      });

      const result = tire.getAllValues();
      const expected = [1, 2, 3, 4, 5, 6];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });
  });

  describe('find values with shortest branch', () => {
    // Defines a Mocha unit test
    test('multiple branch', () => {
      const tire = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/b/c/e': 3,
        'a/f': 4,
        'a/g/c': 5,
      });

      const result = tire.findValuesWithShortestBranch();
      const expected = [1, 4, 5];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });

    test('deep branch', () => {
      const tire = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/b/c/e/f/g': 3,
        'a/f': 4,
        'a/g/b': 5,
        'a/h/b': 6,
      });

      const result = tire.findValuesWithShortestBranch();
      const expected = [1, 4, 5, 6];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });

    test('multiple root branch', () => {
      const tire = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/f': 3,
        'b/c/d': 4,
        'b/c/e': 5,
        'b/g': 6,
      });

      const result = tire.findValuesWithShortestBranch();
      const expected = [1, 3, 4, 5, 6];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });
  });

  describe('find value with shortest branch', () => {
    // Defines a Mocha unit test
    test('deep branch', () => {
      const tire = new Trie({
        'a': 1,
        'a/b/c': 2,
      });

      const result = tire.findPrefix('a/b/test.js');
      const expected = 1;
      expect(result).toEqual(expected);
    });

    test('multiple branch', () => {
      const tire = new Trie({
        'a': 1,
        'b': 2,
        'c': 3,
      });

      let result = tire.findPrefix('a/test.js');
      expect(result).toEqual(1);

      result = tire.findPrefix('b/test.js');
      expect(result).toEqual(2);

      result = tire.findPrefix('c/test.js');
      expect(result).toEqual(3);
    });

    test('multiple deep branch', () => {
      const tire = new Trie({
        'a': 1,
        'b': 2,
        'c': 3,
        'd/e': 4,
        'd/f': 5,
        'd/g': 6,
        'h/i/l': 7,
        'h/j/m': 8,
        'h/k/n': 9,
      });

      let result = tire.findPrefix('a/test.js');
      expect(result).toEqual(1);

      result = tire.findPrefix('d/f/test.js');
      expect(result).toEqual(5);

      result = tire.findPrefix('h/k/n/test.js');
      expect(result).toEqual(9);
    });
  });
});
