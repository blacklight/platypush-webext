<template>
  <div class="page run">
    <h2>Run a command on {{ host.name }}</h2>
    <form @submit.prevent="runAction">
      <div class="row action-name">
        <input type="text" name="action" v-model="action.name" placeholder="Action" autocomplete="off" :disabled="loading" />
        <span class="help">
          &nbsp; <a href="https://platypush.readthedocs.io/en/latest/plugins.html" target="_blank">Plugins reference</a>. Use <tt>$URL$</tt> as argument value to denote the current
          URL.
        </span>
      </div>

      <div class="row" v-for="(arg, i) in action.args" :key="i">
        <div class="label">
          <input type="text" :name="'arg' + i" v-model="arg.name" placeholder="Name" autocomplete="off" :disabled="loading" />
        </div>

        <div class="value">
          <input type="text" :name="arg.name" v-model="arg.value" data-type="argument" placeholder="Value" autocomplete="off" :disabled="loading" />
          <button type="button" @click="action.args.splice(i, 1)" :disabled="loading"><i class="fas fa-trash" /></button>
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

export default {
  name: 'Run',
  mixins: [mixins],
  props: {
    host: Object,
  },

  data() {
    return {
      actionResponse: null,
      actionError: null,
      action: {
        name: null,
        args: [],
      },
    };
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

      try {
        this.actionResponse = await this.run(this.action, this.host);
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
  },

  created() {
    this.clearAction();
  },
};
</script>

<style lang="scss" scoped>
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
