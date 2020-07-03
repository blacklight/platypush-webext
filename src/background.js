import utils from './utils';
import axios from 'axios';
import Mercury from '@postlight/mercury-parser';

global.browser = require('webextension-polyfill');

const app = {
  hosts: {},
  actions: {},
  scripts: {},
  categories: {},
  separator: '//',

  categoriesByHost(host) {
    return Object.entries({ ...(this.actions || {}), ...(this.scripts || {}) }).reduce((obj, [actionName, action]) => {
      if (action.hosts.indexOf(host) < 0) {
        return obj;
      }

      const appendAction = category => {
        if (!(category in obj)) {
          obj[category] = {};
        }

        obj[category][actionName] = action;
      };

      if (!(action.categories && action.categories.length)) {
        appendAction('');
      } else {
        action.categories.forEach(category => appendAction(category));
      }

      return obj;
    }, {});
  },

  async refresh() {
    this.hosts = await utils.methods.getHosts();
    this.actions = await utils.methods.getActions();
    this.scripts = await utils.methods.getScripts();
    await browser.contextMenus.removeAll();

    for (const [host] of Object.entries(this.hosts)) {
      const hostId = this.separator + host;
      browser.contextMenus.create({
        id: hostId,
        title: host,
      });

      const categories = this.categoriesByHost(host);
      for (const [categoryName, category] of Object.entries(categories)) {
        const categoryId = hostId + this.separator + (categoryName.length ? categoryName : '[NONE]');
        browser.contextMenus.create({
          id: categoryId,
          parentId: hostId,
          title: categoryName.length ? categoryName : '[No Category]',
        });

        for (const [action] of Object.entries(category)) {
          const actionId = categoryId + this.separator + action;
          browser.contextMenus.create({
            id: actionId,
            parentId: categoryId,
            title: action,
          });
        }
      }
    }

    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      const [host, , action] = info.menuItemId.split(this.separator).slice(1);
      const target = await utils.methods.getTargetElement();

      if (action in this.actions) {
        await utils.methods.run(this.actions[action], this.hosts[host]);
      } else {
        await utils.methods.runScript(this.scripts[action].script, this.hosts[host], tab, target);
      }
    });

    browser.runtime.onConnect.addListener(port => {
      switch (port.name) {
        case 'action':
          port.onMessage.addListener(async message => {
            switch (message.type) {
              case 'run':
                const ret = await utils.methods.run(message.action, message.host);
                port.postMessage(ret);
                break;
            }
          });

          break;

        case 'url':
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

          break;

        case 'dom':
          port.onMessage.addListener(async message => {
            const tab = await utils.methods.getCurrentTab();
            switch (message.type) {
              case 'get':
                const dom = await browser.tabs.sendMessage(tab.id, { type: 'getDOM' }, {});
                port.postMessage(dom);
                break;

              case 'set':
                await browser.tabs.sendMessage(tab.id, { type: 'setDOM', html: message.html }, {});
                break;
            }
          });

          break;

        case 'notify':
          port.onMessage.addListener(async message => {
            switch (message.type) {
              case 'run':
                utils.methods.notify(message.message, message.title, message.error);
                break;
            }
          });

          break;

        case 'axios':
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

          break;

        case 'mercury':
          port.onMessage.addListener(async message => {
            switch (message.type) {
              case 'parse':
                const response = await Mercury.parse(message.url, {
                  contentType: 'html',
                  html: message.html,
                });

                port.postMessage(response);
                break;
            }
          });

          break;
      }
    });
  },

  async create() {
    await this.refresh();
  },
};

const onCreate = () => {
  app.create().then(() => {
    console.debug('Extension context created');
  });
};

onCreate();

// vim:sw=2:ts=2:et:
