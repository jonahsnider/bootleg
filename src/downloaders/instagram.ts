import {convert} from 'convert';
import {mkdir} from 'fs/promises';
import got from 'got';
import {join as joinPaths} from 'path';
import {download} from '../download';
import {Downloader, DownloadOptions, Media} from '../downloader';

export enum InstagramIdKind {
	Post = 'post',
	Profile = 'profile',
	Reel = 'reel',
	Story = 'story'
}

type InstagramMedia = Media<InstagramIdKind>;

interface PostData {
	graphql: {
		shortcode_media: {
			taken_at_timestamp: number;
			shortcode: string;
			display_url: string;
			is_video: boolean;
			edge_sidecar_to_children?: {
				edges: Array<{
					node: {shortcode: string; display_url: string; is_video: boolean};
				}>;
			};
			owner: {
				username: string;
			};
		};
	};
}

const instagramHostname = /^(www\.)?instagram\.com$/;

/**
 * Downloader for Instagram.
 * @see https://instagram.com Instagram website
 */
export class InstagramDownloader extends Downloader<InstagramMedia> {
	constructor() {
		super('instagram');
	}

	/**
	 * @param parsed - Parsed URL to reuse
	 */
	canDownload(media: string, parsed?: URL): boolean {
		return instagramHostname.test((parsed ?? new URL(media)).hostname);
	}

	async resolveIds(media: string): Promise<InstagramMedia[]> {
		const parsed = new URL(media);

		if (!this.canDownload(parsed.hostname, parsed)) {
			throw new RangeError(`Expected hostname of media to be valid, got ${parsed.host}`);
		}

		const [, kind, ...rest] = parsed.pathname.split('/');
		const result: InstagramMedia[] = [];

		if (rest[1] === undefined) {
			result.push({id: kind, kind: InstagramIdKind.Profile});

			throw new RangeError('Downloading users is not implemented');
		}

		switch (kind) {
			case 'p':
				result.push({id: rest[0], kind: InstagramIdKind.Post});
				break;
			case 'stories':
				result.push({id: rest[1], kind: InstagramIdKind.Story});
				break;
			case 'reel':
				result.push({id: rest[0], kind: InstagramIdKind.Reel});
				break;

			default:
				throw new RangeError('Unexpected media type');
		}

		return result;
	}

	async download({media, directory}: DownloadOptions<InstagramMedia>): Promise<void> {
		switch (media.kind) {
			case InstagramIdKind.Post: {
				const {body: postData} = await got<PostData>(`https://instagram.com/p/${media.id}?__a=1`, {responseType: 'json'});

				const shortcodeMedia = postData.graphql.shortcode_media;
				const timestamp = new Date(convert(shortcodeMedia.taken_at_timestamp).from('seconds').to('ms'));
				const {username} = shortcodeMedia.owner;

				const userDirectory = joinPaths(directory, username, shortcodeMedia.shortcode);
				await mkdir(userDirectory, {recursive: true});

				const mediaDownloads: Array<Promise<void>> = [];

				if (shortcodeMedia.edge_sidecar_to_children) {
					// Multiple media for this post

					shortcodeMedia.edge_sidecar_to_children.edges.forEach(({node}) =>
						mediaDownloads.push(
							this.downloadPostChild({
								directory,
								username,
								timestamp,
								isVideo: node.is_video,
								parentShortcode: shortcodeMedia.shortcode,
								mediaUrl: node.display_url,
								shortcode: node.shortcode
							})
						)
					);
				} else {
					// Single media for this post
					mediaDownloads.push(
						this.downloadPostChild({
							directory,
							username,
							timestamp,
							isVideo: shortcodeMedia.is_video,
							parentShortcode: shortcodeMedia.shortcode,
							mediaUrl: shortcodeMedia.display_url,
							shortcode: shortcodeMedia.shortcode
						})
					);
				}

				await Promise.all(mediaDownloads);
				break;
			}

			default: {
				throw new RangeError('Not implemented');
			}
		}
	}

	/**
	 * Downloads a singular image or video from a post.
	 * @param options Options for downloading
	 */
	private async downloadPostChild(options: {
		/** Username of the post owner. */
		username: string;
		/** The shortcode of the post this is the child of. */
		parentShortcode: string;
		/** Whether or not this is a video. */
		isVideo: boolean;
		/** The shortcode for this child. */
		shortcode: string;
		/** The timestamp of the post */
		timestamp: Date;
		/** The URL to download media from */
		mediaUrl: string;
		/** Base directory to use for downloads. */
		directory: string;
	}): Promise<void> {
		return download(
			got.stream(options.mediaUrl),
			joinPaths(options.directory, options.username, options.parentShortcode, `${options.shortcode}.${options.isVideo ? 'mp4' : 'jpg'}`),
			options.timestamp
		);
	}
}
