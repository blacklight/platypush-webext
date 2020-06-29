import axios from 'axios';
import Mercury from '@postlight/mercury-parser';
import Vue from 'vue';

export default {
  data() {
    return {
      loading: false,
    };
  },

  methods: {
    notify(message, title = 'platypush') {
      browser.notifications.create({
        type: 'basic',
        title: title,
        message: message,
      });
    },

    async getCurrentTab() {
      const tabs = await browser.tabs.query({
        currentWindow: true,
        active: true,
      });

      if (!tabs.length) {
        this.notify('', 'No active tab');
        return;
      }

      return tabs[0];
    },

    async getURL() {
      const tab = await this.getCurrentTab();
      return await browser.tabs.sendMessage(tab.id, { type: 'getURL' });
    },

    async getDOM() {
      const tab = await this.getCurrentTab();
      return await browser.tabs.sendMessage(tab.id, { type: 'getDOM' });
    },

    async setDOM(html) {
      const tab = await this.getCurrentTab();
      await browser.tabs.sendMessage(tab.id, { type: 'setDOM', html: html });
    },

    async getTargetElement() {
      const tab = await this.getCurrentTab();
      const target = await browser.tabs.sendMessage(tab.id, { type: 'getTargetElement' });
      if (!target) {
        return;
      }

      return new DOMParser().parseFromString(target, 'text/html').documentElement.getElementsByTagName('body')[0].firstChild;
    },

    async run(action, host, url) {
      const execURL = (host.ssl ? 'https' : 'http') + '://' + host.address + ':' + host.port + '/execute';
      const config = {};
      let args = action.args || {};
      let currentURL = url;

      if (!url) {
        try {
          currentURL = await this.getURL();
        } catch (e) {}
      }

      if (Array.isArray(action.args)) {
        args = action.args
          .filter(arg => arg.value && arg.value.length)
          .reduce((obj, arg) => {
            obj[arg.name] = arg.value;
            return obj;
          }, {});
      }

      Object.keys(args).forEach(name => {
        if (args[name] === '$URL$') {
          // URL wildcard
          if (!currentURL) {
            console.warn('Unable to get the current URL');
          } else {
            args[name] = currentURL;
          }
        }
      });

      if (host.token && host.token.length) {
        config.headers = {
          'X-Token': host.token,
        };
      }

      try {
        const msg = await axios.post(
          execURL,
          {
            type: 'request',
            action: action.name,
            args: args,
          },
          config
        );

        const errors = msg.data.response.errors;
        if (errors && errors.length) {
          throw new Error(errors[0]);
        }

        return msg.data.response.output;
      } catch (e) {
        this.notify(e.toString(), 'Request error');
        throw e;
      }
    },

    async runScript(script, host, tab, target, ...args) {
      this.loading = true;

      try {
        if (typeof script === 'string') {
          /* eslint no-eval: "off" */
          script = eval(this.script);
        }

        return await script(this, host, browser, tab, target, ...args);
      } catch (e) {
        this.notify(e.message, 'Script error');
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async getHosts() {
      this.loading = true;

      try {
        const response = await browser.storage.local.get('hosts');
        if (!response.hosts) {
          return {};
        }

        return JSON.parse(response.hosts);
      } finally {
        this.loading = false;
      }
    },

    async saveHosts(hosts) {
      this.loading = true;
      try {
        await browser.storage.local.set({ hosts: JSON.stringify(hosts) });
      } finally {
        this.loading = false;
      }
    },

    async getActions() {
      this.loading = true;

      try {
        const response = await browser.storage.local.get('actions');
        if (!response.actions) {
          return {};
        }

        return JSON.parse(response.actions);
      } finally {
        this.loading = false;
      }
    },

    async getScripts(parse = true) {
      this.loading = true;

      try {
        const response = await browser.storage.local.get('scripts');
        if (!response.scripts) {
          return {};
        }

        return Object.entries(JSON.parse(response.scripts)).reduce((obj, [name, info]) => {
          if (parse && typeof info.script === 'string') {
            info.script = eval(info.script);
          }

          obj[name] = info;
          return obj;
        }, {});
      } finally {
        this.loading = false;
      }
    },

    async saveActions(actions) {
      this.loading = true;

      try {
        await browser.storage.local.set({ actions: JSON.stringify(actions) });
      } finally {
        this.loading = false;
      }
    },

    async saveAction(action) {
      const actions = await this.getActions();
      if (action.displayName in actions) {
        if (!confirm('An action with this name already exists. Do you want to overwrite it?')) {
          return;
        }
      }

      actions[action.displayName] = action;
      await this.saveActions(actions);
      this.notify('You can find this action under the Local Actions menu', 'Action saved');
    },

    async saveScripts(scripts) {
      this.loading = true;

      try {
        scripts = Object.entries(scripts).reduce((obj, [name, info]) => {
          if (typeof info.script === 'function') {
            info.script = info.script.toString();
          }

          obj[name] = info;
          return obj;
        }, {});

        await browser.storage.local.set({ scripts: JSON.stringify(scripts) });
      } catch (e) {
        this.notify(e.message, 'Error on script save');
      } finally {
        this.loading = false;
      }
    },

    async saveScript(script) {
      const scripts = await this.getScripts(false);
      if (script.displayName in scripts) {
        if (!confirm('A script with this name already exists. Do you want to overwrite it?')) {
          return;
        }
      }

      scripts[script.displayName] = script;
      await this.saveScripts(scripts);
      this.notify('You can find this script under the Local Actions menu', 'Script saved');
    },

    async loadConfig() {
      this.loading = true;

      try {
        const [hosts, actions, scripts] = await Promise.all([this.getHosts(), this.getActions(), this.getScripts(false)]);
        return {
          hosts: hosts,
          actions: actions,
          scripts: scripts,
        };
      } finally {
        this.loading = false;
      }
    },

    async saveConfig(config) {
      this.loading = true;
      const hosts = config.hosts || {};
      const actions = config.actions || {};
      const scripts = config.scripts || {};

      try {
        await Promise.all([this.saveHosts(hosts), this.saveActions(actions), this.saveScripts(scripts)]);
      } finally {
        this.loading = false;
      }
    },

    formToHost(form) {
      return {
        name: form.name.value,
        address: form.address.value,
        port: parseInt(form.port.value),
        websocketPort: parseInt(form.websocketPort.value),
        ssl: form.ssl.checked,
        token: form.token.value,
      };
    },

    onAddrChange(form) {
      if (form.name.value.length && !form.address.value.startsWith(form.name.value)) {
        return;
      }

      form.name.value = form.address.value;
    },

    onPortChange(form) {
      const port = form.port.value;
      if (!this.isPortValid(port)) return;
      form.websocketPort.value = '' + (parseInt(port) + 1);
    },

    isPortValid(port) {
      port = parseInt(port);
      return !isNaN(port) && port > 0 && port < 65536;
    },

    isHostFormValid(form) {
      return form.name.value.length && form.address.value.length && this.isPortValid(form.port.value) && this.isPortValid(form.websocketPort.value);
    },
  },

  created() {
    this.$axios = axios;
    this.$mercury = Mercury;
  },
};

export const bus = new Vue();

// vim:sw=2:ts=2:et:
