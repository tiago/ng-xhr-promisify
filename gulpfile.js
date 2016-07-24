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

const pkg = JSON.parse(fs.readFileSync('./package.json'));
const config = {
  path: {
    root: '.',
    src: 'src',
    dist: 'dist',
    main: pkg['main'],
    esmain: pkg['jsnext:main']
  }
};

function bundle(format) {
  const dependencies = Object.keys(pkg.dependencies);
  const banner = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License | ${pkg.homepage} */\n`;
  const moduleName = 'ngXhrPromisify';

  return rollup({
    entry: `${config.path.src}/index.js`,
    plugins: [ buble() ],
    external: dependencies,
    moduleName: moduleName,
    banner: banner,
    sourceMap: false,
    format: format || 'umd'
  });
}

gulp.task('bundle:es', () => {
  return bundle('es')
    .pipe(source(config.path.esmain))
    .pipe(gulp.dest(config.path.root));
});

gulp.task('bundle:umd', () => {
  return bundle('umd')
    .pipe(source(config.path.main))
    .pipe(gulp.dest(config.path.root));
});

gulp.task('minify:umd', () => {
  gulp.src(config.path.main)
    .pipe(sourcemaps.init())
    .pipe(uglify({ preserveComments: 'license' }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(sourcemaps.write('.', {
      includeContent: false,
      mapFile: name => name.replace(/\.js\.map$/, '.map')
    }))
    .pipe(gulp.dest(config.path.dist));
});

gulp.task('lint', () => {
  return gulp.src(`${config.path.src}/**/*.js`)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('clean', () => {
  return del(config.path.dist);
});

gulp.task('build', (callback) => {
  sequence('lint', 'clean', ['bundle:es', 'bundle:umd'], 'minify:umd', callback);
});

gulp.task('default', ['build']);
