import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import enhancedResolve from 'enhanced-resolve';
import postcss from 'postcss';
import _import from 'postcss-import';
import allSettled from '@ungap/promise-all-settled';

export default () => {
	const resolve = promisify(
		enhancedResolve.create({
			extensions: ['.scss', '.css'],
			conditionNames: [
				'sass',
				'style',
				'browser',
				'import',
				'require',
				'node'
			],
			mainFields: ['style', 'browser', 'module', 'main'],
			mainFiles: ['_index', 'index'],
			modules: ['node_modules']
		})
	);

	const cssProcessor = postcss([_import()]);

	async function asyncFunction(includePaths, url, previous, done) {
		let filePath = null;
		try {
			if (previous === 'stdin') {
				const filePaths = await allSettled.call(
					Promise,
					includePaths.map((includePath) => resolve(includePath, url))
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

	return function (...arguments_) {
		const { includePaths } = this.options;
		const parsedIncludePaths = includePaths.split(':');
		asyncFunction(parsedIncludePaths, ...arguments_);
	};
};
