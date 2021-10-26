# Bootleg

[![Build Status](https://github.com/jonahsnider/bootleg/workflows/CI/badge.svg)](https://github.com/jonahsnider/bootleg/actions)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)
[![codecov](https://codecov.io/gh/jonahsnider/bootleg/branch/master/graph/badge.svg)](https://codecov.io/gh/jonahsnider/bootleg)

Download media from social media.

## Project scope

The goal is for Bootleg to be a very fast and simple to use downloader application.
Most alternatives download content by scraping websites.
This is very inefficient and is prone to breaking if the website layout changes.
Instead, Bootleg uses official APIs to query for exactly what needs to be downloaded.

## Supported services

- Instagram (only posts)

## Prequisites

This project uses a current LTS release of [Node.js](https://nodejs.org) to run.

This project uses [Yarn](https://yarnpkg.com) to install dependencies, although you can use another package manager like [npm](https://www.npmjs.com) or [pnpm](https://pnpm.js.org).

```sh
yarn install
# or `npm install`
# or `pnpm install`
```

## Building

Run the `build` script to compile the TypeScript into the `tsc_output` folder.
This will compile the `src` and the `test` directory, so be careful not to upload the whole folder as a published package.

## Style

This project uses [Prettier](https://prettier.io) and [XO](https://github.com/xojs/xo).

You can run Prettier in the project with this command:

```sh
yarn run style
```

You can run XO with this command:

```sh
yarn run lint
```

Note that XO will also error if you have TypeScript errors, not just if your formatting is incorrect.

## Linting

This project uses [XO](https://github.com/xojs/xo) (which uses [ESLint](https://eslint.org) and some plugins internally) to perform static analysis on the TypeScript.
It reports things like unused variables or not following code conventions.

```sh
yarn run lint
```

Note that XO will also error if you have incorrect formatting, not just if your TypeScript code has errors.

## Testing

Unit tests are written alongside the files they are testing.
You can run the tests with the `test` script:

```sh
yarn run test
```

### Coverage

This will generate a `coverage` folder which has a breakdown of coverage of the project.
The CI will upload the coverage information to [CodeCov](https://codecov.io) which can be [viewed here](https://codecov.io/gh/jonahsnider/bootleg).
