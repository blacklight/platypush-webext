<template>
  <div class="container">
    <ul class="hosts">
      <li class="host" v-for="(host, i) in hosts" :key="i" :class="{ selected: i === selectedHost }" @click="selectHost(i)">
        <i class="fas fa-hdd" /> &nbsp; {{ host.name }}
        <ul class="host-menu" v-if="i === selectedHost">
          <li v-for="(option, name) in hostOptions" :key="name" :class="{ selected: selectedHostOption === name }" @click.stop="selectHostOption(name)">
            <i :class="option.iconClass" /> &nbsp; {{ option.displayName }}
          </li>
        </ul>
      </li>
      <li class="add" :class="{ selected: isAddHost }" @click="selectAddHost"><i class="fas fa-plus" /> &nbsp; Add Device</li>
    </ul>

    <div class="body">
      <div class="page add" v-if="isAddHost">
        <h2>Add a new device</h2>
        <form class="host-form" ref="addHostForm" @submit.prevent="addHost">
          <input type="text" name="name" placeholder="Name" autocomplete="off" :disabled="loading" />
          <input type="text" name="address" placeholder="IP or hostname" @keyup="onAddrChange($refs.addHostForm)" autocomplete="off" :disabled="loading" />
          <input type="text" name="port" value="8008" placeholder="HTTP port" @keyup="onPortChange($refs.addHostForm)" autocomplete="off" :disabled="loading" />
          <input type="text" name="websocketPort" value="8009" placeholder="Websocket port" autocomplete="off" :disabled="loading" />
          <input type="text" name="token" placeholder="Access token" autocomplete="off" :disabled="loading" />
          <input type="submit" value="Add" :disabled="loading" />
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
          <input type="text" name="action" placeholder="Action name (e.g. light.hue.on)" autocomplete="off" :disabled="loading" />
          <input type="submit" value="Run" :disabled="loading" />
        </form>
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
          <input type="submit" value="Edit" :disabled="loading" />
          <button type="button" @click="removeHost" :disabled="loading">Remove</button>
        </form>
      </div>

      <div class="none" v-else>
        Select an option from the menu
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      hosts: [],
      selectedHost: -1,
      selectedHostOption: null,
      isAddHost: false,
      loading: false,
    };
  },

  computed: {
    hostOptions() {
      return {
        localProc: {
          displayName: 'Local Procedures',
          iconClass: 'fas fa-puzzle-piece',
        },
        remoteProc: {
          displayName: 'Remote Procedures',
          iconClass: 'fas fa-database',
        },
        run: {
          displayName: 'Run Action',
          iconClass: 'fas fa-play',
        },
      };
    },
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

    onAddrChange(form) {
      if (form.name.value.length && !form.address.value.startsWith(form.name.value)) {
        return;
      }

      form.name.value = form.address.value;
    },

    onPortChange(form) {
      if (isNaN(form.port.value)) return;
      form.websocketPort.value = '' + (parseInt(form.port.value) + 1);
    },

    isPortValid(port) {
      port = parseInt(port);
      return !(isNaN(port) || port < 1 || port > 65535);
    },

    async addHost() {
      this.loading = true;

      try {
        const host = this.formToHost(this.$refs.addHostForm);
        const dupHosts = this.hosts.filter(h => h.name === host.name || (h.address === host.address && h.port === host.port));
        if (dupHosts.length) {
          throw new Error('This device is already defined');
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
      this.loading = true;

      try {
        this.hosts[this.selectedHost] = this.formToHost(this.$refs.editHostForm);
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
        if (!this.hosts.length) {
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

.hosts {
  width: 25%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  margin: 0;
  padding: 0;
  box-shadow: 1px 1px 1.5px 1px rgba(0, 0, 0, 0.5);

  li {
    display: block;
    cursor: pointer;
    padding: 1em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);

    &:hover {
      background-color: rgba(90, 140, 120, 1);
    }

    &.selected {
      background-color: rgba(80, 120, 110, 0.8);
    }
  }

  .host.selected {
    padding-bottom: 0;
  }
}

.host-menu {
  margin: 0.5em -1em auto -1em;
  padding-left: 0;

  li {
    list-style-type: none;
    padding: 0.75em 2em;
    border-bottom: 0;

    &.selected {
      background-color: rgba(60, 140, 120, 0.9);
      padding-bottom: 0.75em;
    }
  }
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
}
</style>

<!-- vim:sw=2:ts=2:et: -->
