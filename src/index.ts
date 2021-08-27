import process from 'process';
import {Command, flags} from '@oclif/command';
import cli from 'cli-ux';
import PromiseQueue from 'p-queue';
import {loadConfig} from './config';
import {InstagramDownloader} from './downloaders';

class Bootleg extends Command {
	static flags = {
		version: flags.version({char: 'v'}),
		help: flags.help(),
		dir: flags.string({
			char: 'd',
			default: process.cwd()
		}),
		file: flags.string({
			char: 'f',
			required: true
		})
	};

	async run(): Promise<void> {
		const downloadQueue = new PromiseQueue({concurrency: 1, autoStart: false});
		const progress = cli.progress() as {increment: () => void; start: (max: number, min?: number) => void; stop: () => void};

		const {flags} = this.parse(Bootleg);

		const options = await loadConfig(flags.file);
		const allDownloaders = [new InstagramDownloader(options.apiTokens.instagram)] as const;

		for (const url of options.urls) {
			const downloader = allDownloaders.find(downloader => downloader.canDownload(url));

			if (!downloader) {
				throw new RangeError(`Couldn't find a downloader for ${url}`);
			}

			// eslint-disable-next-line no-await-in-loop
			const medias = await downloader.resolveIds(url);

			for (const media of medias) {
				downloadQueue
					.add(async () => {
						await downloader.download({directory: flags.dir, media});
						progress.increment();
					})
					.catch(error => {
						console.error(`Failed to queue media ID ${media.id} for ${url}`, error);
					});
			}
		}

		progress.start(downloadQueue.size);
		downloadQueue.start();
		await downloadQueue.onIdle();
		progress.stop();
	}
}
// eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
Bootleg.run().then(null, require('@oclif/errors/handle'));
