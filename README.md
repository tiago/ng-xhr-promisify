# ng-xhr-promisify
[![license](https://img.shields.io/github/license/tiago/ng-xhr-promisify.svg?maxAge=86400&style=flat-square)](LICENSE.md)
[![release](https://img.shields.io/github/release/tiago/ng-xhr-promisify.svg?maxAge=86400&style=flat-square)](https://github.com/tiago/ng-xhr-promisify/releases/latest)

Wrap XMLHttpRequest in an angular $http-like promise.

## Installation
Directly from [npmcdn](https://npmcdn.com):
```html
<script src="https://npmcdn.com/ng-xhr-promisify@latest/dist/ng-xhr-promisify.min.js"></script>
```
With [npm](https://www.npmjs.com/package/ng-xhr-promisify):
```sh
bower install --save ng-xhr-promisify
```
With [bower](https://bower.io):
```sh
npm install --save ng-xhr-promisify
```

## Usage
```js
import angular from 'angular';
import ngXhrPromisify from 'ng-xhr-promisify';

const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.github.com/repos/tiago/ng-xhr-promisify', true);
xhr.responseType = 'json';
xhr.send();

angular.module('App', [
  ngXhrPromisify
]).run(function (xhrPromisify) {
  xhrPromisify(xhr).then(response => {
    console.log(`${response.data.name}: ${response.data.description}`);
  }).catch(error => {
    console.log(`Error: ${error.status}`);
  }).finally(() => {
    console.log('Bye!');
  });
});
```
