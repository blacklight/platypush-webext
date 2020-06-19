<template>
  <div class="container">
    <div class="no-hosts" v-if="!hosts">
      No devices found. Click
      <a href="/options/options.html" target="_blank">here</a> to configure the extension.
    </div>

    <div class="main" v-else>
      <div class="head">
        <div class="host-selector">
          <select v-model="selectedHost" v-if="Object.keys(hosts).length > 1">
            <option disabled :selected="!selectedHost" value="">Select a device</option>
            <option v-for="(host, name) in hosts" :selected="selectedHost === name" :key="name" :value="name">{{ name }}</option>
          </select>

          <span class="host" v-text="Object.entries(hosts)[0][0]" v-else />
        </div>

        <div class="settings">
          <a href="/options/options.html" target="_blank">
            <i class="fas fa-cog" />
          </a>
        </div>
      </div>

      <div class="body" v-if="selectedHost">
        <div class="no-actions" v-if="!actions">
          No actions available for {{ selectedHost }}. Click <a href="/options/options.html" target="_blank">here</a> to configure the device.
        </div>

        <div class="action" v-for="(action, name) in actions" :key="name" :data-action="name" @click="run_($event.target.dataset.action)" v-else>
          <div class="icon">
            <i :class="action.iconClass" v-if="action.iconClass" />
            <i class="fas fa-cog" v-else />
          </div>

          <div class="name" v-text="name" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import mixins from '../utils';

export default {
  mixins: [mixins],
  data() {
    return {
      hosts: null,
      actions_: null,
      scripts_: null,
      selectedHost: null,
    };
  },

  computed: {
    host() {
      if (!this.hosts) return null;
      return this.hosts[this.selectedHost];
    },

    actionsByHost() {
      return Object.entries({ ...(this.actions_ || {}), ...(this.scripts_ || {}) }).reduce((obj, [name, action]) => {
        const hosts = action.hosts || [];
        for (const host of hosts) {
          if (!(host in obj)) {
            obj[host] = {};
          }

          obj[host][name] = action;
        }

        return obj;
      }, {});
    },

    actions() {
      return this.actionsByHost[this.selectedHost];
    },
  },

  methods: {
    async loadHosts() {
      this.hosts = await this.getHosts();
      if (!this.selectedHost) {
        this.selectedHost = Object.entries(this.hosts)[0][0];
      }
    },

    async loadActions() {
      this.actions_ = await this.getActions();
    },

    async loadScripts() {
      this.scripts_ = await this.getScripts();
    },

    async run_(action) {
      let ret = null;
      if (action in this.actions_) {
        ret = await this.run(this.actions[action], this.host);
      } else if (action in this.scripts_) {
        ret = await this.runScript(this.actions[action].script, this.host);
      } else {
        console.warn('No such action or script: ' + action);
        return;
      }

      this.notify('', 'Action executed');
      return ret;
    },
  },

  created() {
    this.loadHosts();
    this.loadActions();
    this.loadScripts();
  },
};
</script>

<style lang="scss" scoped>
.container {
  width: 30em;
  max-height: 20em;
  display: flex;
}

.main {
  width: 100%;
  height: 100%;
  position: relative;
}

.head {
  width: 100%;
  height: 2.5em;
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
  box-shadow: 0 2px 4px 1px rgba(0, 0, 0, 0.05);

  .host-selector,
  .settings {
    padding: 0.5em;
  }

  .host-selector {
    width: 80%;
  }

  .settings {
    width: 20%;
    text-align: right;
  }
}

.body {
  height: calc(100% - 2.5em);
  overflow: auto;

  .action {
    display: flex;
    align-items: center;
    padding: 0.5em 1em;
    cursor: pointer;
    border-bottom: 1px solid rgba(0, 0, 0, 0.15);

    &:nth-child(even) {
      background: rgba(0, 0, 0, 0.03);
    }

    &:hover {
      background-color: rgba(200, 255, 220, 0.7);
    }

    .icon {
      width: 7.5%;
      opacity: 0.65;
    }
  }
}

.no-hosts,
.no-actions,
.loading {
  height: 100%;
  margin: auto;
  font-size: 1.3em;
  text-align: center;
  color: rgba(0, 0, 0, 0.8);
  letter-spacing: 0.025em;
}
</style>

<!-- vim:sw=2:ts=2:et: -->
