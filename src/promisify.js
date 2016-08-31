export default function xhrPromisifyFactory($q) {
  function parseResponseHeaders(responseHeaders) {
    // xhr.spec.whatwg.org/#the-getallresponseheaders()-method
    return responseHeaders.split('\x0d\x0a').reduce((headers, str) => {
      const index = str.indexOf('\x3a\x20');
      if (index > 0) {
        const name = str.substring(0, index).trim().toLowerCase();
        const value = str.substring(index + 2).trim();
        headers[name] = value;
      }
      return headers;
    }, Object.create(null));
  }

  function createHeadersGetter(xhr) {
    const responseHeaders = xhr.getAllResponseHeaders() || '';
    const headers = parseResponseHeaders(responseHeaders);
    return (name) => {
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
    let data = getResponse(xhr);
    const jsonMIME = (/application\/json/i).test(headers('Content-Type'));
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
    let statusCode = xhr.status;
    const response = getResponse(xhr);
    const headers = xhr.getAllResponseHeaders();
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
      const fileProtocol = xhr.responseURL.slice(0, 7) === 'file://';
      statusCode = response ? 200 : fileProtocol ? 404 : 0;
    }
    return statusCode;
  }

  function createResponse(xhr) {
    const headers = createHeadersGetter(xhr);
    const data = parseResponseData(xhr, headers);
    const status = getStatusCode(xhr);
    const statusText = xhr.statusText || '';
    return { headers, data, status, statusText };
  }

  function promisify(xhr) {
    if (!(xhr instanceof XMLHttpRequest)) {
      return $q.reject('Invalid XMLHttpRequest object').catch(err => {
        throw new TypeError(err);
      });
    }

    const deferred = $q.defer();

    function onChange() {
      if (xhr.readyState !== 4) return;

      const response = createResponse(xhr);
      if (response.status >= 200 && response.status < 300) {
        deferred.resolve(response);
      } else {
        deferred.reject(response);
      }
      xhr.removeEventListener('readystatechange', onChange);
    }

    if (xhr.readyState === 4 || xhr.readyState === 0) {
      onChange();
    } else {
      xhr.addEventListener('readystatechange', onChange);
    }

    return deferred.promise;
  }

  return promisify;
}
xhrPromisifyFactory.$inject = ['$q'];
