import {createWriteStream, PathLike} from 'fs';
import {utimes} from 'fs/promises';
import {pipeline as pipelineWithCallback, Readable} from 'stream';
import {promisify} from 'util';

const pipeline = promisify(pipelineWithCallback);

/**
 * Download a stream to a file path.
 *
 * @param stream - Stream to use for downloading media
 * @param path - Path to download to
 * @param timestamp - Timestamp to update the file modified date with after download
 */
export async function download(stream: Readable, path: PathLike, timestamp?: Date) {
	const downloadOperation = pipeline(stream, createWriteStream(path));

	if (timestamp) {
		await downloadOperation;
		await utimes(path, timestamp, timestamp);
	}

	return downloadOperation;
}
