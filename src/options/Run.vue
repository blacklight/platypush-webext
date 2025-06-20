<!--suppress HtmlFormInputWithoutLabel -->
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
        &nbsp; <a href="https://platypush.readthedocs.io/en/latest/plugins.html" target="_blank">Plugins reference</a>. Use <code>$URL$</code> as argument value to denote the
        current URL. You can also call remotely stored procedure through <code>procedure.&lt;procedure_name&gt;</code>.
      </div>

      <form ref="runForm" @submit.prevent="runAction">
        <div class="row action-head">
          <div class="action-name">
            <Autocomplete
              placeholder="Action"
              :source="actionsAutocomplete"
              :disableInput="loading"
              :name="action.name || ''"
              :initialValue="selectedAction ? selectedAction.action : null"
              :initialDisplay="selectedAction ? selectedAction.action : null"
              @input="onActionChange"
            />
          </div>
          <div class="action-doc" v-if="actionTemplate.doc">
            <vue-markdown :source="actionTemplate.doc" v-if="actionTemplate.doc" />
          </div>
        </div>

        <div class="row" v-for="(arg, name) in action.defaultArgs" :key="name">
          <div class="label">
            <input type="text" :name="'arg_' + name" :value="name" autocomplete="off" disabled />
          </div>
          <div class="value">
            <input
              type="text"
              data-type="arg"
              autocomplete="off"
              v-model="arg.value"
              :name="name"
              :placeholder="arg.doc && arg.doc.length ? arg.doc : 'Value'"
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
            <button type="button" @click="removeActionArgument(i)" :disabled="loading">
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
          <button type="button" @click="toggleSaveMode" :disabled="loading || !(action.name && action.name.length && action.name in actions)">
            <i class="fas fa-save" /> &nbsp; Save Action
          </button>
        </div>
      </form>
    </div>

    <div v-else>
      <div class="help">
        A script is a custom snippet of JavaScript that can be like a normal action, but it can also access the context of the browser and run more complex logic. The available
        script API provides many tools to interact both with other Platypush devices and with the browser context. You can check some examples
        <a href="https://gist.github.com/BlackLight/d80c571705215924abc06a80994fd5f4" target="_blank">here</a>.
      </div>

      <form ref="runForm" @submit.prevent="runAction">
        <PrismEditor v-model="script" language="js" />

        <div class="row buttons">
          <button type="button" @click="toggleSaveMode" :disabled="loading || script === scriptTemplate" v-if="!saveMode"><i class="fas fa-save" /> &nbsp; Save Script</button>
          <button type="submit" :disabled="loading"><i class="fas fa-play" /> &nbsp; Run</button>
        </div>
      </form>
    </div>

    <form class="save-form" ref="saveForm" @submit.prevent="save" v-if="saveMode">
      <div class="row">
        <input type="text" name="displayName" v-model="saveParams.name" placeholder="Display name" />
      </div>

      <div class="row">
        <input type="text" name="iconClass" v-model="saveParams.iconClass" placeholder="FontAwesome icon class (e.g. 'fas fa-play')" />
      </div>

      <div class="row">
        <input type="text" ref="color" name="color" v-model="saveParams.color" placeholder="HTML/CSS color" />
      </div>

      <div class="row">
        <vue-tags-input
          v-model="selectedCategory"
          :autocomplete-items="categoriesAutocomplete"
          :disabled="loading"
          :separators="[',', ';']"
          :tags="selectedCategories.map(cat => (typeof cat === 'object' ? cat : { text: cat }))"
          @tags-changed="onCategoriesChanged"
          placeholder="Categories"
        />
      </div>

      <div class="row icon-preview" v-if="saveParams.iconClass && saveParams.iconClass.length">
        <i :class="saveParams.iconClass" :style="{ color: saveParams.color && saveParams.color.length ? saveParams.color : 'initial' }" />
      </div>

      <div class="row multiple-host-selector">
        <div class="desc">
          Install script on these devices
        </div>

        <MultipleHostSelector :hosts="hosts" :selected="selectedHosts && selectedHosts.length ? selectedHosts : [host.name]" />
      </div>

      <div class="row command-selector" v-if="Object.keys(commands).length">
        <label for="_command-selector">Key binding associated to this action</label>
        <select id="_command-selector" v-model="command">
          <option value="">-- No key binding</option>
          <option v-for="command in commands" :key="command.name" :value="command.name" v-text="command.shortcut" />
        </select>
      </div>

      <div class="row buttons">
        <button type="submit" :disabled="loading"><i class="fas fa-save" /> &nbsp; Save {{ actionMode === 'request' ? 'Action' : 'Script' }}</button>
        <button type="button" @click="toggleSaveMode" :disabled="loading"><i class="fas fa-times" /> &nbsp; Cancel</button>
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
import VueMarkdown from 'vue-markdown';

import mixins from '../utils';
import Autocomplete from 'vuejs-auto-complete';
import VueTagsInput from '@johmun/vue-tags-input';
import MultipleHostSelector from './MultipleHostSelector';

export default {
  name: 'Run',
  mixins: [mixins],
  props: {
    host: Object,
    selectedAction: Object,
    selectedScript: Object,
    scriptTemplate: {
      type: String,
      default: `async (app, args) => {
  // Run some action on the host
  const status = await app.run({ action: 'music.mpd.pause' }, args.host);

  // Send notifications to the browser
  app.notify(status.state, 'Music status changed');

  // Return values back to the app
  return status;
}`,
    },
  },

  components: {
    Autocomplete,
    VueTagsInput,
    MultipleHostSelector,
    PrismEditor,
    VueMarkdown,
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
      storedActions: {},
      selectedCategory: '',
      selectedCategories: [],
      selectedHosts: null,
      actionMode: 'request',
      commands: {},
      command: '',
      action: {
        name: null,
        args: [],
        defaultArgs: {},
      },

      saveParams: {
        name: null,
        iconClass: null,
        color: null,
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

    actionsAutocomplete() {
      return Object.keys(this.actions).map(action => {
        return {
          id: action,
          name: action,
        };
      });
    },

    actionTemplate() {
      if (!(this.action.name in this.actions)) {
        return { args: {} };
      }

      return this.actions[this.action.name];
    },

    categories() {
      return Object.keys(
        Object.values(this.storedActions).reduce((obj, action) => {
          for (const category of action.categories || []) {
            obj[category] = true;
          }

          return obj;
        }, {})
      );
    },

    categoriesAutocomplete() {
      return this.categories.map(cat => {
        return {
          text: cat,
        };
      });
    },
  },

  methods: {
    clearAction() {
      this.action.name = null;
      this.action.args = [];
      this.action.defaultArgs = {};
      this.actionResponse = null;
      this.actionError = null;
    },

    getActionArgs() {
      return [...this.$refs.runForm.querySelectorAll('[data-type="arg"]')].reduce((obj, el) => {
        obj[el.name] = el.value;
        return obj;
      }, {});
    },

    async updateCommands() {
      try {
        this.commands = (await browser.commands.getAll()).reduce((obj, command) => {
          obj[command.name] = command;
          return obj;
        }, {});
      } catch (e) {
        console.log('Could not get configured commands', e);
      }
    },

    async runAction() {
      this.loading = true;

      try {
        if (this.actionMode === 'request') {
          this.actionResponse = await this.run(
            {
              action: this.action.name,
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

    removeActionArgument(i) {
      this.action.args.splice(i, 1);
    },

    toggleSaveMode() {
      this.saveMode = !this.saveMode;

      if (!this.saveMode) {
        this.saveParams = {
          name: null,
          iconClass: null,
          color: null,
        };
      }
    },

    async loadPlugins() {
      this.pluginsLoading = true;

      try {
        this.plugins = await this.run(
          {
            action: 'inspect.get_all_plugins',
            args: {
              html_doc: false,
            },
          },
          this.host
        );

        this.procedures = await this.run({ action: 'inspect.get_procedures' }, this.host);
      } finally {
        this.pluginsLoading = false;
      }
    },

    async loadActions() {
      this.storedActions = await this.getActions();
    },

    async getCommand() {
      const action = this.saveParams.name.trim();
      const commands = await this.getCommands();
      const [command] = Object.entries(commands).filter(([, act]) => act === action)[0] || [];
      return command;
    },

    async save(event) {
      const action = event.target.displayName.value.trim();
      if (this.command && this.command.length) {
        await this.saveCommand(this.command, action);
      } else {
        const command = await this.getCommand();
        if (command) {
          await this.removeCommand(command);
        }
      }

      return this.actionMode === 'request' ? await this.storeAction(event) : await this.storeScript(event);
    },

    async storeScript(event) {
      const saveForm = event.target;
      const displayName = saveForm.displayName.value.trim();
      const iconClass = saveForm.iconClass.value.trim();
      const color = saveForm.color.value.trim();
      const hosts = [...saveForm.querySelectorAll('input[data-type="host"]:checked')].map(el => el.value);

      if (!displayName.length) {
        await this.notify('Please specify an action name', 'No action name provided');
        return;
      }

      if (!hosts.length) {
        await this.notify('Please specify at least one device where the action should run', 'No devices provided');
        return;
      }

      const script = {
        type: this.actionMode,
        displayName: displayName,
        iconClass: iconClass,
        color: color.length ? color : null,
        hosts: hosts,
        script: this.script,
        categories: this.selectedCategories.map(obj => obj.text),
      };

      await this.saveScript(script);
    },

    async storeAction(event) {
      const saveForm = event.target;
      const displayName = saveForm.displayName.value.trim();
      const iconClass = saveForm.iconClass.value.trim();
      const color = saveForm.color.value.trim();
      const hosts = [...saveForm.querySelectorAll('input[data-type="host"]:checked')].map(el => el.value);

      if (!displayName.length) {
        await this.notify('Please specify an action name', 'No action name provided');
        return;
      }

      if (!hosts.length) {
        await this.notify('Please specify at least one device where the action should run', 'No devices provided');
        return;
      }

      const action = {
        type: this.actionMode,
        displayName: displayName,
        iconClass: iconClass,
        color: color.length ? color : null,
        hosts: hosts,
        action: this.action.name,
        args: this.getActionArgs(),
        categories: this.selectedCategories.map(obj => obj.text),
      };

      await this.saveAction(action);
    },

    async loadHosts() {
      this.hosts = await this.getHosts();
    },

    onActionChange(action) {
      if (action === this.action.name) {
        return;
      }

      this.action.name = action;
      this.action.args = [];

      if (action in this.actions) {
        this.action.defaultArgs = Object.entries(this.actions[action].args).reduce((obj, [name, arg]) => {
          obj[name] = { ...arg, value: arg.default };
          return obj;
        }, {});
      } else {
        this.action.defaultArgs = {};
      }
    },

    onCategoriesChanged(tags) {
      this.selectedCategories = tags;
    },

    async initAction() {
      const action = this.selectedAction || this.selectedScript;
      if (!action) {
        return;
      }

      this.saveMode = true;
      this.saveParams.name = action.displayName;
      this.saveParams.color = action.color;
      this.saveParams.iconClass = action.iconClass;
      this.selectedCategories = action.categories.map(cat => (typeof cat === 'string' ? { text: cat } : cat));
      this.selectedHosts = action.hosts;
      this.command = await this.getCommand();

      if (this.selectedAction) {
        this.actionMode = 'request';
        this.action.name = action.action;
        this.action.defaultArgs = Object.entries(action.args).reduce((obj, [name, value]) => {
          obj[name] = { value: value };
          return obj;
        }, {});
      } else {
        this.actionMode = 'script';
        this.script = action.script.toString();
      }
    },
  },

  created() {
    this.clearAction();
    this.loadHosts();
    this.loadPlugins();
    this.loadActions();
    this.initAction();
    this.updateCommands();
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
  max-width: 50em;
  margin-bottom: 1em;
}

.action-head {
  display: flex;
  flex-direction: column;

  .action-name {
    width: 20em;
  }

  .action-doc {
    width: 40em;
    margin: 0.5em auto auto 1em;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 1em;
    max-height: 10em;
    overflow: auto;
    background: rgba(250, 255, 240, 0.5);

    * {
      margin: 1em;
    }
  }
}

form {
  position: relative;

  .row {
    display: flex;
    align-items: center;
    margin-bottom: 0.5em;
    padding-bottom: 0.5em;

    &.action-head {
      align-items: flex-start;
    }
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

.icon-preview {
  font-size: 2em;
  margin-left: 0.2em;
}

.command-selector {
  label {
    margin-right: 1em;
  }
}
</style>

<!-- vim:sw=2:ts=2:et: -->
