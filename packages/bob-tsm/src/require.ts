// CREDITS TO lukeed https://github.com/lukeed/tsm

import { extname } from 'path';
import { readFileSync } from 'fs';
import { defaults, finalize } from './utils';

import type { Config, Extension, Options } from './config';

type Module = NodeJS.Module & {
  _compile?(source: string, filename: string): typeof loader;
};

const loadJS = require.extensions['.js'];

let esbuild: typeof import('esbuild');
let env = defaults('cjs');
let uconf = env.file && require(env.file);
let config: Config = finalize(env, uconf);

declare const $$req: NodeJS.Require;
const tsrequire =
  'var $$req=require("module").createRequire(__filename);require=(' +
  function () {
    let { existsSync } = $$req('fs') as typeof import('fs');
    let $url = $$req('url') as typeof import('url');

    return new Proxy(require, {
      // NOTE: only here if source is TS
      apply(req, ctx, args: [id: string]) {
        let [ident] = args;
        if (!ident) return req.apply(ctx || $$req, args);

        // ignore "prefix:" and non-relative identifiers
        if (/^\w+\:?/.test(ident)) return $$req(ident);

        // exit early if no extension provided
        let match = /\.([mc])?js(?=\?|$)/.exec(ident);
        if (match == null) return $$req(ident);

        let base = $url.pathToFileURL(__filename);
        let file = $url.fileURLToPath(new $url.URL(ident, base));
        if (existsSync(file)) return $$req(ident);

        // ?js -> ?ts file
        file = file.replace(new RegExp(match[0] + '$'), match[0]!.replace('js', 'ts'));

        // return the new "[mc]ts" file, or let error
        return existsSync(file) ? $$req(file) : $$req(ident);
      },
    });
  } +
  ')();';

function transform(source: string, options: Options): string {
  esbuild = esbuild || require('esbuild');
  return esbuild.transformSync(source, options).code;
}

function loader(Module: Module, sourcefile: string) {
  let extn = extname(sourcefile) as Extension;
  let options = config[extn] || {};
  let pitch = Module._compile!.bind(Module);
  options.sourcefile = sourcefile;

  if (/\.[mc]?tsx?$/.test(extn)) {
    options.banner = tsrequire + (options.banner || '');
  }

  if (config[extn] != null) {
    Module._compile = source => {
      let result = transform(source, options);
      return pitch(result, sourcefile);
    };
  }

  try {
    return loadJS(Module, sourcefile);
  } catch (err) {
    let ec = err && (err as any).code;
    if (ec !== 'ERR_REQUIRE_ESM') throw err;

    let input = readFileSync(sourcefile, 'utf8');
    let result = transform(input, { ...options, format: 'cjs' });
    return pitch(result, sourcefile);
  }
}

for (let extn in config) {
  require.extensions[extn] = loader;
}

if (config['.js'] == null) {
  require.extensions['.js'] = loader;
}

const prevEmitWarning = process.emitWarning;

process.emitWarning = ((...args: Parameters<typeof prevEmitWarning>) => {
  if (typeof args[0] === 'string' && args[0].startsWith('--experimental-loader is an experimental feature')) return;

  prevEmitWarning(...args);
}) as typeof prevEmitWarning;
