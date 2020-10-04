import test from 'ava';
import {access} from 'fs/promises';
import {join} from 'path';
import {InstagramDownloader, InstagramIdKind} from './instagram';

const instagramDownloader = new InstagramDownloader();

test('canDownload', t => {
	t.true(instagramDownloader.canDownload('https://www.instagram.com/p/CF2iwCfsSVI/'));
	t.false(instagramDownloader.canDownload('https://jonah.pw/'));
});

test('resolveIds', async t => {
	t.deepEqual(await instagramDownloader.resolveIds('https://www.instagram.com/p/CF2zmluMjL5/'), [{id: 'CF2zmluMjL5', kind: InstagramIdKind.Post}], 'post');

	t.deepEqual(
		await instagramDownloader.resolveIds('https://www.instagram.com/stories/instagram/0123456789/'),
		[{id: '0123456789', kind: InstagramIdKind.Story}],
		'story'
	);

	t.deepEqual(
		await instagramDownloader.resolveIds('https://www.instagram.com/reel/reel_id/?igshid=share_id'),
		[{id: 'reel_id', kind: InstagramIdKind.Reel}],
		'reel'
	);

	await Promise.all([
		t.throwsAsync(instagramDownloader.resolveIds('https://www.instagram.com/username'), {instanceOf: RangeError}, 'profile'),
		t.throwsAsync(instagramDownloader.resolveIds('https://jonah.pw'), {instanceOf: RangeError}, 'throws on invalid hostname'),
		t.throwsAsync(
			instagramDownloader.resolveIds('https://instagram.com/unknown_media_type/id/more_data?query=param'),
			{instanceOf: RangeError, message: 'Unexpected media type'},
			'throws on unknown media type'
		),
		t.throwsAsync(instagramDownloader.resolveIds('https://instagram.com/instagram'), {instanceOf: RangeError}, 'throws on user')
	]);
});

test('download', async t => {
	const downloadsPath = join(__dirname, '..', '..', 'test', 'downloads');

	await Promise.all([
		t.notThrowsAsync(async () => {
			await instagramDownloader.download({directory: downloadsPath, media: {kind: InstagramIdKind.Post, id: 'CF2zmluMjL5'}});

			await access(join(downloadsPath, 'instagram', 'CF2zmluMjL5', 'CF2zmluMjL5.jpg'));
		}, 'single image post'),
		t.notThrowsAsync(async () => {
			await instagramDownloader.download({directory: downloadsPath, media: {kind: InstagramIdKind.Post, id: 'CE7AhQ9jlQv'}});

			await access(join(downloadsPath, 'instagram', 'CE7AhQ9jlQv', 'CE7AhQ9jlQv.mp4'));
		}, 'single video post'),
		t.notThrowsAsync(async () => {
			await Promise.all([
				instagramDownloader.download({directory: downloadsPath, media: {kind: InstagramIdKind.Post, id: 'CDmoxmVsOD_'}}),
				instagramDownloader.download({directory: downloadsPath, media: {kind: InstagramIdKind.Post, id: 'CDmoxmVsOD_'}})
			]);

			const postPath = join(downloadsPath, 'instagram', 'CDmoxmVsOD_');

			await Promise.all([access(join(postPath, 'CDmoxiAsn7s.jpg')), access(join(postPath, 'CDmokGvlNcu.mp4'))]);
		}, 'mixed post'),
		t.throwsAsync(instagramDownloader.download({directory: downloadsPath, media: {kind: InstagramIdKind.Reel, id: "doesn't matter"}}), {
			instanceOf: RangeError,
			message: 'Not implemented'
		})
	]);
});
