import assert from 'assert';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import sass from 'sass';
import Fiber from 'fibers';
import resolver from '../index';

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
