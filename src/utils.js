import axios from 'axios';
import Vue from 'vue';
import _script from './script';

export default {
  data() {
    return {
      loading: false,
    };
  },

  methods: {
    async notify(message, title = 'platypush', error = false) {
      let msg = '';
      if (title && title.length) {
        msg = `${title}`;
      }

      if (message && message.length) {
        if (msg.length > 0) {
          msg += ': ';
        }
        msg += message;
      }

      if (msg.length) {
        if (error) {
          console.error(msg);
        } else {
          console.log(msg);
        }
      }

      await browser.notifications.create({
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
        await this.notify('No active tab', '', true);
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
          .filter(arg => arg.value != null && arg.value.length)
          .reduce((obj, arg) => {
            obj[arg.name] = arg.value;
            return obj;
          }, {});
      } else {
        args = Object.entries(args)
          .filter(([, value]) => value != null && value.length)
          .reduce((obj, [name, value]) => {
            obj[name] = value;
            return obj;
          }, {});
      }

      Object.keys(args).forEach(name => {
        // URL wildcard
        if (args[name] === '$URL$') {
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
            action: action.action,
            args: args,
          },
          config
        );

        const errors = msg.data.response.errors;
        if (errors && errors.length) {
          // noinspection ExceptionCaughtLocallyJS
          throw errors[0];
        }

        return msg.data.response.output;
      } catch (e) {
        await this.notify(e.toString(), 'Request error');
        throw e;
      }
    },

    prepareScript(script, host, tab, target, ...args) {
      args = JSON.stringify({
        host: host,
        tabId: tab ? tab.id : null,
        target: typeof target === 'object' ? target.outerHTML : target,
        ...args,
      });

      return `(${script})(${_script.api}, ${args})`;
    },

    async runScript(script, host, tab, target, ...args) {
      this.loading = true;

      try {
        if (!tab) {
          tab = await this.getCurrentTab();
        }

        if (!tab) {
          return;
        }

        const code = this.prepareScript(script, host, tab, target, ...args);
        return await browser.tabs.executeScript(tab.id, {
          code: code,
        });
      } catch (e) {
        await this.notify(e.message, 'Script error', true);
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

    async getScripts() {
      this.loading = true;

      try {
        const response = await browser.storage.local.get('scripts');
        if (!response.scripts) {
          return {};
        }

        return Object.entries(JSON.parse(response.scripts)).reduce((obj, [name, info]) => {
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
      await this.notify('You can find this action under the Local Actions menu', 'Action saved');
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
        await this.notify(e.message, 'Error on script save');
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
      await this.notify('You can find this script under the Local Actions menu', 'Script saved');
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

    async backupConfig(host) {
      if (typeof host === 'string') {
        const hosts = await this.getHosts();
        if (!(host in hosts)) {
          await this.notify(host, 'No such Platypush host');
          return;
        }

        host = hosts[host];
      }

      this.loading = true;
      const config = JSON.stringify(await this.loadConfig());
      const basedir = `\${Config.get("workdir")}/webext`;
      const filename = `${basedir}/config.json`;

      try {
        await this.run(
          {
            action: 'file.mkdir',
            args: { directory: basedir },
          },
          host
        );

        await this.run(
          {
            action: 'file.write',
            args: {
              file: filename,
              content: config,
            },
          },
          host
        );

        await this.notify(`Configuration successfully backed up to ${host.name}`, 'Backup successful');
      } finally {
        this.loading = false;
      }
    },

    async getConfig(host) {
      if (typeof host === 'string') {
        const hosts = await this.getHosts();
        if (!(host in hosts)) {
          await this.notify(host, 'No such Platypush host');
          return;
        }

        host = hosts[host];
      }

      this.loading = true;
      const basedir = `\${Config.get("workdir")}/webext`;
      const filename = `${basedir}/config.json`;

      try {
        return await this.run(
          {
            action: 'file.read',
            args: { file: filename },
          },
          host
        );
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
};

export const bus = new Vue();

// vim:sw=2:ts=2:et:
