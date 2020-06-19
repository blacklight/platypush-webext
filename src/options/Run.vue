<template>
  <div class="page run">
    <h2>Run a command on {{ host.name }}</h2>

    <div class="mode-selector">
      Action mode

      <div class="buttons">
        <input type="radio" value="request" id="_request" v-model="actionMode" />
        <label for="_request"> &nbsp; Request</label>
        <input type="radio" value="script" id="_script" v-model="actionMode" />
        <label for="_script"> &nbsp; Script</label>
      </div>
    </div>

    <div v-if="actionMode === 'request'">
      <div class="help">
        &nbsp; <a href="https://platypush.readthedocs.io/en/latest/plugins.html" target="_blank">Plugins reference</a>. Use <tt>$URL$</tt> as argument value to denote the current
        URL. You can also call remotely stored procedure through <tt>procedure.&lt;procedure_name&gt;</tt>.
      </div>

      <form ref="runForm" @submit.prevent="runAction">
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
              :placeholder="arg.doc && arg.doc.length ? arg.doc : 'Value'"
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

        <div class="row buttons" v-if="!saveMode">
          <button type="button" @click="saveMode = true" :disabled="loading || !(action.name && action.name.length && action.name in actions)">
            <i class="fas fa-save" /> &nbsp; Save Action
          </button>
        </div>
      </form>
    </div>

    <div v-else>
      <form ref="runForm" @submit.prevent="runAction">
        <PrismEditor v-model="script" language="js" />

        <div class="row buttons">
          <button type="button" @click="saveMode = true" :disabled="loading || script === scriptTemplate" v-if="!saveMode"><i class="fas fa-save" /> &nbsp; Save Script</button>
          <button type="submit" :disabled="loading"><i class="fas fa-play" /> &nbsp; Run</button>
        </div>
      </form>
    </div>

    <form class="save-form" ref="scriptForm" @submit.prevent="save" v-if="saveMode">
      <div class="row">
        <input type="text" name="displayName" placeholder="Display name" />
      </div>

      <div class="row">
        <input type="text" name="iconClass" placeholder="FontAwesome icon class (e.g. 'fas fa-play')" />
      </div>

      <div class="row multiple-host-selector">
        <div class="desc">
          Install script on these devices
        </div>

        <MultipleHostSelector :hosts="hosts" :selected="[host.name]" />
      </div>

      <div class="row buttons">
        <button type="submit" :disabled="loading"><i class="fas fa-save" /> &nbsp; Save {{ actionMode === 'request' ? 'Action' : 'Script' }}</button>
        <button type="button" @click="saveMode = false" :disabled="loading"><i class="fas fa-times" /> &nbsp; Cancel</button>
      </div>
    </form>

    <div class="code response" v-text="actionResponse" v-if="actionResponse && (actionResponse.length || Object.keys(actionResponse).length)" />
    <div class="code error" v-text="actionError" v-if="actionError && actionError.length" />
  </div>
</template>

<script>
import 'prismjs';
import 'prismjs/themes/prism.css';
import PrismEditor from 'vue-prism-editor';

import mixins from '../utils';
import Autocomplete from './Autocomplete';
import MultipleHostSelector from './MultipleHostSelector';

export default {
  name: 'Run',
  mixins: [mixins],
  props: {
    host: Object,
    scriptTemplate: {
      type: String,
      default: `async (app, host, browser, window) => {
  // Run some action on the host
  const status = await app.run({ name: 'music.mpd.pause' }, host);

  // Send notifications to the browser
  app.notify(status.state, 'Music status changed');

  // Return values back to the app
  return status;
}`,
    },
  },

  components: {
    Autocomplete,
    MultipleHostSelector,
    PrismEditor,
  },

  data() {
    return {
      plugins: {},
      pluginsLoading: false,
      procedures: {},
      saveMode: false,
      actionResponse: null,
      actionError: null,
      hosts: {},
      script: this.scriptTemplate,
      actionMode: 'request',
      action: {
        name: null,
        args: [],
      },
    };
  },

  computed: {
    actions() {
      let plugins = {};
      let procedures = {};

      if (this.plugins) {
        plugins = Object.values(this.plugins).reduce((obj, plugin) => {
          return Object.values(plugin.actions).reduce((obj, action) => {
            obj[plugin.name + '.' + action.name] = action;
            return obj;
          }, obj);
        }, {});
      }

      if (this.procedures) {
        procedures = Object.entries(this.procedures).reduce((obj, [name, args]) => {
          obj['procedure.' + name] = args;
          return obj;
        }, {});
      }

      return { ...plugins, ...procedures };
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
        return { args: {} };
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

    getActionArgs() {
      return [...this.$refs.runForm.querySelectorAll('[data-type="arg"]')].reduce((obj, el) => {
        obj[el.name] = el.value;
        return obj;
      }, {});
    },

    async runAction() {
      this.loading = true;

      try {
        if (this.actionMode === 'request') {
          this.actionResponse = await this.run(
            {
              name: this.action.name,
              args: this.getActionArgs(),
            },
            this.host
          );
        } else {
          this.actionResponse = await this.runScript(this.script, this.host);
        }

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

        this.procedures = await this.run({ name: 'inspect.get_procedures' }, this.host);
      } finally {
        this.pluginsLoading = false;
      }
    },

    async save(event) {
      return this.actionMode === 'request' ? await this.storeAction(event) : await this.storeScript(event);
    },

    async storeScript(event) {
      const saveForm = event.target;
      const displayName = saveForm.displayName.value.trim();
      const iconClass = saveForm.iconClass.value.trim();
      const hosts = [...saveForm.querySelectorAll('input[data-type="host"]:checked')].map(el => el.value);

      if (!displayName.length) {
        this.notify('Please specify an action name', 'No action name provided');
        return;
      }

      if (!hosts.length) {
        this.notify('Please specify at least one device where the action should run', 'No devices provided');
        return;
      }

      const script = {
        type: this.actionMode,
        displayName: displayName,
        iconClass: iconClass,
        hosts: hosts,
        script: this.script,
      };

      await this.saveScript(script);
    },

    async storeAction(event) {
      const saveForm = event.target;
      const displayName = saveForm.displayName.value.trim();
      const iconClass = saveForm.iconClass.value.trim();
      const hosts = [...saveForm.querySelectorAll('input[data-type="host"]:checked')].map(el => el.value);

      if (!displayName.length) {
        this.notify('Please specify an action name', 'No action name provided');
        return;
      }

      if (!hosts.length) {
        this.notify('Please specify at least one device where the action should run', 'No devices provided');
        return;
      }

      const action = {
        type: this.actionMode,
        displayName: displayName,
        iconClass: iconClass,
        hosts: hosts,
        name: this.action.name,
        args: this.getActionArgs(),
      };

      await this.saveAction(action);
    },

    async loadHosts() {
      this.hosts = await this.getHosts();
    },

    onActionChange(action) {
      this.action.name = action;
      this.action.args = [];
    },
  },

  created() {
    this.clearAction();
    this.loadHosts();
    this.loadPlugins();
  },
};
</script>

<style lang="scss" scoped>
.mode-selector {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 1em 0;

  .buttons {
    display: flex;
    align-items: center;
    margin-left: 1em;

    input[type='radio'] {
      margin-left: 1em;
    }
  }
}

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

.save-form {
  margin-top: 2em;

  input[type='text'] {
    width: 60%;
    min-width: 20em;
    max-width: 35em;
  }
}

.multiple-host-selector {
  display: flex;
  flex-direction: column;
  align-items: flex-start !important;
  margin-top: 2em;

  .desc {
    margin-bottom: 0.75em;
  }
}
</style>

<!-- vim:sw=2:ts=2:et: -->
