import {readFile} from 'fs/promises';

/**
 * Matches LF or CRLF line endings.
 */
const newLines = /\r\n|\n/g;
/** Characters that should be considered empty. */
const emptyCharacters = new Set(['\r\n', '\n', '']);

/**
 * Get an array of each line of a file.
 * Lines that are empty or start with a `#` will be removed from the output.
 * @param file File to read
 */
export async function readLines(file: string, encoding: BufferEncoding = 'utf-8'): Promise<string[]> {
	const contents = await readFile(file, encoding);

	const lines = contents.split(newLines);

	// Remove empty lines and lines starting with `#`
	return lines.filter(line => !emptyCharacters.has(line) && !line.startsWith('#'));
}
