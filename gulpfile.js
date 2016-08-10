/*eslint-env node*/
const fs = require('fs');
const gulp = require('gulp');
const eslint = require('gulp-eslint');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const source = require('vinyl-source-stream');
const rollup = require('rollup-stream');
const buble = require('rollup-plugin-buble');
const del = require('del');
const sequence = require('run-sequence');

const pkg = JSON.parse(fs.readFileSync('package.json'));
const paths = {
  src: 'src',
  dist: 'dist',
  main: pkg['main'],
  esmain: pkg['jsnext:main']
};

function bundle(format) {
  const banner = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License | ${pkg.homepage} */\n`;
  const moduleName = 'ngXhrPromisify';

  return rollup({
    entry: `${paths.src}/index.js`,
    plugins: [ buble() ],
    external: [ 'angular' ],
    globals: { 'angular': 'angular' },
    moduleName: moduleName,
    banner: banner,
    sourceMap: false,
    format: format || 'umd'
  });
}

gulp.task('bundle:es', () => {
  return bundle('es')
    .pipe(source(paths.esmain))
    .pipe(gulp.dest('.'));
});

gulp.task('bundle:umd', () => {
  return bundle('umd')
    .pipe(source(paths.main))
    .pipe(gulp.dest('.'));
});

gulp.task('minify:umd', () => {
  gulp.src(paths.main)
    .pipe(sourcemaps.init())
    .pipe(uglify({ preserveComments: 'license' }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(sourcemaps.write('.', {
      includeContent: false,
      mapFile: name => name.replace(/\.js\.map$/, '.map')
    }))
    .pipe(gulp.dest(paths.dist));
});

gulp.task('lint', () => {
  return gulp.src(`${paths.src}/**/*.js`)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('clean', () => {
  return del(paths.dist);
});

gulp.task('build', (callback) => {
  sequence('lint', 'clean', ['bundle:es', 'bundle:umd'], 'minify:umd', callback);
});

gulp.task('default', ['build']);
