import _fs, { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import enhancedResolve from 'enhanced-resolve';
import postcss from 'postcss';
import _import from 'postcss-import';
import _importSync from 'postcss-import-sync2';
import allSettled from '@ungap/promise-all-settled';

function allSettledSync(tasks) {
	return tasks.map((task) => {
		try {
			return { status: 'fulfilled', value: task() };
		} catch (error) {
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

	let resolve, genericResolve, cssProcessor;

	if (sync) {
		resolve = enhancedResolve.create.sync(createResolveOptions);
		genericResolve = enhancedResolve.create.sync(
			createGenericResolveOptions
		);
		cssProcessor = postcss([
			_importSync({
				resolve: (id, basedir) => genericResolve(basedir, id)
			})
		]);
	} else {
		resolve = promisify(enhancedResolve.create(createResolveOptions));
		genericResolve = promisify(
			enhancedResolve.create(createGenericResolveOptions)
		);
		cssProcessor = postcss([
			_import({
				resolve: (id, basedir) => genericResolve(basedir, id)
			})
		]);
	}

	return {
		resolve,
		genericResolve,
		cssProcessor
	};
}

export default () => {
	const { resolve, genericResolve, cssProcessor } = createResolvers();
	const {
		resolve: resolveSync,
		genericResolve: genericResolveSync,
		cssProcessor: cssProcessorSync
	} = createResolvers(true);

	async function asyncFunction(includePaths, url, previous, done) {
		let filePath = null;
		try {
			if (previous === 'stdin') {
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
				filePath = filePaths.find(
					({ status }) => status === 'fulfilled'
				);
				filePath =
					typeof filePath !== 'undefined' ? filePath.value : null;
			} else {
				filePath = await resolve(path.dirname(previous), url);
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
		} catch (error) {
			/* istanbul ignore next */
			done(error);
		}
	}

	function syncFunction(includePaths, url, previous) {
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
							(includePath) => () => resolveSync(includePath, url)
						)
				);
				filePath = filePaths.find(
					({ status }) => status === 'fulfilled'
				);
				filePath =
					typeof filePath !== 'undefined' ? filePath.value : null;
			} else {
				filePath = resolveSync(path.dirname(previous), url);
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
		} catch (error) {
			/* istanbul ignore next */
			return error;
		}
	}

	function main(...arguments_) {
		const { includePaths } = this.options;
		asyncFunction(includePaths, ...arguments_);
	}
	main.sync = function (...arguments_) {
		const { includePaths } = this.options;
		return syncFunction(includePaths, ...arguments_);
	};

	return main;
};
