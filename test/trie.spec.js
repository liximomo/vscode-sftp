const Trie = require('../src/model/Trie').default;

describe("Trie Tests", () => {

  describe("find value with shortest branch", () => {
      // Defines a Mocha unit test
      test("multiple branch", () => {
        const tire = new Trie({
          'a/b/c': 1,
          'a/b/c/d': 2,
          'a/b/c/e': 3,
          'a/f': 4,
          'a/g/c': 5,
        });

        const result = tire.findValueWithShortestBranch();
        const expected = [1, 4, 5];
        expect(result).toEqual(expect.arrayContaining(expected));
        expect(result.length).toEqual(expected.length);
      });

      test("deep branch", () => {
        const tire = new Trie({
          'a/b/c': 1,
          'a/b/c/d': 2,
          'a/b/c/e/f/g': 3,
          'a/f': 4,
          'a/g/b': 5,
          'a/h/b': 6,
        });

        const result = tire.findValueWithShortestBranch();
        const expected = [1, 4, 5, 6];
        expect(result).toEqual(expect.arrayContaining(expected));
        expect(result.length).toEqual(expected.length);
      });

      test("multiple root branch", () => {
        const tire = new Trie({
          'a/b/c': 1,
          'a/b/c/d': 2,
          'a/f': 3,
          'b/c/d': 4,
          'b/c/e': 5,
          'b/g': 6,
        });

        const result = tire.findValueWithShortestBranch();
        const expected = [1, 3, 4, 5, 6];
        expect(result).toEqual(expect.arrayContaining(expected));
        expect(result.length).toEqual(expected.length);
      });
  });

});
