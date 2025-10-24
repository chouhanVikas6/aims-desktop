// polyfills.js - Provides polyfills for Node.js APIs that might be missing in packaged environments

// Crypto polyfill
if (typeof global.crypto === 'undefined') {
  const crypto = require('crypto');
  global.crypto = {
    getRandomValues: function(buffer) {
      return crypto.randomFillSync(buffer);
    },
    randomUUID: function() {
      return crypto.randomUUID();
    },
    subtle: {}
  };
  console.log('Added crypto polyfill');
}

// Web API polyfills for Next.js
if (typeof global.Request === 'undefined') {
  class Request {
    constructor(input, init) {
      this.url = input;
      this.method = (init && init.method) || 'GET';
      this.headers = (init && init.headers) || {};
      this.body = (init && init.body) || null;
    }
  }
  
  class Response {
    constructor(body, init) {
      this.body = body;
      this.status = (init && init.status) || 200;
      this.statusText = (init && init.statusText) || '';
      this.headers = (init && init.headers) || {};
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
    
    text() {
      return Promise.resolve(this.body);
    }
  }
  
  class Headers {
    constructor(init) {
      this._headers = {};
      if (init) {
        Object.keys(init).forEach(key => {
          this._headers[key.toLowerCase()] = init[key];
        });
      }
    }
    
    get(name) {
      return this._headers[name.toLowerCase()];
    }
    
    set(name, value) {
      this._headers[name.toLowerCase()] = value;
    }
    
    has(name) {
      return !!this._headers[name.toLowerCase()];
    }
  }
  
  global.Request = Request;
  global.Response = Response;
  global.Headers = Headers;
  console.log('Added Web API polyfills');
}

module.exports = {
  // Export any utilities if needed
};
