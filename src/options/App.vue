<template>
  <div class="container">
    <Menu
      :hosts="hosts"
      :selectedHost="selectedHost"
      :selectedHostOption="selectedHostOption"
      :isAddHost="isAddHost"
      @select-host="selectHost"
      @select-host-option="selectHostOption"
      @select-add-host="selectAddHost"
    />

    <div class="body">
      <div class="page add" v-if="isAddHost">
        <h2>Add a new device</h2>
        <form class="host-form" ref="addHostForm" @submit.prevent="addHost">
          <input type="text" name="name" placeholder="Name" autocomplete="off" :disabled="loading" />
          <input type="text" name="address" placeholder="IP or hostname" @keyup="onAddrChange($refs.addHostForm)" autocomplete="off" :disabled="loading" />
          <input type="text" name="port" value="8008" placeholder="HTTP port" @keyup="onPortChange($refs.addHostForm)" autocomplete="off" :disabled="loading" />
          <input type="text" name="websocketPort" value="8009" placeholder="Websocket port" autocomplete="off" :disabled="loading" />
          <input type="text" name="token" placeholder="Access token" autocomplete="off" :disabled="loading" />
          <div class="row ssl">
            <input type="checkbox" name="ssl" :disabled="loading" />
            <label for="ssl">Use SSL</label>
          </div>

          <div class="buttons">
            <input type="submit" value="Add" :disabled="loading" />
          </div>
        </form>
      </div>

      <div class="page local-procedures" v-else-if="selectedHostOption === 'localProc'">
        <h2>Procedures stored on browser</h2>
      </div>

      <div class="page remote-procedures" v-else-if="selectedHostOption === 'remoteProc'">
        <h2>Procedures stored on server</h2>
      </div>

      <div class="page run" v-else-if="selectedHostOption === 'run'">
        <h2>Run a command on {{ hosts[selectedHost].name }}</h2>
        <form class="run-form" ref="runForm" @submit.prevent="runAction">
          <div class="row action-name">
            <input type="text" name="action" v-model="action.name" placeholder="Action" autocomplete="off" :disabled="loading" />
            <span class="help">
              &nbsp; <a href="https://platypush.readthedocs.io/en/latest/plugins.html" target="_blank">Plugins reference</a>. Use <tt>$URL$</tt> as argument value to denote the
              current URL.
            </span>
          </div>

          <div class="row" v-for="(arg, i) in action.args" :key="i">
            <div class="label">
              <input type="text" :name="'arg' + i" v-model="arg.name" placeholder="Name" autocomplete="off" :disabled="loading" />
            </div>

            <div class="value">
              <input type="text" :name="arg.name" v-model="arg.value" data-type="argument" placeholder="Value" autocomplete="off" :disabled="loading" />
              <button type="button" @click="action.args.splice(i, 1)" :disabled="loading"><i class="fas fa-trash" /></button>
            </div>
          </div>

          <div class="row buttons">
            <button type="button" @click="addActionArgument" :disabled="loading"><i class="fas fa-plus" /> &nbsp; Add Argument</button>
            <button type="button" @click="clearAction" :disabled="loading"><i class="fas fa-times" /> &nbsp; Clear Form</button>
            <button type="submit" :disabled="loading"><i class="fas fa-play" /> &nbsp; Run</button>
          </div>
        </form>

        <div class="code response" v-text="actionResponse" v-if="actionResponse && (actionResponse.length || Object.keys(actionResponse).length)" />
        <div class="code error" v-text="actionError" v-if="actionError && actionError.length" />
      </div>

      <div class="page edit" v-else-if="selectedHost >= 0">
        <h2>Edit device {{ hosts[selectedHost].name }}</h2>
        <form class="host-form" ref="editHostForm" @submit.prevent="editHost">
          <input type="text" name="name" placeholder="Name" :value="hosts[selectedHost].name" autocomplete="off" :disabled="loading" />
          <input type="text" name="address" placeholder="IP or hostname" :value="hosts[selectedHost].address" autocomplete="off" :disabled="loading" />
          <input
            type="text"
            name="port"
            placeholder="HTTP port"
            autocomplete="off"
            :value="hosts[selectedHost].port"
            @keyup="onPortChange($refs.editHostForm)"
            :disabled="loading"
          />
          <input type="text" name="websocketPort" :value="hosts[selectedHost].websocketPort" placeholder="Websocket port" autocomplete="off" :disabled="loading" />
          <input type="text" name="token" placeholder="Access token" :value="hosts[selectedHost].token" autocomplete="off" :disabled="loading" />
          <div class="row ssl">
            <input type="checkbox" name="ssl" v-model="hosts[selectedHost].ssl" :disabled="loading" />
            <label for="ssl">Use SSL</label>
          </div>

          <div class="buttons">
            <input type="submit" value="Edit" :disabled="loading" />
            <button type="button" @click="removeHost" :disabled="loading">Remove</button>
          </div>
        </form>
      </div>

      <div class="none" v-else>
        Select an option from the menu
      </div>
    </div>
  </div>
</template>

<script>
import mixins from '../utils';
import Menu from './Menu';

export default {
  name: 'App',
  mixins: [mixins],
  components: { Menu },

  data() {
    return {
      hosts: [],
      selectedHost: -1,
      selectedHostOption: null,
      isAddHost: false,
      loading: false,
      actionResponse: null,
      actionError: null,
      action: {
        name: null,
        args: [],
      },
    };
  },

  methods: {
    selectHost(i) {
      this.selectedHost = i;
      this.selectedHostOption = null;
      this.isAddHost = false;
    },

    selectHostOption(option) {
      this.selectedHostOption = option;
    },

    selectAddHost() {
      this.selectedHost = -1;
      this.isAddHost = true;
    },

    addActionArgument() {
      this.action.args.push({
        name: '',
        value: '',
      });
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

    clearAction() {
      this.action.name = null;
      this.action.args = [];
      this.actionResponse = null;
      this.actionError = null;
    },

    async runAction() {
      this.loading = true;

      try {
        this.actionResponse = await this.run(this.action, this.hosts[this.selectedHost]);
        this.actionError = null;
      } catch (e) {
        this.actionResponse = null;
        this.actionError = e.toString();
      } finally {
        this.loading = false;
      }
    },

    async addHost() {
      const form = this.$refs.addHostForm;
      if (!this.isHostFormValid(form)) {
        this.notify('Invalid device parameter values', 'Device configuration error');
        return;
      }

      this.loading = true;

      try {
        const host = this.formToHost(form);
        const dupHosts = this.hosts.filter(h => h.name === host.name || (h.address === host.address && h.port === host.port));
        if (dupHosts.length) {
          this.notify('This device is already defined', 'Duplicate device');
          return;
        }

        this.hosts.push(host);
        await this.saveHosts();
        this.selectedHost = this.hosts.length - 1;
        this.isAddHost = false;
      } finally {
        this.loading = false;
      }
    },

    async editHost() {
      const form = this.$refs.editHostForm;
      if (!this.isHostFormValid(form)) {
        this.notify('Invalid device parameter values', 'Device configuration error');
        return;
      }

      this.loading = true;

      try {
        this.hosts[this.selectedHost] = this.formToHost(form);
        await this.saveHosts();
      } finally {
        this.loading = false;
      }
    },

    async removeHost() {
      const host = this.hosts[this.selectedHost];
      if (!confirm('Are you sure that you want to remove the device ' + host.name + '?')) {
        return;
      }

      this.loading = true;

      try {
        const i = this.selectedHost;
        if (this.hosts.length <= 1) {
          this.selectedHost = -1;
        } else if (i > 0) {
          this.selectedHost = i - 1;
        } else {
          this.selectedHost = 0;
        }

        this.hosts.splice(i, 1);
        await this.saveHosts();
      } finally {
        this.loading = false;
      }
    },

    async loadHosts() {
      this.loading = true;

      try {
        const response = await browser.storage.local.get('hosts');
        this.hosts = JSON.parse(response.hosts);
      } finally {
        this.loading = false;
      }
    },

    async saveHosts() {
      await browser.storage.local.set({ hosts: JSON.stringify(this.hosts) });
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
  },

  created() {
    this.loadHosts();
  },
};
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  height: 100vh;
  font-size: 14px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif;
}

a,
a:visited {
  color: initial;
  text-decoration: underline dotted #888;
}

a:hover {
  opacity: 0.7;
}

h2 {
  font-size: 1.2em;
  margin-bottom: 0.75em;
  padding-bottom: 0.75em;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.body {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: auto;

  .none {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5em;
    opacity: 0.4;
  }
}

.page {
  width: 100%;
  padding: 0 1em;
}

form {
  input[type='text'] {
    display: block;
    margin-bottom: 0.5em;
    border-radius: 1em;
    padding: 0.4em;
    border: 1px solid rgba(0, 0, 0, 0.2);

    &:hover {
      border: 1px solid rgba(40, 235, 70, 0.3);
    }

    &:focus {
      border: 1px solid rgba(40, 235, 70, 0.7);
    }
  }

  .row.ssl {
    display: flex;
    align-items: center;
  }

  .buttons {
    margin-top: 0.5em;
    padding-top: 0.5em;
    border-top: 1px solid rgba(0, 0, 0, 0.15);

    button {
      margin-right: 0.3em;
    }
  }
}

.run-form {
  position: relative;
  max-width: 50em;

  .row {
    display: flex;
    align-items: center;
    margin-bottom: 0.5em;
    padding-bottom: 0.5em;
  }

  .label {
    width: 30%;
    input[type='text'] {
      width: 90%;
    }
  }

  .value {
    width: 70%;
    input[type='text'] {
      width: 80%;
    }

    button {
      background: white;
      padding: 0.25em 1.5em;
      margin-left: 0.5em;
      border: 1px solid rgba(0, 0, 0, 0.3);
      border-radius: 1em;

      &:hover {
        opacity: 0.8;
      }
    }
  }

  input {
    display: inline-flex !important;
    margin-bottom: 0 !important;
  }

  [type='submit'] {
    position: absolute;
    right: 0.9em;
  }
}

.code {
  padding: 1em;
  white-space: pre-wrap;
  font-family: monospace;
  border: 1px dotted rgba(0, 0, 0, 0.8);
  border-radius: 1em;

  &.response {
    background: rgba(200, 255, 200, 0.3);
  }

  &.error {
    background: rgba(255, 200, 200, 0.3);
  }
}
</style>

<!-- vim:sw=2:ts=2:et: -->
