import assert from 'assert';
import { promisify } from 'util';
import _fs, { promises as fs } from 'fs';
import path from 'path';
import sass from 'sass';
import Fiber from 'fibers';
import resolver from '../index';

describe('Async', function () {
	it('should handle modules from input file', async function () {
		const [expected, actual] = await Promise.all([
			fs.readFile(
				path.resolve(__dirname, 'fixtures/index.expected.css'),
				'utf8'
			),
			promisify(sass.render)({
				file: path.resolve(__dirname, 'fixtures/index.scss'),
				fiber: Fiber,
				importer: [resolver()]
			})
		]);
		assert.equal(expected.trim(), actual.css.toString().trim());
	});

	it('should handle modules from input string', async function () {
		const input = await fs.readFile(
			path.resolve(__dirname, 'fixtures/index.scss'),
			'utf8'
		);
		const [expected, actual] = await Promise.all([
			fs.readFile(
				path.resolve(__dirname, 'fixtures/index.expected.css'),
				'utf8'
			),
			promisify(sass.render)({
				data: input,
				fiber: Fiber,
				importer: [resolver()],
				includePaths: [path.resolve(__dirname, 'fixtures')]
			})
		]);
		assert.equal(expected.trim(), actual.css.toString().trim());
	});
});

describe('Sync', function () {
	it('should handle modules from input file', function () {
		const [expected, actual] = [
			_fs.readFileSync(
				path.resolve(__dirname, 'fixtures/index.expected.css'),
				'utf8'
			),
			sass.renderSync({
				file: path.resolve(__dirname, 'fixtures/index.scss'),
				importer: [resolver().sync]
			})
		];
		assert.equal(expected.trim(), actual.css.toString().trim());
	});

	it('should handle modules from input string', function () {
		const input = _fs.readFileSync(
			path.resolve(__dirname, 'fixtures/index.scss'),
			'utf8'
		);
		const [expected, actual] = [
			_fs.readFileSync(
				path.resolve(__dirname, 'fixtures/index.expected.css'),
				'utf8'
			),
			sass.renderSync({
				data: input,
				importer: [resolver().sync],
				includePaths: [path.resolve(__dirname, 'fixtures')]
			})
		];
		assert.equal(expected.trim(), actual.css.toString().trim());
	});
});
