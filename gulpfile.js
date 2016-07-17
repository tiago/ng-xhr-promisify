/*eslint-env node*/
const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const eslint = require('gulp-eslint');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const rollup = require('rollup-stream');
const buble = require('rollup-plugin-buble');
const del = require('del');
const sequence = require('run-sequence');

const pkg = JSON.parse(fs.readFileSync('./package.json'));
const dependencies = Object.keys(pkg.dependencies);
const banner = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License | ${pkg.homepage} */\n`;
const moduleName = 'ngXhrPromisify';

function bundle(format) {
  return rollup({
    entry: 'src/index.js',
    plugins: [ buble() ],
    external: dependencies,
    moduleName: moduleName,
    banner: banner,
    sourceMap: false,
    format: format || 'umd'
  });
}

gulp.task('bundle:es', () => {
  const target = pkg['jsnext:main'];
  const file = path.basename(target);
  const dir = path.dirname(target);
  return bundle('es')
    .pipe(source(file))
    .pipe(gulp.dest(dir));
});

gulp.task('bundle:umd', () => {
  const target = pkg['main'];
  const file = path.basename(target);
  const dir = path.dirname(target);
  return bundle('umd')
    .pipe(source(file))
    .pipe(gulp.dest(dir))
    .pipe(buffer())
    .pipe(sourcemaps.init())
    .pipe(uglify({ preserveComments: 'license' }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(sourcemaps.write('.', {
      includeContent: false,
      mapFile: name => name.replace(/\.js\.map$/, '.map')
    }))
    .pipe(gulp.dest(dir));
});

gulp.task('lint', () => {
  return gulp.src('src/**/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('clean', () => {
  return del('dist');
});

gulp.task('bundle', ['bundle:es', 'bundle:umd']);

gulp.task('build', (callback) => {
  sequence('lint', 'clean', 'bundle', callback);
});

gulp.task('default', ['build']);
