/*! ng-xhr-promisify v1.1.4 | MIT License | https://github.com/tiago/ng-xhr-promisify */

import angular from 'angular';

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

    var state = { UNSENT: 0, DONE: 4 };
    var deferred = $q.defer();

    function onChange() {
      if (xhr.readyState !== state.DONE) return;

      var response = createResponse(xhr);
      if (response.status >= 200 && response.status < 300) {
        deferred.resolve(response);
      } else {
        deferred.reject(response);
      }
      xhr.removeEventListener('readystatechange', onChange);
    }

    if (xhr.readyState === state.DONE || xhr.readyState === state.UNSENT) {
      onChange();
    } else {
      xhr.addEventListener('readystatechange', onChange);
    }

    return deferred.promise;
  }

  return promisify;
}
xhrPromisifyFactory.$inject = ['$q'];

var index = angular.module('ngXhrPromisify', ['ng'])
  .factory('xhrPromisify', xhrPromisifyFactory)
  .name;

export default index;
