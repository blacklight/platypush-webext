<template>
  <div class="page run">
    <h2>Run a command on {{ host.name }}</h2>

    <div class="help">
      &nbsp; <a href="https://platypush.readthedocs.io/en/latest/plugins.html" target="_blank">Plugins reference</a>. Use <tt>$URL$</tt> as argument value to denote the current
      URL.
    </div>

    <form ref="form" @submit.prevent="runAction">
      <div class="row action-head">
        <div class="action-name">
          <Autocomplete :items="Object.keys(actions)" :value="action.name" :disabled="loading" placeholder="Action" @change="onActionChange" />
        </div>
        <div class="action-doc" v-text="actionTemplate.doc" v-if="actionTemplate.doc" />
      </div>

      <div class="row" v-for="(arg, name) in actionTemplate.args" :key="name">
        <div class="label">
          <input type="text" :name="'arg_' + name" :value="name" autocomplete="off" disabled />
        </div>
        <div class="value">
          <input
            type="text"
            :name="name"
            :value="arg.default"
            data-type="arg"
            :placeholder="arg.doc && arg.doc.length ? arg.doc.substr(0, 50) : 'Value'"
            autocomplete="off"
            :disabled="loading"
          />
        </div>
      </div>

      <div class="row" v-for="(arg, i) in action.args" :key="i">
        <div class="label">
          <input type="text" :name="'arg_' + i" v-model="arg.name" placeholder="Name" autocomplete="off" :disabled="loading" />
        </div>
        <div class="value">
          <input type="text" :name="arg.name" v-model="arg.value" data-type="arg" placeholder="Value" autocomplete="off" :disabled="loading" />
          <button type="button" @click="action.args.splice(i, 1)" :disabled="loading">
            <i class="fas fa-trash" />
          </button>
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
</template>

<script>
import mixins from '../utils';
import Autocomplete from './Autocomplete';

export default {
  name: 'Run',
  mixins: [mixins],
  components: { Autocomplete },
  props: {
    host: Object,
  },

  data() {
    return {
      plugins: {},
      pluginsLoading: false,
      actionResponse: null,
      actionError: null,
      action: {
        name: null,
        args: [],
      },
    };
  },

  computed: {
    actions() {
      return Object.values(this.plugins).reduce((obj, plugin) => {
        return Object.values(plugin.actions).reduce((obj, action) => {
          obj[plugin.name + '.' + action.name] = action;
          return obj;
        }, obj);
      }, {});
    },

    filteredActions() {
      if (!(this.action.name && this.action.name.length)) return {};

      return Object.entries(this.actions)
        .filter(([name, action]) => name.startsWith(this.action.name))
        .reduce((obj, [name, action]) => {
          obj[name] = action;
          return obj;
        }, {});
    },

    actionTemplate() {
      if (!(this.action.name in this.actions)) {
        return { args: [] };
      }

      return this.actions[this.action.name];
    },
  },

  methods: {
    clearAction() {
      this.action.name = null;
      this.action.args = [];
      this.actionResponse = null;
      this.actionError = null;
    },

    async runAction() {
      this.loading = true;

      const args = [...this.$refs.form.querySelectorAll('[data-type="arg"]')].map(el => {
        return {
          name: el.name,
          value: el.value,
        };
      }, {});

      try {
        this.actionResponse = await this.run(
          {
            name: this.action.name,
            args: [...args, ...this.action.args],
          },
          this.host
        );

        this.actionError = null;
      } catch (e) {
        this.actionResponse = null;
        this.actionError = e.toString();
      } finally {
        this.loading = false;
      }
    },

    addActionArgument() {
      this.action.args.push({
        name: '',
        value: '',
      });
    },

    async loadPlugins() {
      this.pluginsLoading = true;

      try {
        this.plugins = await this.run(
          {
            name: 'inspect.get_all_plugins',
            args: {
              html_doc: false,
            },
          },
          this.host
        );
      } finally {
        this.pluginsLoading = false;
      }
    },

    onActionChange(action) {
      this.action.name = action;
      this.action.args = [];
    },
  },

  created() {
    this.clearAction();
    this.loadPlugins();
  },
};
</script>

<style lang="scss" scoped>
.help {
  margin-bottom: 1em;
}

.action-head {
  display: flex;
  align-items: center;

  .action-name {
    width: 20em;
  }

  .action-doc {
    width: 40em;
    margin: 0.5em auto auto 1em;
    white-space: pre;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 1em;
    padding: 1em;
    max-height: 10em;
    overflow: auto;
    background: rgba(250, 255, 240, 0.5);
  }
}

form {
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
