import test from 'ava';
import {readLines} from './file-parser';
import {join as joinPaths} from 'path';

test('readLines', async t => {
	t.deepEqual(await readLines(joinPaths(__dirname, '..', 'test', 'fixtures', 'file.txt')), ['a', 'b', 'c']);
});
