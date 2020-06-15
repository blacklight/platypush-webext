import axios from 'axios';

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

    async run(action, host) {
      const url = (host.ssl ? 'https' : 'http') + '://' + host.address + ':' + host.port + '/execute';
      const config = {};
      let args = action.args;
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
          args[name] = window.location.href;
        }
      });

      if (host.token && host.token.length) {
        config.headers = {
          'X-Token': host.token,
        };
      }

      try {
        const msg = await axios.post(
          url,
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

    async loadConfig() {
      this.loading = true;

      try {
        const [hosts, actions] = await Promise.all([this.getHosts(), this.getActions()]);
        return {
          hosts: hosts,
          actions: actions,
        };
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

// vim:sw=2:ts=2:et:
