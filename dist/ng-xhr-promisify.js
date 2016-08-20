/*! ng-xhr-promisify v1.1.0 | MIT License | https://github.com/tiago/ng-xhr-promisify */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('angular')) :
  typeof define === 'function' && define.amd ? define(['angular'], factory) :
  (global.ngXhrPromisify = factory(global.angular));
}(this, (function (angular) { 'use strict';

angular = 'default' in angular ? angular['default'] : angular;

function xhrPromisifyFactory($q) {
  function parseResponseHeaders(responseHeaders) {
    // xhr.spec.whatwg.org/#the-getallresponseheaders()-method
    return responseHeaders.split('\x0d\x0a').reduce(function (headers, str) {
      var index = str.indexOf('\x3a\x20');
      if (index > 0) {
        var name = str.substring(0, index).trim().toLowerCase();
        var value = str.substring(index + 2).trim();
        headers[name] = value;
      }
      return headers;
    }, Object.create(null));
  }

  function createHeadersGetter(xhr) {
    var responseHeaders = xhr.getAllResponseHeaders() || '';
    var headers = parseResponseHeaders(responseHeaders);
    return function (name) {
      if (!name) {
        return headers;
      }
      name = name.toLowerCase();
      return name in headers ? headers[name] : null;
    };
  }

  function getResponse(xhr) {
    return 'response' in xhr ? xhr.response :
      typeof xhr.responseText === 'string' ? xhr.responseText : // IE9
        null;
  }

  function parseResponseData(xhr, headers) {
    var data = getResponse(xhr);
    var jsonMIME = (/application\/json/i).test(headers('Content-Type'));
    if (jsonMIME && typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = null;
      }
    }
    return data;
  }

  function getStatusCode(xhr) {
    var statusCode = xhr.status;
    var response = getResponse(xhr);
    var headers = xhr.getAllResponseHeaders();
    // error
    if (statusCode === 0 && !response && !headers && !xhr.statusText) {
      statusCode = -1;
    }
    // IE bug
    if (statusCode === 1223) {
      statusCode = 204;
    }
    // handle 0 status on file protocol
    if (statusCode === 0) {
      var fileProtocol = xhr.responseURL.slice(0, 7) === 'file://';
      statusCode = response ? 200 : fileProtocol ? 404 : 0;
    }
    return statusCode;
  }

  function createResponse(xhr) {
    var headers = createHeadersGetter(xhr);
    var data = parseResponseData(xhr, headers);
    var status = getStatusCode(xhr);
    var statusText = xhr.statusText || '';
    return { headers: headers, data: data, status: status, statusText: statusText };
  }

  function promisify(xhr) {
    if (!(xhr instanceof XMLHttpRequest)) {
      return $q.reject('Invalid XMLHttpRequest object').catch(function (err) {
        throw new TypeError(err);
      });
    }

    var deferred = $q.defer();
    function onXhrDone() {
      var response = createResponse(xhr);
      if (response.status >= 200 && response.status < 300) {
        deferred.resolve(response);
      } else {
        deferred.reject(response);
      }
      xhr.removeEventListener('loadend', onXhrDone);
    }
    if (xhr.readyState === 4 || xhr.readyState === 0) {
      onXhrDone();
    } else {
      xhr.addEventListener('loadend', onXhrDone);
    }
    return deferred.promise;
  }

  return promisify;
}
xhrPromisifyFactory.$inject = ['$q'];

var index = angular.module('ngXhrPromisify', ['ng'])
  .factory('xhrPromisify', xhrPromisifyFactory)
  .name;

return index;

})));