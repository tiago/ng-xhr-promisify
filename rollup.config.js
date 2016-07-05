import fs from 'fs';
import buble from 'rollup-plugin-buble';

const pkg = JSON.parse(fs.readFileSync('./package.json'));
const external = Object.keys(pkg.dependencies);

export default {
  entry: 'src/index.js',
  plugins: [
    buble()
  ],
  external: external,
  globals: { },
  moduleName: 'ngXhrPromisify',
  banner: `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License | ${pkg.homepage} */\n`,
  targets: [
    { dest: pkg['main'], format: 'umd' },
    { dest: pkg['jsnext:main'], format: 'es' }
  ],
  sourceMap: false
};
