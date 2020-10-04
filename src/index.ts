import {Command, flags} from '@oclif/command';
import {InstagramDownloader} from './downloaders';
import {readLines} from './file-parser';

const allDownloaders = [new InstagramDownloader()];

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

	async run() {
		const {flags} = this.parse(Bootleg);

		const urls = await readLines(flags.file);

		urls.forEach(async url => {
			const downloader = allDownloaders.find(downloader => downloader.canDownload(url));

			if (!downloader) {
				throw new RangeError(`Couldn't find a downloader for ${url}`);
			}

			const ids = await downloader.resolveIds(url);

			ids.forEach(async id => downloader.download({directory: flags.dir, media: id}));
		});
	}
}
// eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
Bootleg.run().then(null, require('@oclif/errors/handle'));
