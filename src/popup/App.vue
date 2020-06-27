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

        <div class="categories" v-else>
          <div class="category" :class="{ selected: selectedCategory === category }" v-for="(actions, category) in actionsByCategory" :key="category">
            <div class="head" v-if="category.length" @click="selectedCategory = selectedCategory === category ? null : category">
              <i class="fas" :class="selectedCategory === category ? 'fa-chevron-up' : 'fa-chevron-down'" />
              <span class="name" v-text="category" />
            </div>

            <div class="actions" v-if="selectedCategory === category || !category.length">
              <div class="action" v-for="(action, name) in actions" :key="name" @click="run_(name)">
                <div class="icon">
                  <i :class="action.iconClass" :style="{ color: action.color && action.color.length ? action.color : 'initial' }" v-if="action.iconClass" />
                  <i class="fas fa-cog" v-else />
                </div>

                <div class="name" v-text="name" />
              </div>
            </div>
          </div>
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
      selectedCategory: null,
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

    actionsByCategory() {
      if (!this.selectedHost) {
        return {};
      }

      return Object.entries(this.actionsByHost[this.selectedHost]).reduce((obj, [name, action]) => {
        if (!(action.categories && action.categories.length)) {
          if (!('' in obj)) {
            obj[''] = {};
          }

          obj[''][name] = action;
        } else {
          for (const category of action.categories) {
            if (!(category in obj)) {
              obj[category] = {};
            }

            obj[category][name] = action;
          }
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

      this.notify('Action ' + action + ' executed on ' + this.host.name);
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
body {
  overflow: hidden;
}

.container {
  width: 30em;
  display: flex;
  overflow: hidden;
}

.category {
  &.selected {
    box-shadow: 0 0 4px 2px rgba(0, 0, 0, 0.25);
    border-radius: 2em;
    margin: 0 0.2em;
  }
}

.main {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;

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
}

.body {
  height: calc(100% - 2.5em);
  max-height: 35em;
  overflow-y: auto;
  overflow-x: hidden;

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
  padding: 2em;
  font-size: 1.3em;
  text-align: center;
  color: rgba(0, 0, 0, 0.8);
  letter-spacing: 0.025em;
}
</style>

<!-- vim:sw=2:ts=2:et: -->
