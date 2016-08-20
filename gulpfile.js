/*eslint-env node*/
const fs = require('fs');
const gulp = require('gulp');
const util = require('gulp-util');
const eslint = require('gulp-eslint');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const bump = require('gulp-bump');
const inquirer = require('inquirer');
const source = require('vinyl-source-stream');
const rollup = require('rollup-stream');
const buble = require('rollup-plugin-buble');
const del = require('del');
const sequence = require('run-sequence');
const semver = require('semver');
const es = require('event-stream');
const shell = require('shelljs');

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

gulp.task('release:check', (callback) => {
  const branch = shell.exec('git rev-parse --abbrev-ref HEAD', { silent: true }).stdout.trim();
  if (branch !== 'master') {
    const red = util.colors.red;
    console.log(red('Switch to'), red.bold('master'), red('branch before continuing.'));
    process.exit(1);
  }

  const changes = shell.exec('git status --untracked-files=no --porcelain', { silent: true }).stdout.trim();
  if (changes) {
    console.log(util.colors.red('You have unstaged or uncommitted changes. Commit or stash before continuing.'));
    process.exit(1);
  }

  callback();
});

function bumpPackage(version) {
  return gulp.src('package.json')
    .pipe(bump({ version: version }))
    .pipe(gulp.dest('.'))
    .on('end', () => pkg.version = version);
}

function bumpChangeLog(version, previous) {
  const date = new Date().toISOString().slice(0, 10);
  const repo = pkg.repository.url.replace(/\.git$/, '');
  const entry = `## [${version}] \\(${date}\\)\n- TODO`;
  const link = `[${version}]: ${repo}/compare/v${previous}...v${version}`;

  return gulp.src('CHANGELOG.md')
    .pipe(es.map((file, callback) => {
      const changelog = file.contents.toString()
        .replace('# Change Log', `$&\n\n${entry}`)
        .concat(`${link}\n`);

      file.contents = new Buffer(changelog);
      callback(null, file);
    }))
    .pipe(gulp.dest('.'));
}

gulp.task('release:bump', () => {
  const choices = ['patch', 'minor', 'major'].map(type => {
    const version = semver.inc(pkg.version, type);
    return { name: `${type} (${version})`, value: version, short: type };
  });

  return inquirer.prompt({
    type: 'list',
    name: 'bump',
    message: 'Release type',
    choices: choices
  }).then(choice => {
    return new Promise((resolve, reject) => {
      es.merge(
        bumpPackage(choice.bump),
        bumpChangeLog(choice.bump, pkg.version)
      ).on('end', resolve);
    });
  });
});

gulp.task('release:changelog', () => {
  return inquirer.prompt({
    type: 'list',
    name: 'changelog',
    message: 'Edit CHANGELOG.md before continuing',
    choices: [{ name: `Release ${pkg.version}`, value: null, short: ' ' }]
  });
});

gulp.task('release:commit', (callback) => {
  const commands = [
    'git add -f package.json CHANGELOG.md',
    `git commit -m '${pkg.version}'`,
    'git checkout --detach',
    `git add -f ${paths.dist}`,
    `git commit -m '${pkg.version}'`,
    `git tag -f v${pkg.version}`,
    'git checkout master'
  ];

  commands.forEach(cmd => {
    const result = shell.exec(cmd, { silent: true });
    if (result.code !== 0) {
      console.log(util.colors.red(result.stderr.trim()));
      process.exit(1);
    }
  });

  callback();
});

gulp.task('release:publish', (callback) => {
  const commands = [
    `git push origin master v${pkg.version}`,
    `git checkout v${pkg.version}`,
    'npm publish',
    `git checkout master`
  ];

  inquirer.prompt({
    type: 'confirm',
    name: 'publish',
    message: `Publish ${pkg.version}`,
    default: false
  }).then(choice => {
    if(choice.publish) {
      commands.forEach(cmd => {
        const result = shell.exec(cmd, { silent: true });
        if (result.code !== 0) {
          console.log(util.colors.red(result.stderr.trim()));
          process.exit(1);
        }
      });
    }
    callback();
  });
});

gulp.task('release', (callback) => {
  sequence(
    'release:check',
    'release:bump',
    'build',
    'release:changelog',
    'release:commit',
    'release:publish',
    callback
  );
});

gulp.task('default', ['build']);
