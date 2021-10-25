import {join} from 'path';
import process from 'process';
import test from 'ava';
import FileType from 'file-type';
import {InstagramDownloader, InstagramIdKind} from './instagram.js';

const instagramDownloader = new InstagramDownloader(process.env.INSTAGRAM_SESSION_ID);

test('canDownload', t => {
	t.true(instagramDownloader.canDownload('https://www.instagram.com/p/CF2iwCfsSVI/'));
	t.false(instagramDownloader.canDownload('https://jonah.pw/'));
});

test.serial('resolveIds', async t => {
	t.deepEqual(await instagramDownloader.resolveIds('https://www.instagram.com/p/CF2zmluMjL5/'), [{id: 'CF2zmluMjL5', kind: InstagramIdKind.Post}], 'post');

	t.deepEqual(
		await instagramDownloader.resolveIds('https://www.instagram.com/stories/instagram/0123456789/'),
		[{id: '0123456789', kind: InstagramIdKind.Story}],
		'story',
	);

	t.deepEqual(
		await instagramDownloader.resolveIds('https://www.instagram.com/reel/reel_id/?igshid=share_id'),
		[{id: 'reel_id', kind: InstagramIdKind.Reel}],
		'reel',
	);

	await Promise.all([
		t.throwsAsync(instagramDownloader.resolveIds('https://www.instagram.com/username'), {instanceOf: RangeError}, 'profile'),
		t.throwsAsync(instagramDownloader.resolveIds('https://jonah.pw'), {instanceOf: RangeError}, 'throws on invalid hostname'),
		t.throwsAsync(
			instagramDownloader.resolveIds('https://instagram.com/unknown_media_type/id/more_data?query=param'),
			{instanceOf: RangeError, message: 'Unexpected media type'},
			'throws on unknown media type',
		),
		t.throwsAsync(instagramDownloader.resolveIds('https://instagram.com/instagram'), {instanceOf: RangeError}, 'throws on user'),
	]);
});

// eslint-disable-next-line ava/no-skip-test
test.serial.skip('download', async t => {
	const downloadsPath = join(__dirname, '..', '..', 'test', 'downloads', 'InstagramDownloader');

	const singleImagePost = async () => {
		await instagramDownloader.download({directory: downloadsPath, media: {kind: InstagramIdKind.Post, id: 'CF2zmluMjL5'}});

		const fileType = await FileType.fromFile(join(downloadsPath, 'instagram', 'CF2zmluMjL5', 'CF2zmluMjL5.jpg'));

		t.is(fileType?.ext, 'jpg', 'single image post');
	};

	const singleVideoPost = async () => {
		await instagramDownloader.download({directory: downloadsPath, media: {kind: InstagramIdKind.Post, id: 'CE7AhQ9jlQv'}});
		const postPath = join(downloadsPath, 'instagram', 'CE7AhQ9jlQv');
		await Promise.all(
			[
				async () => {
					const fileType = await FileType.fromFile(join(postPath, 'CE7AhQ9jlQv.jpg'));
					t.is(fileType?.ext, 'jpg', 'single video post');
				},
				async () => {
					const fileType = await FileType.fromFile(join(postPath, 'CE7AhQ9jlQv.mp4'));
					t.is(fileType?.ext, 'mp4', 'single video post');
				},
			].map(async fn => fn()),
		);
	};

	const mixedPost = async () => {
		await instagramDownloader.download({directory: downloadsPath, media: {kind: InstagramIdKind.Post, id: 'CDmoxmVsOD_'}});
		const postPath = join(downloadsPath, 'instagram', 'CDmoxmVsOD_');
		await Promise.all(
			[
				async () => {
					const fileType = await FileType.fromFile(join(postPath, 'CDmoxiAsn7s.jpg'));
					t.is(fileType?.ext, 'jpg', 'mixed post image');
				},
				async () => {
					const fileType = await FileType.fromFile(join(postPath, 'CDmokGvlNcu.jpg'));
					t.is(fileType?.ext, 'jpg', 'mixed post video preview');
				},
				async () => {
					const fileType = await FileType.fromFile(join(postPath, 'CDmokGvlNcu.mp4'));
					t.is(fileType?.ext, 'mp4', 'mixed post video');
				},
			].map(async fn => fn()),
		);
	};

	await singleImagePost();
	await singleVideoPost();
	await mixedPost();
	await t.throwsAsync(instagramDownloader.download({directory: downloadsPath, media: {kind: InstagramIdKind.Reel, id: "doesn't matter"}}), {
		instanceOf: RangeError,
		message: 'Not implemented',
	});
});
