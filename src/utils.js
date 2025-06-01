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
    getExtensionId() {
      return browser.i18n.getMessage('@@extension_id');
    },

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
      let tabs = [];

      try {
        tabs = await browser.tabs.query({
          currentWindow: true,
          active: true,
        });
      } catch (e) {
        console.warn('Could not get active tab', e);
        return;
      }

      if (!tabs.length) {
        await this.notify('No active tab', '', true);
        return;
      }

      return tabs[0];
    },

    async getURL() {
      const tab = await this.getCurrentTab();
      try {
        return await browser.tabs.sendMessage(tab.id, { type: 'getURL' });
      } catch (e) {
        console.warn('Could not get URL', e);
      }
    },

    async getDOM() {
      try {
        const tab = await this.getCurrentTab();
        return await browser.tabs.sendMessage(tab.id, { type: 'getDOM' });
      } catch (e) {
        console.warn('Could not get DOM', e);
      }
    },

    async setDOM(html) {
      const tab = await this.getCurrentTab();
      try {
        await browser.tabs.sendMessage(tab.id, { type: 'setDOM', html: html });
      } catch (e) {
        console.warn('Could not set DOM', e);
      }
    },

    async getTargetElement() {
      const tab = await this.getCurrentTab();
      let target = null;
      try {
        target = await browser.tabs.sendMessage(tab.id, { type: 'getTargetElement' });
      } catch (e) {
        console.warn('Could not get current element', e);
        return;
      }

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
          .filter(arg => arg.value != null && (typeof arg.value !== 'string' || arg.value.length))
          .reduce((obj, arg) => {
            obj[arg.name] = arg.value;
            return obj;
          }, {});
      } else {
        args = Object.entries(args)
          .filter(([, value]) => value != null && (typeof value !== 'string' || value.length))
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

    async getCommands() {
      this.loading = true;

      try {
        const response = await browser.storage.local.get('commands');
        if (!response.commands) {
          return {};
        }

        return JSON.parse(response.commands);
      } finally {
        this.loading = false;
      }
    },

    async saveCommands(commands) {
      this.loading = true;
      try {
        await browser.storage.local.set({ commands: JSON.stringify(commands) });
      } finally {
        this.loading = false;
      }
    },

    async saveCommand(command, action) {
      const commands = await this.getCommands();
      if (command in commands) {
        if (action === commands[command]) {
          return;
        }

        if (!confirm(`The action ${commands[command]} is already linked to this key binding. Do you want to overwrite it?`)) {
          return;
        }
      }

      Object.entries(commands).forEach(([cmd, act]) => {
        if (act === action) {
          delete commands[cmd];
        }
      });

      commands[command] = action;
      await this.saveCommands(commands);
    },

    async removeCommand(command, action) {
      const commands = await this.getCommands();
      if (!(command in commands) || !confirm('Are you sure that you want to remove this key binding?')) {
        return;
      }

      delete commands[command];
      await this.saveCommands(commands);
    },

    async loadConfig() {
      this.loading = true;

      try {
        const [hosts, actions, scripts, commands] = await Promise.all([this.getHosts(), this.getActions(), this.getScripts(false), this.getCommands()]);
        return {
          hosts: hosts,
          actions: actions,
          scripts: scripts,
          commands: commands,
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
      const commands = config.commands || {};

      try {
        await Promise.all([this.saveHosts(hosts), this.saveActions(actions), this.saveScripts(scripts), this.saveCommands(commands)]);
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
      const url = new URL(form.url.value.trim());
      const ssl = url.protocol === 'https:';
      let port = parseInt(url.port);
      if (!this.isPortValid(port)) {
        port = ssl ? 443 : 80;
      }

      return {
        name: form.name.value,
        address: url.hostname,
        port: port,
        websocketPort: port,
        ssl: ssl,
        token: form.token.value,
      };
    },

    isPortValid(port) {
      port = parseInt(port);
      return !isNaN(port) && port > 0 && port < 65536;
    },

    getUrlArgs() {
      const hash = window.location.hash.slice(1);
      const args = {};
      if (!hash) {
        return args;
      }

      const parts = hash.split('&');
      parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          args[key] = decodeURIComponent(value);
        }
      });

      return args;
    },

    setUrlArgs(args) {
      const hash = Object.entries({ ...this.getUrlArgs(), ...args })
        .filter(([key, value]) => key && value != null && (typeof value !== 'string' || value.length))
        .map(([key, value]) => `${key}=${encodeURIComponent(value.toString())}`)
        .join('&');

      window.location.hash = hash;
    },

    clearUrlArgs() {
      window.location.hash = '';
    },

    getSelectedTab() {
      return this.getUrlArgs().view;
    },

    getSelectedHost() {
      return this.getUrlArgs().host;
    },

    setSelectedHost(host) {
      const args = this.getUrlArgs();
      args.host = host;
      this.setUrlArgs(args);
    },

    setSelectedTab(tab) {
      const args = this.getUrlArgs();
      args.view = tab;
      this.setUrlArgs(args);
    },
  },
};

export const bus = new Vue();

// vim:sw=2:ts=2:et:
