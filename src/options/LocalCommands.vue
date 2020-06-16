<template>
  <div class="page local-actions">
    <h2 v-if="host">Actions stored locally for {{ host }}</h2>
    <h2 v-else>Actions stored locally</h2>

    <div class="body">
      <div class="no-actions" v-if="!actions || !Object.keys(actions).length">No actions available on this device</div>

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
    </div>
  </div>
</template>

<script>
import mixins from '../utils';

export default {
  name: 'LocalCommands',
  mixins: [mixins],
  props: {
    host: String,
  },

  data() {
    return {
      hosts: {},
      actions_: {},
      selectedAction: null,
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
      return this.host ? this.actionsByHost[this.host] : this.actions_;
    },
  },

  methods: {
    async loadActions() {
      this.actions_ = await this.getActions();
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

    toggleSelectedAction(name) {
      this.response = null;
      this.error = null;
      this.selectedAction = this.selectedAction === name ? null : name;
    },
  },

  created() {
    this.loadHosts();
    this.loadActions();
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
</style>

<!-- vim:sw=2:ts=2:et: -->
