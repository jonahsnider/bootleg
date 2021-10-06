import {PathLike} from 'fs';
import os from 'os';
import * as fs from 'fs/promises';
import {URL} from 'url';
import {parse as parseToml} from '@ltd/j-toml';

class ApiTokens {
	instagram?: string;
}

class RawConfig {
	/* eslint-disable @typescript-eslint/naming-convention */
	urls!: string[];

	api_tokens?: ApiTokens;
	/* eslint-enable @typescript-eslint/naming-convention */
}

export interface Config {
	urls: string[];
	apiTokens: {
		instagram?: string;
	};
}

export async function loadConfig(path: PathLike): Promise<Config> {
	const raw = await fs.readFile(path, 'utf-8');
	const parsed = parseToml(raw, 1, os.EOL);

	if (!validateRawConfig(parsed)) {
		throw new RangeError('Invalid configuration');
	}

	return {
		apiTokens: {
			instagram: parsed.api_tokens?.instagram,
		},
		urls: parsed.urls,
	};
}

const supportedPlatforms = new Set(['instagram']);

// eslint-disable-next-line @typescript-eslint/ban-types
function validateRawConfig(config: object): config is RawConfig {
	let seenUrls = false;

	for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
		switch (key) {
			case 'api_tokens': {
				if (typeof value !== 'object' || value === null) {
					throw new RangeError('Expected api_tokens to be an object');
				}

				const platforms = new Set(Object.keys(value));

				for (const platform of platforms) {
					if (!supportedPlatforms.has(platform)) {
						throw new RangeError(`Unsupported platform ${platform}`);
					}
				}

				break;
			}

			case 'urls':
				if (!Array.isArray(value)) {
					throw new RangeError('Expected urls to be an array');
				}

				for (const url of value) {
					if (typeof url !== 'string') {
						throw new RangeError(`Expected URL ${String(url)} to be a string`);
					}

					try {
						// eslint-disable-next-line no-new
						new URL(url);
					} catch {
						throw new RangeError(`Expected URL ${url} to be a valid URL`);
					}
				}

				seenUrls = true;
				break;
			default:
				throw new RangeError(`Unknown value ${key}`);
		}
	}

	if (!seenUrls) {
		throw new RangeError('Required value urls was missing');
	}

	return true;
}
