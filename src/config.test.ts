import {join as joinPaths} from 'path';
import test from 'ava';
import {loadConfig} from './config';

test('loadConfig', async t => {
	t.deepEqual(await loadConfig(joinPaths(__dirname, '..', 'test', 'fixtures', 'config.toml')), {
		urls: ['https://www.instagram.com/p/CF2iwCfsSVI/'],
		apiTokens: {instagram: 'instagram token'}
	});
});
