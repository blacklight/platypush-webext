import axios from 'axios';
import Mercury from '@postlight/mercury-parser';
import utils from '../utils';

const Service = (() => {
  const actionService = async port => {
    port.onMessage.addListener(async message => {
      let ret = null;
      switch (message.type) {
        case 'run':
          ret = await utils.methods.run(message.action, message.host);
          port.postMessage(ret);
          break;
      }
    });
  };

  const urlService = async port => {
    port.onMessage.addListener(async message => {
      const tab = await utils.methods.getCurrentTab();
      switch (message.type) {
        case 'get':
          port.postMessage(tab.url);
          break;

        case 'set':
          await browser.tabs.sendMessage(tab.id, { type: 'setURL', url: message.url }, {});
          break;

        case 'open':
          await browser.tabs.create({
            url: message.url,
          });
          break;
      }
    });
  };

  const domService = async port => {
    port.onMessage.addListener(async message => {
      const tab = await utils.methods.getCurrentTab();
      let dom = null;

      switch (message.type) {
        case 'get':
          dom = await browser.tabs.sendMessage(tab.id, { type: 'getDOM' }, {});
          port.postMessage(dom);
          break;

        case 'set':
          await browser.tabs.sendMessage(tab.id, { type: 'setDOM', html: message.html }, {});
          break;
      }
    });
  };

  const notifyService = async port => {
    port.onMessage.addListener(async message => {
      switch (message.type) {
        case 'run':
          await utils.methods.notify(message.message, message.title, message.error);
          break;
      }
    });
  };

  const axiosService = async port => {
    port.onMessage.addListener(async message => {
      const method = axios[message.type.toLowerCase()];
      const response = await method(message.url, ...message.args);
      port.postMessage({
        config: {
          data: response.config.data,
          headers: response.config.headers,
          maxContentLength: response.config.maxContentLength,
          method: response.config.method,
          timeout: response.config.timeout,
          url: response.config.url,
          xsrfCookieName: response.config.xsrfCookieName,
          xsrfHeaderName: response.config.xsrfHeaderName,
        },
        headers: response.headers,
        data: response.data,
        status: response.status,
        statusText: response.statusText,
      });
    });
  };

  const mercuryService = async port => {
    port.onMessage.addListener(async message => {
      let response = null;
      switch (message.type) {
        case 'parse':
          response = await Mercury.parse(message.url, {
            contentType: 'html',
            html: message.html,
          });

          port.postMessage(response);
          break;
      }
    });
  };

  return {
    action: actionService,
    url: urlService,
    dom: domService,
    notify: notifyService,
    axios: axiosService,
    mercury: mercuryService,
  };
})();

export default {
  async Listener(port) {
    if (port.name in Service) {
      await Service[port.name](port);
    } else {
      console.warn(`No such message service: {port.name}`);
    }
  },
};

// vim:sw=2:ts=2:et:
