<template>
  <div class="page local-actions">
    <div class="no-actions" v-if="!Object.keys(actions).length">No actions available on this device</div>

    <div class="body" v-else>
      <h2 v-if="host">Actions stored for {{ host }}</h2>
      <h2 v-else>Actions</h2>

      <div class="categories">
        <div class="category" :class="{ selected: selectedCategory === category, empty: !category.length }" v-for="(actions, category) in actionsByCategory" :key="category">
          <div class="head" v-if="category.length && Object.keys(actions).length" @click="selectedCategory = selectedCategory === category ? null : category">
            <i class="fas" :class="selectedCategory === category ? 'fa-chevron-up' : 'fa-chevron-down'" />
            <span class="name" v-text="category" />
          </div>

          <div class="action-container" v-if="selectedCategory === category || !category.length">
            <form
              class="action"
              :class="{ selected: selectedAction === name }"
              v-for="(action, name) in actions"
              :key="name"
              @submit.prevent="action.type === 'request' ? runAction : _runScript"
            >
              <div class="action-head" @click="toggleSelectedAction(name)">
                <div class="icon">
                  <i :class="action.iconClass" v-if="action.iconClass" />
                  <i class="fas fa-cog" v-else />
                </div>

                <div class="name" v-text="name" />

                <div class="controls">
                  <button type="button" class="run" :disabled="loading" @click.stop="action.type === 'request' ? runAction() : _runScript()" v-if="selectedAction === name">
                    <i class="fas fa-play" />
                  </button>
                  <button type="button" class="remove" :disabled="loading" @click.stop="action.type === 'request' ? removeAction() : removeScript()" v-if="selectedAction === name">
                    <i class="fas fa-trash" />
                  </button>
                </div>
              </div>

              <div class="action-body" v-if="selectedAction === name">
                <div class="desc">
                  <div class="row" v-if="action.type === 'request'">
                    <div class="label">Action</div>
                    <div class="value" v-text="action.name" />
                  </div>

                  <div class="row" v-if="action.categories && Object.keys(action.categories).length">
                    <div class="label">Categories</div>
                    <div class="value" v-text="action.categories.join(', ')" />
                  </div>

                  <div class="row" :class="{ hidden: argValue == null || argValue == '' }" v-for="(argValue, argName) in action.args" :key="argName">
                    <div class="label" v-text="argName" />
                    <div class="value" v-text="argValue" />
                  </div>
                </div>

                <div class="script" v-if="action.type === 'script'">
                  <PrismEditor :code="action.script.toString()" language="js" :readonly="true" />
                </div>

                <div class="code" v-if="response || error || loading" :class="{ response: response, error: error }">
                  <span v-if="loading">Loading...</span>
                  <span v-text="error" v-else-if="error" />
                  <span v-text="response" v-else-if="response" />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import 'prismjs';
import 'prismjs/themes/prism.css';
import PrismEditor from 'vue-prism-editor';

import mixins from '../utils';

export default {
  name: 'LocalCommands',
  mixins: [mixins],
  components: { PrismEditor },
  props: {
    host: String,
  },

  data() {
    return {
      hosts: {},
      actions_: {},
      scripts: {},
      selectedAction: null,
      selectedCategory: null,
      response: null,
      error: null,
    };
  },

  computed: {
    actionsByHost() {
      return Object.entries({ ...this.actions_, ...this.scripts }).reduce((obj, [name, action]) => {
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
      if (!(this.host && this.host in this.actionsByHost)) {
        return {};
      }

      return Object.entries(this.actionsByHost[this.host]).reduce((obj, [name, action]) => {
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
      return this.host ? this.actionsByHost[this.host] || {} : this.actions_;
    },
  },

  methods: {
    async loadActions() {
      this.actions_ = await this.getActions();
    },

    async loadScripts() {
      this.scripts = await this.getScripts();
    },

    async loadHosts() {
      this.hosts = await this.getHosts();
    },

    async removeAction() {
      if (!this.selectedAction || !(this.selectedAction in this.actions_) || !confirm('Are you sure that you want to remove this action from this device?')) {
        return;
      }

      const action = this.actions_[this.selectedAction];
      const hostIndex = action.hosts.indexOf(this.host);
      if (hostIndex < 0) {
        return;
      }

      action.hosts.splice(hostIndex, 1);
      if (action.hosts.length === 0) {
        delete this.actions_[this.selectedAction];
      } else {
        this.actions_[this.selectedAction] = action;
      }

      await this.saveActions(this.actions_);
      await this.loadActions();
    },

    async removeScript() {
      if (!this.selectedAction || !(this.selectedAction in this.scripts) || !confirm('Are you sure that you want to remove this script from this device?')) {
        return;
      }

      const script = this.scripts[this.selectedAction];
      const hostIndex = script.hosts.indexOf(this.host);
      if (hostIndex < 0) {
        return;
      }

      script.hosts.splice(hostIndex, 1);
      if (script.hosts.length === 0) {
        delete this.scripts[this.selectedAction];
      } else {
        this.scripts[this.selectedAction] = script;
      }

      await this.saveScripts(this.scripts);
      await this.loadScripts();
    },

    async runAction() {
      if (!(this.selectedAction && this.host && this.selectedAction in this.actions)) {
        return;
      }

      const action = this.actions[this.selectedAction];
      this.error = null;

      try {
        this.response = await this.run(action, this.hosts[this.host]);
      } catch (e) {
        this.error = e.message;
      }
    },

    async _runScript() {
      if (!(this.selectedAction && this.host && this.selectedAction in this.scripts)) {
        return;
      }

      const script = this.scripts[this.selectedAction];
      this.error = null;

      try {
        this.response = await this.runScript(script.script, this.hosts[this.host]);
      } catch (e) {
        this.error = e.message;
      }
    },

    toggleSelectedAction(name) {
      this.response = null;
      this.error = null;
      this.selectedAction = this.selectedAction === name ? null : name;
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
form {
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
  margin: 0 -0.75em;

  &:not(.selected):nth-child(even) {
    .action-head {
      background: rgba(0, 0, 0, 0.03);
    }
  }

  &.selected {
    .action-head {
      background: rgba(200, 255, 220, 1);
      border-radius: 1em;
    }
  }

  &:first-child {
    border-top: 1px solid rgba(0, 0, 0, 0.1);
  }

  .action-head {
    display: flex;
    align-items: center;
    position: relative;
    padding: 1em;
    cursor: pointer;

    &:hover {
      background: rgba(200, 255, 220, 0.7) !important;
    }

    .icon {
      font-size: 1.2em;
      margin-right: 1.5em;
    }

    .controls {
      position: absolute;
      right: 0.5em;
    }

    button {
      background: white;
      padding: 0.3em 1.3em;
      margin-right: 0.5em;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 1em;
    }
  }

  .action-body {
    .desc {
      display: flex;
      flex-direction: column;

      .row {
        display: flex;
        flex-direction: row;
        padding: 0.5em;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);

        .label {
          width: 20%;
          min-width: 10em;
          max-width: 30em;
        }

        &:hover {
          background-color: rgba(200, 255, 220, 0.4);
        }
      }
    }
  }
}

.category {
  border: 1px solid rgba(0, 0, 0, 0.075);
  margin: 0 -1em;
  padding: 0 1em;

  &.selected {
    box-shadow: 0 0 4px 2px rgba(0, 0, 0, 0.25);
    margin: 0 -0.65em;
    border-radius: 2em;
  }

  &:hover {
    &:not(.selected):not(.empty) {
      border-radius: 5em;
      background: rgba(200, 255, 220, 0.7);
    }
  }

  .head {
    padding: 1em 0.25em;
  }
}

.no-actions {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3em;
  letter-spacing: 0.025em;
  color: rgba(0, 0, 0, 0.8);
}
</style>

<!-- vim:sw=2:ts=2:et: -->
