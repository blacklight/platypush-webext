<template>
  <div class="container">
    <Menu :hosts="hosts" :selectedTab="selectedTab" :selectedHost="selectedHost" :selectedHostOption="selectedHostOption" @select="select" />

    <div class="body">
      <HostForm @add="addHost" v-if="selectedTab === 'add'" />
      <Config v-else-if="selectedTab === 'config'" @reload="reload" />
      <LocalCommands :host="selectedHost" v-else-if="selectedHost && selectedHostOption === 'actions'" :bus="bus" />
      <Run :host="hosts[selectedHost]" v-else-if="selectedHost && selectedHostOption === 'run'" :selectedAction="selectedAction" :selectedScript="selectedScript" />
      <HostForm :host="hosts[selectedHost]" @edit="editHost" @remove="removeHost" v-else-if="selectedHost" />
      <div class="none" v-else>Select an option from the menu</div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue';
import mixins from '../utils';
import Menu from './Menu';
import HostForm from './HostForm';
import LocalCommands from './LocalCommands';
import Config from './Config';
import Run from './Run';

export default {
  name: 'App',
  mixins: [mixins],
  components: {
    Menu,
    HostForm,
    LocalCommands,
    Config,
    Run,
  },

  data() {
    return {
      bus: new Vue({}),
      hosts: {},
      selectedTab: null,
      selectedHost: null,
      selectedHostOption: null,
      selectedAction: null,
      selectedScript: null,
    };
  },

  methods: {
    select(tab, host, hostOption, action, script) {
      this.selectedTab = tab;
      this.selectedHost = host;
      this.selectedHostOption = hostOption;
      this.selectedAction = action;
      this.selectedScript = script;
    },

    async reload() {
      this.hosts = await this.getHosts();
      this.selectedHost = this.getSelectedHost();
      this.selectedTab = this.getSelectedTab();

      switch (this.selectedTab) {
        case 'run':
          this.selectedHostOption = 'run';
          break;
        case 'actions':
          this.selectedHostOption = 'actions';
          break;
      }
    },

    async addHost(form) {
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
        await this.reload();
        this.select('host', Object.keys(this.hosts)[Object.keys(this.hosts).length - 1]);
      } finally {
        this.loading = false;
      }
    },

    async editHost(form) {
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
        delete this.hosts[i];
        await this.saveHosts(this.hosts);

        if (!Object.keys(this.hosts).length) {
          this.selectedHost = null;
        } else {
          this.selectedHost = Object.keys(this.hosts)[0];
        }

        await this.reload();
      } finally {
        this.loading = false;
      }
    },

    initListeners() {
      const self = this;

      this.bus.$on('edit-action', action => {
        self.select('host', this.selectedHost, 'run', action, null);
      });

      this.bus.$on('edit-script', script => {
        self.select('host', this.selectedHost, 'run', null, script);
      });
    },
  },

  watch: {
    selectedTab(newTab) {
      this.setSelectedTab(newTab);
    },

    selectedHostOption(newOption) {
      if (newOption?.length) {
        this.setSelectedTab(newOption);
      }
    },
  },

  created() {
    this.reload();
    this.initListeners();
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
