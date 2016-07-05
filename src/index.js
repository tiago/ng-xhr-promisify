import angular from 'angular';
import promisifyFactory from './promisify';

export default angular.module('ngXhrPromisify', ['ng'])
  .factory('xhrPromisify', promisifyFactory)
  .name;
