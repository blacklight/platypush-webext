<template>
  <div class="page local-actions">
    <div class="body">
      <h2 v-if="Object.keys(actions).length && host">Actions stored for {{ host }}</h2>
      <h2 v-else-if="Object.keys(actions).length">Actions</h2>

      <form class="action" :class="{ selected: selectedAction === name }" v-for="(action, name) in actions" :key="name" @submit.prevent="runAction">
        <div class="head" @click="toggleSelectedAction(name)">
          <div class="icon">
            <i :class="action.iconClass" v-if="action.iconClass" />
            <i class="fas fa-cog" v-else />
          </div>

          <div class="name" v-text="name" />

          <div class="controls">
            <button type="button" class="run" :disabled="loading" @click.stop="runAction" v-if="selectedAction === name">
              <i class="fas fa-play" />
            </button>
            <button type="button" class="remove" :disabled="loading" @click.stop="removeAction" v-if="selectedAction === name">
              <i class="fas fa-trash" />
            </button>
          </div>
        </div>

        <div class="body" v-if="selectedAction === name">
          <div class="desc">
            <div class="row">
              <div class="label">Action</div>
              <div class="value" v-text="action.name" />
            </div>

            <div class="row" :class="{ hidden: argValue == null || argValue == '' }" v-for="(argValue, argName) in action.args" :key="argName">
              <div class="label" v-text="argName" />
              <div class="value" v-text="argValue" />
            </div>
          </div>

          <div class="code" v-if="response || error || loading" :class="{ response: response, error: error }">
            <span v-if="loading">Loading...</span>
            <span v-text="error" v-else-if="error" />
            <span v-text="response" v-else-if="response" />
          </div>
        </div>
      </form>

      <h2 v-if="Object.keys(scripts).length && host">Scripts stored for {{ host }}</h2>
      <h2 v-else-if="Object.keys(scripts).length">Scripts</h2>

      <form class="action" :class="{ selected: selectedScript === name }" v-for="(script, name) in scripts" :key="name" @submit.prevent="_runScript">
        <div class="head" @click="toggleSelectedScript(name)">
          <div class="icon">
            <i :class="script.iconClass" v-if="script.iconClass" />
            <i class="fas fa-cog" v-else />
          </div>
          <div class="name" v-text="name" />
          <div class="controls">
            <button type="button" class="run" :disabled="loading" @click.stop="_runScript" v-if="selectedScript === name">
              <i class="fas fa-play" />
            </button>
            <button type="button" class="remove" :disabled="loading" @click.stop="removeScript" v-if="selectedScript === name">
              <i class="fas fa-trash" />
            </button>
          </div>
        </div>

        <div class="body" v-if="selectedScript === name">
          <PrismEditor :code="script.script.toString()" language="js" :readonly="true" />

          <div class="code" v-if="response || error || loading" :class="{ response: response, error: error }">
            <span v-if="loading">Loading...</span>
            <span v-text="error" v-else-if="error" />
            <span v-text="response" v-else-if="response" />
          </div>
        </div>
      </form>
    </div>

    <div class="no-actions" v-if="!(Object.keys(actions).length || Object.keys(scripts).length)">No actions available on this device</div>
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
      selectedScript: null,
      response: null,
      error: null,
    };
  },

  computed: {
    actionsByHost() {
      return Object.entries(this.actions_).reduce((obj, [name, action]) => {
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
      if (!this.selectedScript || !(this.selectedScript in this.scripts) || !confirm('Are you sure that you want to remove this script from this device?')) {
        return;
      }

      const script = this.scripts[this.selectedScript];
      const hostIndex = script.hosts.indexOf(this.host);
      if (hostIndex < 0) {
        return;
      }

      script.hosts.splice(hostIndex, 1);
      if (script.hosts.length === 0) {
        delete this.scripts[this.selectedScript];
      } else {
        this.scripts[this.selectedScript] = script;
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
      if (!(this.selectedScript && this.host && this.selectedScript in this.scripts)) {
        return;
      }

      const script = this.scripts[this.selectedScript];
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
      this.selectedScript = null;
    },

    toggleSelectedScript(name) {
      this.response = null;
      this.error = null;
      this.selectedAction = null;
      this.selectedScript = this.selectedScript === name ? null : name;
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

  .head {
    display: flex;
    align-items: center;
    position: relative;
    padding: 1em;
    border-radius: 1em;
    cursor: pointer;

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

    &:hover {
      background-color: rgba(200, 255, 220, 0.7);
    }
  }

  &.selected {
    .head {
      background-color: rgba(200, 255, 220, 1);
    }
  }

  .body {
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
