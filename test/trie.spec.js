const Trie = require('../src/modules/serviceManager/trie').default;

describe('Trie Tests', () => {
  describe('find all values', () => {
    test('multiple branch', () => {
      const trie = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/b/c/e': 3,
        'a/f': 4,
        'a/g/c': 5,
      });

      const result = trie.getAllValues();
      const expected = [1, 2, 3, 4, 5];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });

    test('deep branch', () => {
      const trie = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/b/c/e/f/g': 3,
        'a/f': 4,
        'a/g/b': 5,
        'a/h/b': 6,
      });

      const result = trie.getAllValues();
      const expected = [1, 2, 3, 4, 5, 6];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });

    test('multiple root branch', () => {
      const trie = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/f': 3,
        'b/c/d': 4,
        'b/c/e': 5,
        'b/g': 6,
      });

      const result = trie.getAllValues();
      const expected = [1, 2, 3, 4, 5, 6];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });
  });

  describe('find values with shortest branch', () => {
    test('multiple branch', () => {
      const trie = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/b/c/e': 3,
        'a/f': 4,
        'a/g/c': 5,
      });

      const result = trie.findValuesWithShortestBranch();
      const expected = [1, 4, 5];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });

    test('deep branch', () => {
      const trie = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/b/c/e/f/g': 3,
        'a/f': 4,
        'a/g/b': 5,
        'a/h/b': 6,
      });

      const result = trie.findValuesWithShortestBranch();
      const expected = [1, 4, 5, 6];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });

    test('multiple root branch', () => {
      const trie = new Trie({
        'a/b/c': 1,
        'a/b/c/d': 2,
        'a/f': 3,
        'b/c/d': 4,
        'b/c/e': 5,
        'b/g': 6,
      });

      const result = trie.findValuesWithShortestBranch();
      const expected = [1, 3, 4, 5, 6];
      expect(result).toEqual(expect.arrayContaining(expected));
      expect(result.length).toEqual(expected.length);
    });
  });

  describe('find value with shortest branch', () => {
    test('single branch', () => {
      const trie = new Trie({
        'a/b/c/d': 1,
      });

      let result = trie.findPrefix('a/test.js');
      expect(result).toEqual(null);

      result = trie.findPrefix('a/b/test.js');
      expect(result).toEqual(null);

      result = trie.findPrefix('a/b/c/test.js');
      expect(result).toEqual(null);

      result = trie.findPrefix('a/b/c/d/test.js');
      expect(result).toEqual(1);

      result = trie.findPrefix('a/b/c/d/');
      expect(result).toEqual(1);

      result = trie.findPrefix('a/b/c/d');
      expect(result).toEqual(1);

      result = trie.findPrefix('a/b/c/d/e/test.js');
      expect(result).toEqual(1);
    });

    test('deep branch', () => {
      const trie = new Trie({
        a: 1,
        'a/b/c': 2,
      });

      const result = trie.findPrefix('a/b/test.js');
      const expected = 1;
      expect(result).toEqual(expected);
    });

    test('multiple branch', () => {
      const trie = new Trie({
        a: 1,
        b: 2,
        c: 3,
      });

      let result = trie.findPrefix('a/test.js');
      expect(result).toEqual(1);

      result = trie.findPrefix('b/test.js');
      expect(result).toEqual(2);

      result = trie.findPrefix('c/test.js');
      expect(result).toEqual(3);
    });

    test('multiple deep branch', () => {
      const trie = new Trie({
        a: 1,
        b: 2,
        c: 3,
        'd/e': 4,
        'd/f': 5,
        'd/g': 6,
        'h/i/l': 7,
        'h/j/m': 8,
        'h/k/n': 9,
      });

      let result = trie.findPrefix('a/test.js');
      expect(result).toEqual(1);

      result = trie.findPrefix('d/f/test.js');
      expect(result).toEqual(5);

      result = trie.findPrefix('h/k/n/test.js');
      expect(result).toEqual(9);
    });
  });

  describe('remove should work', () => {
    test('single branch', () => {
      const trie = new Trie({
        'a/b/c/d': 1,
      });

      trie.remove('a/b/c/d');

      expect(trie.root.getChildren().length).toEqual(0);
    });

    test('multiple branch', () => {
      const trie = new Trie({
        'a/b/c/d': 1,
        'a/b/c/e': 2,
        'a/b/c/f': 3,
      });

      trie.remove('a/b/c/d');
      const node = trie.findNode(trie.root, trie.splitPath('a/b/c'));
      
      expect(node).toBeTruthy();
      expect(node.getChildren().map(n => n.value).sort()).toEqual([2, 3]);
    });

    test('nested branch', () => {
      const trie = new Trie({
        'a/b/c/d': 1,
        'a/b': 2,
      });

      trie.remove('a/b/c/d');

      expect(trie.findNode(trie.root, trie.splitPath('a/b'))).toBeTruthy();
      expect(trie.findNode(trie.root, trie.splitPath('a/b/c'))).toBeFalsy();
    });

    test('nested branch -- top', () => {
      const trie = new Trie({
        'a/b/c/d': 1,
        'a/b': 2,
      });

      trie.remove('a/b');

      expect(trie.findPrefix('a/b/c/d')).toEqual(1);
      expect(trie.findPrefix('a/b')).toEqual(null);
    });

  });
});
