/**
 * A piece of media on a platform.
 */
export type Media<T> = {
	/**
	 * The kind of media for the platform.
	 * @example 'post'
	 */
	kind: T;
	/** The ID of this media on the platform. */
	id: string;
};

/**
 * Options passed to the download function.
 */
export interface DownloadOptions<T> {
	/** If existing files should be redownloaded. */
	downloadExisting?: boolean;
	/** The media to download. */
	media: T;
	/** The base directory to download to. */
	directory: string;
}

/**
 * A downloader for a social media site.
 */
export abstract class Downloader<T> {
	/**
	 * Instantiate a new downloader for a social media site.
	 * @param name - The name of the downloader
	 */
	constructor(public name: string) {}

	/**
	 * Check if a media resolvable can be downloaded by this downloader.
	 * @param media - Media to check
	 * @returns `true` when the media can be downloaded by this downloader
	 */
	public abstract canDownload(media: string): boolean;

	/**
	 * Convert a media resolvable into an ID on a specific platform.
	 * @param media - The media to resolve
	 */
	public abstract resolveIds(media: string): Promise<T[]>;

	/**
	 * Download a piece of media.
	 * @param options - The options for downloading
	 */
	public abstract download(options: DownloadOptions<T>): Promise<void>;
}
