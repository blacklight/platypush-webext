import utils from './utils';

global.browser = require('webextension-polyfill');

const menu = {
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
    browser.contextMenus.removeAll();

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
        utils.methods.run(this.actions[action], this.hosts[host]);
      } else {
        utils.methods.runScript(this.scripts[action].script, this.hosts[host], tab, target);
      }
    });
  },

  async create() {
    await this.refresh();
  },
};

const onCreate = () => {
  menu.create();
};

onCreate();

// vim:sw=2:ts=2:et:
