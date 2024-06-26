![Deprecated project](https://img.shields.io/badge/status-deprecated-red.svg)

**This project is deprecated.**

Same feature can be achieved with [official Node package importer](https://sass-lang.com/documentation/js-api/classes/nodepackageimporter/).

---

# sass-module-resolve-importer

[![Build Status][ci-img]][ci]

Import Sass modules using
[(enhanced) Node resolve](https://github.com/webpack/enhanced-resolve).

This allows you to load Sass modules which are installed through npm and are
located in `node_modules`.

Resolver will look for modules using following `package.json` fields:

-   `exports.sass`
-   `exports.style`
-   `exports.browser`
-   `exports.import`
-   `exports.require`
-   `exports.node`
-   `style`
-   `browser`
-   `module`
-   `main`

⚠️ If found module is CSS file (has `.css` extension) and contains `@import`
directives, it will be processed with [PostCSS](https://postcss.org/) and
[`postcss-import`](https://github.com/postcss/postcss-import) plugin
([`postcss-import-sync2`](https://github.com/longlho/postcss-import-sync2) for
synchronous mode). This is intentional since imports in classic CSS files can be
handled in various ways, and Sass has rules for
[importing CSS](https://sass-lang.com/documentation/at-rules/import#importing-css)
and
[plain CSS `@import`s](https://sass-lang.com/documentation/at-rules/import#plain-css-imports).
You can avoid this behavior by using classic `@import url(…)`.

## Install

```sh
npm install sass-module-resolve-importer --save
```

## Usage

```js
import sass from 'sass';
import resolver from 'sass-module-resolve-importer';

sass.render({
	// …
	importer: [resolver()]
});
```

## API

### resolver()

Returns: [`sass.Importer`][type-importer]

[Sass importer function](https://github.com/sass/node-sass#importer--v200---experimental).

### resolver().sync

Returns: [`sass.Importer`][type-importer]

Synchronous
[Sass importer function](https://github.com/sass/node-sass#importer--v200---experimental).

## License

MIT © [Ivan Nikolić](http://ivannikolic.com)

<!-- prettier-ignore-start -->

[ci]: https://github.com/niksy/sass-module-resolve-importer/actions?query=workflow%3ACI
[ci-img]: https://github.com/niksy/sass-module-resolve-importer/workflows/CI/badge.svg?branch=master
[type-importer]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/sass/index.d.ts#L15-L20

<!-- prettier-ignore-end -->
