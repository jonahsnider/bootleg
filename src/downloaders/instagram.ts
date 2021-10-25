import {mkdir} from 'fs/promises';
import {join as joinPaths} from 'path';
import {URL} from 'url';
import {convert} from 'convert';
import got from 'got';
import {CookieJar} from 'tough-cookie';
import {download} from '../download';
import type {DownloadOptions, Media} from '../downloader';
import {Downloader} from '../downloader';

export enum InstagramIdKind {
	Post = 'post',
	Profile = 'profile',
	Reel = 'reel',
	Story = 'story',
}

type InstagramMedia = Media<InstagramIdKind>;

interface PostData {
	graphql: {
		shortcode_media: {
			taken_at_timestamp: number;
			shortcode: string;
			display_url: string;
			video_url?: string;
			is_video: boolean;
			edge_sidecar_to_children?: {
				edges: Array<{
					node: {shortcode: string; display_url: string; is_video: boolean; video_url?: string};
				}>;
			};
			owner: {
				username: string;
			};
		};
	};
}

const instagramHostname = /^(www\.)?instagram\.com$/i;

/**
 * Downloader for Instagram.
 * @see https://instagram.com Instagram website
 */
export class InstagramDownloader extends Downloader<InstagramMedia> {
	cookieJar: CookieJar;

	constructor(sessionId?: string) {
		super('instagram');

		this.cookieJar = new CookieJar();

		if (sessionId !== undefined) {
			this.cookieJar.setCookieSync(`sessionid=${sessionId}`, 'https://www.instagram.com');
		}
	}

	/**
	 * @param preParsed - Parsed URL to reuse
	 */
	canDownload(media: string, preParsed?: URL): boolean {
		const parsed = preParsed ?? new URL(media);

		return instagramHostname.test(parsed.hostname);
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
				const {body: postData} = await got<PostData>(`https://instagram.com/p/${media.id}`, {
					responseType: 'json',
					cookieJar: this.cookieJar,
					searchParams: {__a: '1'},
				});

				const shortcodeMedia = postData.graphql.shortcode_media;
				const timestamp = new Date(convert(shortcodeMedia.taken_at_timestamp, 'seconds').to('ms'));
				const {username} = shortcodeMedia.owner;

				// Create the directory of the post owner's username
				const userDirectory = joinPaths(directory, username, shortcodeMedia.shortcode);
				await mkdir(userDirectory, {recursive: true});

				/** Download options used for every piece of media from this post. */
				const baseDownloadOptions = {directory, username, timestamp, parentShortcode: shortcodeMedia.shortcode};

				/** Basic information on every piece of media that should be downloaded for a post. */
				const childMedias: Array<{shortcode: string; displayUrl: string; videoUrl?: string}> = [];

				if (shortcodeMedia.edge_sidecar_to_children) {
					// Multiple items for this post

					for (const {node} of shortcodeMedia.edge_sidecar_to_children.edges) {
						childMedias.push({shortcode: node.shortcode, displayUrl: node.display_url, videoUrl: node.video_url});
					}
				} else {
					// Single item for this post

					childMedias.push({displayUrl: shortcodeMedia.display_url, shortcode: shortcodeMedia.shortcode, videoUrl: shortcodeMedia.video_url});
				}

				const promises: Array<Promise<void>> = [];

				for (const childMedia of childMedias) {
					// Download the display URL, which is always an image
					// For media that are a video this is a thumbnail type image
					promises.push(this.downloadPostChild({...baseDownloadOptions, shortcode: childMedia.shortcode, isVideo: false, mediaUrl: childMedia.displayUrl}));

					if (childMedia.videoUrl !== undefined) {
						// If the video URL is present download that as well
						promises.push(this.downloadPostChild({...baseDownloadOptions, shortcode: childMedia.shortcode, isVideo: true, mediaUrl: childMedia.videoUrl}));
					}
				}

				await Promise.all(promises);
				break;
			}

			default: {
				throw new RangeError('Not implemented');
			}
		}
	}

	/**
	 * Downloads a singular image or video from a post.
	 * @param options - Options for downloading
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
		/** The timestamp of the post. */
		timestamp: Date;
		/** The URL to download media from. */
		mediaUrl: string;
		/** Base directory to use for downloads. */
		directory: string;
	}): Promise<void> {
		return download(
			got.stream(options.mediaUrl),
			joinPaths(options.directory, options.username, options.parentShortcode, `${options.shortcode}.${options.isVideo ? 'mp4' : 'jpg'}`),
			options.timestamp,
		);
	}
}
