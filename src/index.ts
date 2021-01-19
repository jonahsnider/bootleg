import {Command, flags} from '@oclif/command';
import {InstagramDownloader} from './downloaders';
import {readLines} from './file-parser';
import PromiseQueue from 'p-queue';
import cli from 'cli-ux';

const allDownloaders = [new InstagramDownloader()] as const;

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

	private readonly downloadQueue = new PromiseQueue({concurrency: 1, autoStart: false});
	private readonly progress = cli.progress();

	async run() {
		const {flags} = this.parse(Bootleg);

		const urls = await readLines(flags.file);

		for (const url of urls) {
			const downloader = allDownloaders.find(downloader => downloader.canDownload(url));

			if (!downloader) {
				throw new RangeError(`Couldn't find a downloader for ${url}`);
			}

			// eslint-disable-next-line no-await-in-loop
			const ids = await downloader.resolveIds(url);

			const downloads = ids.map(id => async () => {
				await downloader.download({directory: flags.dir, media: id});
				this.progress.increment();
			});

			// eslint-disable-next-line no-await-in-loop
			await this.downloadQueue.addAll(downloads);
		}

		this.progress.start(this.downloadQueue.size);
		this.downloadQueue.start();

		await this.downloadQueue.onIdle();

		this.progress.stop();
	}
}
// eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
Bootleg.run().then(null, require('@oclif/errors/handle'));
