<template>
  <div class="container">
    <Menu
      :hosts="hosts"
      :selectedHost="selectedHost"
      :selectedHostOption="selectedHostOption"
      :isAddHost="isAddHost"
      :isBackupMode="isBackupMode"
      :isRestoreMode="isRestoreMode"
      @select-host="selectHost"
      @select-host-option="selectHostOption"
      @select-add-host="selectAddHost"
      @select-backup-mode="selectBackupMode"
      @select-restore-mode="selectRestoreMode"
    />

    <div class="body">
      <NewHost @add="addHost" v-if="isAddHost" />
      <Backup v-else-if="isBackupMode" />
      <Restore v-else-if="isRestoreMode" />
      <LocalCommands v-else-if="selectedHost >= 0 && selectedHostOption === 'localProc'" />
      <RemoteCommands v-else-if="selectedHost >= 0 && selectedHostOption === 'remoteProc'" />
      <Run :host="hosts[selectedHost]" v-else-if="selectedHost >= 0 && selectedHostOption === 'run'" />
      <EditHost :host="hosts[selectedHost]" @save="editHost" @remove="removeHost" v-else-if="selectedHost >= 0" />
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
import Backup from './Backup';
import Restore from './Restore';
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
    Backup,
    Restore,
    Run,
  },

  data() {
    return {
      selectedHost: -1,
      selectedHostOption: null,
      isAddHost: false,
      isBackupMode: false,
      isRestoreMode: false,
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
      this.isBackupMode = false;
      this.isRestoreMode = false;
    },

    selectBackupMode() {
      this.isAddHost = false;
      this.isBackupMode = true;
      this.isRestoreMode = false;
    },

    selectRestoreMode() {
      this.isAddHost = false;
      this.isBackupMode = false;
      this.isRestoreMode = true;
    },

    async addHost(form) {
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
        await this.saveHosts(this.hosts);
        this.selectedHost = this.hosts.length - 1;
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
  },

  created() {
    const self = this;
    this.loadHosts().then(hosts => {
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
