import utils from './utils';
import Command from './listeners/command';
import Connect from './listeners/connect';
import Menu from './listeners/menu';
import Message from './listeners/message';

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

  async refreshMenu() {
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
  },

  initListeners() {
    browser.contextMenus.onClicked.addListener(Menu.Listener);
    browser.runtime.onConnect.addListener(Connect.Listener);
    browser.runtime.onMessage.addListener(Message.Listener);
    browser.commands.onCommand.addListener(Command.Listener);
  },

  async refresh() {
    this.hosts = await utils.methods.getHosts();
    this.actions = await utils.methods.getActions();
    this.scripts = await utils.methods.getScripts();
    await this.refreshMenu();
  },

  async create() {
    await this.refresh();
    this.initListeners();
  },
};

const onCreate = () => {
  app.create().then(() => {
    console.debug('Extension context created');
  });
};

onCreate();

// vim:sw=2:ts=2:et:
