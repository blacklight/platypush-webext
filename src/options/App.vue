<template>
  <div class="container">
    <Menu :hosts="hosts" :selectedTab="selectedTab" :selectedHost="selectedHost" :selectedHostOption="selectedHostOption" @select="select" />

    <div class="body">
      <NewHost @add="addHost" v-if="selectedTab === 'add'" />
      <Config v-else-if="selectedTab === 'config'" />
      <LocalCommands v-else-if="selectedTab === 'host' && selectedHostOption === 'localProc'" />
      <RemoteCommands v-else-if="selectedTab === 'host' && selectedHostOption === 'remoteProc'" />
      <Run :host="hosts[selectedHost]" v-else-if="selectedTab === 'host' && selectedHostOption === 'run'" />
      <EditHost :host="hosts[selectedHost]" @save="editHost" @remove="removeHost" v-else-if="selectedTab === 'host'" />
      <div class="none" v-else>Select an option from the menu</div>
    </div>
  </div>
</template>

<script>
import mixins from '../utils';
import Menu from './Menu';
import NewHost from './NewHost';
import EditHost from './EditHost';
import LocalCommands from './LocalCommands';
import RemoteCommands from './RemoteCommands';
import Config from './Config';
import Run from './Run';

export default {
  name: 'App',
  mixins: [mixins],
  components: {
    Menu,
    NewHost,
    EditHost,
    LocalCommands,
    RemoteCommands,
    Config,
    Run,
  },

  data() {
    return {
      hosts: {},
      selectedTab: null,
      selectedHost: null,
      selectedHostOption: null,
    };
  },

  methods: {
    select(tab, host, hostOption) {
      this.selectedTab = tab;
      this.selectedHost = host;
      this.selectedHostOption = hostOption;
    },

    async addHost(form) {
      if (!this.isHostFormValid(form)) {
        this.notify('Invalid device parameter values', 'Device configuration error');
        return;
      }

      this.loading = true;

      try {
        const host = this.formToHost(form);
        const dupHosts = Object.values(this.hosts).filter(h => h.name === host.name || (h.address === host.address && h.port === host.port));
        if (dupHosts.length) {
          this.notify('This device is already defined', 'Duplicate device');
          return;
        }

        this.hosts[host.name] = host;
        await this.saveHosts(this.hosts);
        this.selectedHost = Object.keys(this.hosts)[Object.keys(this.hosts).length - 1];
        this.isAddHost = false;
      } finally {
        this.loading = false;
      }
    },

    async editHost(form) {
      if (!this.isHostFormValid(form)) {
        this.notify('Invalid device parameter values', 'Device configuration error');
        return;
      }

      this.loading = true;

      try {
        this.hosts[this.selectedHost] = this.formToHost(form);
        await this.saveHosts(this.hosts);
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
        if (Object.keys(this.hosts).length <= 1) {
          this.selectedHost = null;
        } else {
          this.selectedHost = Object.keys(this.hosts)[0];
        }

        delete this.hosts[i];
        await this.saveHosts(this.hosts);
      } finally {
        this.loading = false;
      }
    },
  },

  created() {
    const self = this;
    this.getHosts().then(hosts => {
      self.hosts = hosts;
    });
  },
};
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  height: 100vh;
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
</style>

<!-- vim:sw=2:ts=2:et: -->
