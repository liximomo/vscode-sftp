import * as mockFs from 'mock-fs';
import { sync, TransferDirection } from '../transfer';
import localFs from '../../../core/localFs';
import TransferTask from '../../../core/transferTask';

jest.mock('../../../ui/statusBarItem');

const file = (c, time = 0) =>
  mockFs.file({
    content: c,
    ctime: new Date(time * 1000),
    mtime: new Date(time * 1000),
  });

const mapList = (list: any[], key: string) => list.map(t => t[key]);

describe('transfer algorithm', () => {
  describe('sync', () => {
    afterEach(mockFs.restore);

    test('sync', async () => {
      mockFs({
        local: {
          a: file('a', 1),
          b: file('b', 1),
          c: {
            'c-a': file('c-a', 1),
            'c-b': file('c-b', 1),
            d: {
              'd-a': file('d-a', 1),
              'd-b': file('d-b', 1),
            },
          },
        },
        remote: {
          a: file('$a'),
          $da: file('$da'),
          $db: {},
          c: {
            'c-a': file('$c-a'),
            $dc: file('$dc'),
            d: {
              'd-a': file('$d-a'),
            },
          },
        },
      });

      const task: TransferTask[] = [];
      const collect = (a: TransferTask) => task.push(a);
      const deleted = await sync(
        {
          srcFsPath: 'local',
          srcFs: localFs,
          targetFs: localFs,
          targetFsPath: 'remote',
          transferDirection: TransferDirection.LOCAL_TO_REMOTE,
          transferOption: {
            perserveTargetMode: false,
          },
        },
        collect
      );
      expect(task.length).toEqual(6);
      expect(deleted.length).toEqual(0);
      expect(mapList(task, 'targetFsPath').sort()).toEqual(
        [
          'remote/a',
          'remote/b',
          'remote/c/c-a',
          'remote/c/c-b',
          'remote/c/d/d-a',
          'remote/c/d/d-b',
        ].sort()
      );
    });

    test('sync --delete', async () => {
      mockFs({
        local: {
          a: file('a', 1),
          b: file('b', 1),
          c: {
            'c-a': file('c-a', 1),
            'c-b': file('c-b', 1),
            d: {
              'd-a': file('d-a', 1),
              'd-b': file('d-b', 1),
            },
          },
        },
        remote: {
          a: file('$a'),
          $da: file('$da'),
          $db: {},
          c: {
            'c-a': file('$c-a'),
            $dc: file('$dc'),
            d: {
              'd-a': file('$d-a'),
            },
          },
        },
      });

      const task: TransferTask[] = [];
      const collect = (a: TransferTask) => task.push(a);
      const deleted = await sync(
        {
          srcFsPath: 'local',
          srcFs: localFs,
          targetFs: localFs,
          targetFsPath: 'remote',
          transferDirection: TransferDirection.LOCAL_TO_REMOTE,
          transferOption: {
            delete: true,
            perserveTargetMode: false,
          },
        },
        collect
      );
      expect(task.length).toEqual(6);
      expect(deleted.length).toEqual(3);
      expect(mapList(deleted, 'fspath').sort()).toEqual(
        ['remote/$da', 'remote/$db', 'remote/c/$dc'].sort()
      );
      expect(mapList(task, 'targetFsPath').sort()).toEqual(
        [
          'remote/a',
          'remote/b',
          'remote/c/c-a',
          'remote/c/c-b',
          'remote/c/d/d-a',
          'remote/c/d/d-b',
        ].sort()
      );
    });

    test('sync --update', async () => {
      mockFs({
        local: {
          a: file('a', 1),
          b: file('b', 1),
          c: {
            'c-a': file('c-a', 1),
            'c-b': file('c-b', 1),
            d: {
              'd-a': file('d-a', 1),
              'd-b': file('d-b', 1),
            },
          },
        },
        remote: {
          a: file('$a'),
          $da: file('$da'),
          $db: {},
          c: {
            'c-a': file('$c-a'),
            $dc: file('$dc'),
            d: {
              'd-a': file('$d-a'),
            },
          },
        },
      });

      const task: TransferTask[] = [];
      const collect = (a: TransferTask) => task.push(a);
      const deleted = await sync(
        {
          srcFsPath: 'local',
          srcFs: localFs,
          targetFs: localFs,
          targetFsPath: 'remote',
          transferDirection: TransferDirection.LOCAL_TO_REMOTE,
          transferOption: {
            delete: true,
            perserveTargetMode: false,
          },
        },
        collect
      );
      expect(task.length).toEqual(6);
      expect(deleted.length).toEqual(3);
      expect(mapList(deleted, 'fspath').sort()).toEqual(
        ['remote/$da', 'remote/$db', 'remote/c/$dc'].sort()
      );
      expect(mapList(task, 'targetFsPath').sort()).toEqual(
        [
          'remote/a',
          'remote/b',
          'remote/c/c-a',
          'remote/c/c-b',
          'remote/c/d/d-a',
          'remote/c/d/d-b',
        ].sort()
      );
    });

    test('sync --skipDelete', async () => {
      mockFs({
        local: {
          a: file('a', 1),
          b: file('b', 1),
          c: {
            'c-a': file('c-a', 1),
            'c-b': file('c-b', 1),
            d: {
              'd-a': file('d-a', 1),
              'd-b': file('d-b', 1),
            },
          },
        },
        remote: {
          a: file('$a'),
          c: {
            'c-a': file('$c-a'),
            d: {
              'd-a': file('$d-a'),
            },
          },
        },
      });

      const task: TransferTask[] = [];
      const collect = (a: TransferTask) => task.push(a);
      const deleted = await sync(
        {
          srcFsPath: 'local',
          srcFs: localFs,
          targetFs: localFs,
          targetFsPath: 'remote',
          transferDirection: TransferDirection.LOCAL_TO_REMOTE,
          transferOption: {
            skipCreate: true,
            perserveTargetMode: false,
          },
        },
        collect
      );
      expect(task.length).toEqual(3);
      expect(deleted.length).toEqual(0);
      expect(mapList(task, 'targetFsPath').sort()).toEqual(
        ['remote/a', 'remote/c/c-a', 'remote/c/d/d-a'].sort()
      );
    });

    test('sync --update', async () => {
      mockFs({
        local: {
          a: file('a', 1),
          b: file('b', 1),
          c: {
            'c-a': file('c-a', 1),
            'c-b': file('c-b', 1),
            d: {
              'd-a': file('d-a', 1),
              'd-b': file('d-b', 1),
            },
          },
        },
        remote: {
          a: file('$a', 2),
          c: {
            'c-a': file('$c-a', 1),
            d: {
              'd-a': file('$d-a'),
            },
          },
        },
      });

      const task: TransferTask[] = [];
      const collect = (a: TransferTask) => task.push(a);
      const deleted = await sync(
        {
          srcFsPath: 'local',
          srcFs: localFs,
          targetFs: localFs,
          targetFsPath: 'remote',
          transferDirection: TransferDirection.LOCAL_TO_REMOTE,
          transferOption: {
            update: true,
            perserveTargetMode: false,
          },
        },
        collect
      );
      expect(task.length).toEqual(4);
      expect(deleted.length).toEqual(0);
      expect(mapList(task, 'targetFsPath').sort()).toEqual(
        ['remote/b', 'remote/c/c-b', 'remote/c/d/d-a', 'remote/c/d/d-b'].sort()
      );
    });

    test('sync both direction"', async () => {
      mockFs({
        local: {
          a: file('a', 1),
          b: file('b', 1),
          c: {
            'c-a': file('c-a', 1),
            'c-b': file('c-b', 1),
            'c-c': file('c-c', 1),
            d: {
              'd-a': file('d-a', 1),
              'd-b': file('d-b', 1),
            },
          },
        },
        remote: {
          a: file('$a'),
          b: file('$b', 2),
          c: {
            'c-a': file('$c-a'),
            'c-b': file('$c-b', 2),
            d: {
              'd-a': file('$d-a'),
              'd-b': file('$d-b', 2),
              'd-c': file('$d-c'),
            },
          },
        },
      });

      const task: TransferTask[] = [];
      const collect = (a: TransferTask) => task.push(a);
      const deleted = await sync(
        {
          srcFsPath: 'local',
          srcFs: localFs,
          targetFs: localFs,
          targetFsPath: 'remote',
          transferDirection: TransferDirection.LOCAL_TO_REMOTE,
          transferOption: {
            bothDiretions: true,
            perserveTargetMode: false,
          },
        },
        collect
      );
      expect(task.length).toEqual(8);
      expect(deleted.length).toEqual(0);
      expect(mapList(task, 'targetFsPath').sort()).toEqual(
        [
          'remote/a',
          'local/b',
          'remote/c/c-a',
          'local/c/c-b',
          'remote/c/c-c',
          'remote/c/d/d-a',
          'local/c/d/d-b',
          'local/c/d/d-c',
        ].sort()
      );
    });

    test('sync both direction --skipCreate"', async () => {
      mockFs({
        local: {
          a: file('a', 1),
          b: file('b', 1),
          c: {
            'c-a': file('c-a', 1),
            'c-b': file('c-b', 1),
            'c-c': file('c-c', 1),
            d: {
              'd-a': file('d-a', 1),
              'd-b': file('d-b', 1),
            },
          },
        },
        remote: {
          a: file('$a'),
          b: file('$b', 2),
          c: {
            'c-a': file('$c-a'),
            'c-b': file('$c-b', 2),
            d: {
              'd-a': file('$d-a'),
              'd-b': file('$d-b', 2),
              'd-c': file('$d-c'),
            },
          },
        },
      });

      const task: TransferTask[] = [];
      const collect = (a: TransferTask) => task.push(a);
      const deleted = await sync(
        {
          srcFsPath: 'local',
          srcFs: localFs,
          targetFs: localFs,
          targetFsPath: 'remote',
          transferDirection: TransferDirection.LOCAL_TO_REMOTE,
          transferOption: {
            skipCreate: true,
            bothDiretions: true,
            perserveTargetMode: false,
          },
        },
        collect
      );
      expect(task.length).toEqual(6);
      expect(deleted.length).toEqual(0);
      expect(mapList(task, 'targetFsPath').sort()).toEqual(
        [
          'remote/a',
          'local/b',
          'remote/c/c-a',
          'local/c/c-b',
          'remote/c/d/d-a',
          'local/c/d/d-b',
        ].sort()
      );
    });
  });
});
