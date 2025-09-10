export default {
  api: `{
    run: (action, host) => {
      return new Promise((resolve) => {
        const port = browser.runtime.connect({ name: 'action' });
        port.onMessage.addListener(msg => {
          resolve(msg);
        });

        port.postMessage({
          type: 'run',
          host: host,
          action: action,
        });
      });
    },

    getURL: () => {
      return new Promise((resolve) => {
        const port = browser.runtime.connect({ name: 'url' });
        port.onMessage.addListener(url => {
          resolve(url);
        });

        port.postMessage({
          type: 'get',
        });
      });
    },

    setURL: (url) => {
      const port = browser.runtime.connect({ name: 'url' });
      port.postMessage({
        type: 'set',
        url: url,
      });
    },

    getClipboard: () => {
      return new Promise((resolve, reject) => {
        navigator.clipboard.readText().then(text => resolve(text), error => reject(error));
      });
    },

    setClipboard: (text) => {
      return new Promise((resolve, reject) => {
        navigator.clipboard.writeText(text).then(() => resolve(), error => reject(error));
      });
    },

    openTab: (url) => {
      const port = browser.runtime.connect({ name: 'url' });
      port.postMessage({
        type: 'open',
        url: url,
      });
    },

    axios: ['get', 'post', 'put', 'delete', 'head', 'options', 'patch'].reduce((api, method) => {
      api[method] = (url, ...args) => {
        return new Promise((resolve) => {
          const port = browser.runtime.connect({ name: 'axios' });
          port.onMessage.addListener(response => {
            resolve(response);
          });

          port.postMessage({
            type: method,
            url: url,
            args: args,
          });
        });
      };

      return api;
    }, {}),

    mercury: {
      parse: (url, html, args) => {
        return new Promise((resolve) => {
          const port = browser.runtime.connect({ name: 'mercury' });
          const apiArgs = Object.assign({ contentType: 'html' }, args || {});
          port.onMessage.addListener(response => {
            resolve(response);
          });

          port.postMessage({
            type: 'parse',
            url: url,
            html: html,
            ...apiArgs,
          });
        });
      },
    },

    getDOM: () => {
      return new Promise((resolve) => {
        const port = browser.runtime.connect({ name: 'dom' });
        port.onMessage.addListener(dom => {
          dom = (new DOMParser()).parseFromString(dom, 'text/html');
          resolve(dom);
        });

        port.postMessage({
          type: 'get',
        });
      });
    },

    setDOM: (html) => {
      return new Promise((resolve) => {
        const port = browser.runtime.connect({ name: 'dom' });
        port.postMessage({
          type: 'set',
          html: html,
        });
      });
    },

    HTML2DOM: (html, isRoot = false) => {
      const dom = new DOMParser().parseFromString(html, 'text/html').documentElement;
      if (isRoot)
        return dom;
      return dom.getElementsByTagName('body')[0].firstChild;
    },

    notify: (msg, title = 'platypush', error = false) => {
      const port = browser.runtime.connect({ name: 'notify' });
      port.postMessage({
        type: 'run',
        message: msg,
        title: title,
        error: error,
      });
    },
  }`,
};

// vim:sw=2:ts=2:et:
