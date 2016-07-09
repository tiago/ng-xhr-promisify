# ng-xhr-promisify

Wrap XMLHttpRequest in an angular $http-like promise

## Installation
Get it directly from [npmcdn](https://npmcdn.com):
```html
<script src="https://npmcdn.com/ng-xhr-promisify@latest/dist/ng-xhr-promisify.js"></script>
```
With [bower](https://bower.io):
```sh
npm install --save ng-xhr-promisify
```
With [npm](https://www.npmjs.com/package/ng-xhr-promisify):
```sh
bower install --save ng-xhr-promisify
```

## Example
```js
import angular from 'angular';
import ngXhrPromisify from 'ng-xhr-promisify';

let xhr = new XMLHttpRequest();
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
