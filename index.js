/* eslint-disable jsdoc/no-undefined-types */

import _fs, { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import enhancedResolve from 'enhanced-resolve';
import postcss from 'postcss';
import _import from 'postcss-import';
// @ts-ignore
import _importSync from 'postcss-import-sync2';
// @ts-ignore
import allSettled from '@ungap/promise-all-settled';

/**
 * @typedef {import('sass').ImporterReturnType} sass.ImporterReturnType
 * @typedef {import('sass').Options} sass.Options
 */

/**
 * @typedef {(
 *   this: { fromImport: boolean, options: { includePaths: string } },
 *   url: string,
 *   prev: string,
 *   done?: (data: sass.ImporterReturnType) => void,
 *  ) => sass.ImporterReturnType | void} Importer
 */

/**
 * @typedef {({status: 'fulfilled', value: any, reason?: undefined}|{status: 'rejected', reason: unknown, value?: undefined})} SettledResult
 */

/**
 * @param   {Function[]}      tasks
 *
 * @returns {SettledResult[]}
 */
function allSettledSync(tasks) {
	return tasks.map((task) => {
		try {
			return { status: 'fulfilled', value: task() };
		} catch (/** @type {any} */ error_) {
			/** @type {Error} */
			const error = error_;
			return { status: 'rejected', reason: error };
		}
	});
}

function createResolvers(sync = false) {
	const { extensions, conditionNames, mainFiles, ...resolveOptions } = {
		extensions: ['.css'],
		conditionNames: ['style', 'browser', 'import', 'require', 'node'],
		mainFields: ['style', 'browser', 'module', 'main'],
		mainFiles: ['index'],
		modules: ['node_modules']
	};

	const createResolveOptions = {
		extensions: ['.scss', ...extensions],
		conditionNames: ['sass', ...conditionNames],
		mainFiles: ['_index', ...mainFiles],
		...resolveOptions
	};

	const createGenericResolveOptions = {
		extensions,
		conditionNames,
		mainFiles,
		...resolveOptions
	};

	if (sync) {
		const resolve = enhancedResolve.create.sync(createResolveOptions);
		const genericResolve = enhancedResolve.create.sync(
			createGenericResolveOptions
		);
		const cssProcessor = postcss([
			_importSync({
				resolve: (
					/** @type {string} */ id,
					/** @type {string} */ basedir
				) => genericResolve(basedir, id)
			})
		]);

		return {
			resolve,
			genericResolve,
			cssProcessor
		};
	}

	/** @type {(basedir: string, id: string) => Promise<string>} */
	const resolve = promisify(enhancedResolve.create(createResolveOptions));
	/** @type {(basedir: string, id: string) => Promise<string>} */
	const genericResolve = promisify(
		enhancedResolve.create(createGenericResolveOptions)
	);
	// @ts-ignore
	const cssProcessor = postcss([
		_import({
			resolve: (id, basedir) => genericResolve(basedir, id)
		})
	]);

	return {
		resolve,
		cssProcessor
	};
}

/**
 * Sass importer to import Sass modules using (enhanced) Node resolve.
 */
function api() {
	const { resolve, cssProcessor } = createResolvers();
	const { resolve: resolveSync, cssProcessor: cssProcessorSync } =
		createResolvers(true);

	/**
	 * @param {string} includePaths
	 */
	function asyncFunction(includePaths) {
		/** @type {Importer} */
		return async function (url, previous, _done) {
			const done = typeof _done !== 'undefined' ? _done : () => {};
			/** @type {string?} */
			let filePath = null;
			try {
				if (previous === 'stdin') {
					/** @type {SettledResult[]} */
					const filePaths = await allSettled.call(
						Promise,
						includePaths
							.split(':')
							.map((includePath) =>
								path.isAbsolute(includePath)
									? includePath
									: path.resolve(process.cwd(), includePath)
							)
							.map((includePath) => resolve(includePath, url))
					);
					const foundFilePath = filePaths.find(
						({ status }) => status === 'fulfilled'
					);
					filePath =
						typeof foundFilePath !== 'undefined'
							? foundFilePath.value
							: null;
				} else {
					const foundFilePath = await resolve(
						path.dirname(previous),
						url
					);
					filePath = foundFilePath || null;
				}
			} catch (error) {
				/* istanbul ignore next */
				filePath = null;
			}

			/* istanbul ignore next */
			if (filePath === null) {
				done(null);
				return;
			}

			if (path.extname(filePath) !== '.css') {
				done({ file: filePath });
				return;
			}

			const css = await fs.readFile(filePath, 'utf8');

			if (!css.includes('@import')) {
				done({ file: filePath });
				return;
			}

			try {
				const result = await cssProcessor.process(css, {
					from: filePath
				});
				done({ contents: result.css });
			} catch (/** @type {any} */ error_) {
				/** @type {Error} */
				const error = error_;
				/* istanbul ignore next */
				done(error);
			}
		};
	}

	/**
	 * @param {string} includePaths
	 */
	function syncFunction(includePaths) {
		/** @type {Importer} */
		return function (url, previous) {
			/** @type {string?} */
			let filePath = null;
			try {
				if (previous === 'stdin') {
					const filePaths = allSettledSync.call(
						null,
						includePaths
							.split(':')
							.map((includePath) =>
								path.isAbsolute(includePath)
									? includePath
									: path.resolve(process.cwd(), includePath)
							)
							.map(
								(includePath) => () =>
									resolveSync(includePath, url)
							)
					);
					const foundFilePath = filePaths.find(
						({ status }) => status === 'fulfilled'
					);
					filePath =
						typeof foundFilePath !== 'undefined'
							? foundFilePath.value
							: null;
				} else {
					const foundFilePath = resolveSync(
						path.dirname(previous),
						url
					);
					// @ts-ignore
					filePath = foundFilePath || null;
				}
			} catch (error) {
				/* istanbul ignore next */
				filePath = null;
			}

			/* istanbul ignore next */
			if (filePath === null) {
				return null;
			}

			if (path.extname(filePath) !== '.css') {
				return { file: filePath };
			}

			const css = _fs.readFileSync(filePath, 'utf8');

			if (!css.includes('@import')) {
				return { file: filePath };
			}

			try {
				const result = cssProcessorSync.process(css, {
					from: filePath
				});
				return { contents: result.css };
			} catch (/** @type {any} */ error_) {
				/** @type {Error} */
				const error = error_;
				/* istanbul ignore next */
				return error;
			}
		};
	}

	/**
	 * @type {Importer}
	 */
	function main(...arguments_) {
		const { includePaths } = this.options;
		const [url, previous, done] = arguments_;
		asyncFunction(includePaths).apply(this, [url, previous, done]);
	}
	/**
	 * @type {Importer}
	 */
	function sync(...arguments_) {
		const { includePaths } = this.options;
		const [url, previous] = arguments_;
		return syncFunction(includePaths).apply(this, [url, previous]);
	}

	/**
	 * Sass importer to import Sass modules using (enhanced) Node resolve. Synchronous version.
	 */
	main.sync = sync;

	return main;
}

export default api;
