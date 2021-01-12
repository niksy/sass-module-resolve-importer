import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import enhancedResolve from 'enhanced-resolve';
import postcss from 'postcss';
import _import from 'postcss-import';

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

	async function asyncFunction(url, previous, done) {
		let filePath = null;
		try {
			filePath = await resolve(path.dirname(previous), url);
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

	return (...arguments_) => {
		asyncFunction(...arguments_);
	};
};
