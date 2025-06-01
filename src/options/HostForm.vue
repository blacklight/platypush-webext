<template>
  <div class="page" :class="{ action }">
    <h2 v-if="action === 'add'">Add a Platypush device</h2>
    <h2 v-else>Edit device {{ host.name || host.url }}</h2>

    <p class="help">
      You can bind a new Platypush device to the extension by specifying its name and base URL.<br /><br />
      The Platypush service needs to have <code>backend.http</code> enabled and be reachable from the browser.<br /><br />

      <b>Note:</b> If you want to connect to an HTTP-only Platypush service, you may need to disable HTTPS-only mode in your browser - or add an exception for the path of this
      extension.<br />
    </p>

    <form class="host-form" ref="form" @submit.prevent="submit">
      <label for="url">
        <b>Service URL</b>

        <p class="help">The base URL of the Platypush service, e.g. <code>http://localhost:8008</code>.<br /></p>

        <input type="text" id="url" name="url" ref="url" placeholder="Base URL" autocomplete="off" :disabled="loading" @keyup="onUrlInput" @blur="onUrlInput" />
      </label>

      <label for="name">
        <i>Device name</i>

        <p class="help">
          A human-readable name for the device, e.g. <code>My Platypush device</code>.<br />
          If left empty, the device name will be retrieved from the Platypush service configuration.<br />
        </p>
        <input type="text" id="name" name="name" placeholder="Name" autocomplete="off" :disabled="loading" />
      </label>

      <label for="token">
        <i>Access token</i>

        <p class="help">
          An optional access token to authenticate with the Platypush service.<br />
          You can generate a token from the Platypush web interface, under <code>Settings &gt; Access tokens</code>.<br />
          If left empty, the service will use the credentials of the currently logged-in user.<br />
        </p>
        <input type="text" id="token" name="token" placeholder="Access token" autocomplete="off" :disabled="loading" />
      </label>

      <div class="buttons" v-if="action === 'add'">
        <input type="submit" value="Add" :disabled="loading || !formValid" />
      </div>

      <div class="buttons" v-else-if="action === 'edit'">
        <input type="submit" value="Edit" :disabled="loading || !formValid" />
        <button type="button" @click="$emit('remove')" :disabled="loading">Remove</button>
      </div>
    </form>

    <div class="errors" v-if="errors.length">
      <h3>Errors</h3>
      <ul>
        <li class="error" v-for="(error, index) in errors" :key="index">{{ error }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import mixins from '../utils';

export default {
  mixins: [mixins],
  emits: ['add', 'edit', 'remove'],
  props: {
    host: {
      type: Object,
    },
  },

  data() {
    return {
      errors: [],
      formValid: false,
    };
  },

  computed: {
    action() {
      return Object.keys(this.host || {}).length ? 'edit' : 'add';
    },

    values() {
      return {
        url: this.$refs.form?.url?.value?.trim() || '',
        name: this.$refs.form?.name?.value?.trim() || '',
        token: this.$refs.form?.token?.value?.trim() || '',
      };
    },
  },

  methods: {
    async submit(event) {
      this.loading = true;
      this.errors = [];
      const form = event.target;

      try {
        this.errors = await this.validateForm(form);
        if (this.errors.length > 0) {
          return;
        }

        this.$emit(this.action, form);
      } catch (error) {
        this.errors.push('An error occurred while adding the device: ' + error.message);
      } finally {
        this.loading = false;
      }
    },

    async validateForm(form) {
      const errors = [];
      let url = null;

      try {
        url = new URL(form.url.value);
      } catch (e) {
        errors.push('Invalid URL format');
      }

      if (url?.protocol !== 'http:' && url?.protocol !== 'https:') {
        errors.push('URL must start with http:// or https://');
      } else if (url?.origin) {
        form.url.value = url.origin;
      } else {
        return errors;
      }

      try {
        const config = await this.getConfig(url.origin);
        if (!form.name.value?.length) {
          form.name.value = config?.device_id || url.hostname;
        }
      } catch (e) {
        errors.push('Failed to fetch device configuration: ' + e.message);
      }

      return errors;
    },

    async getConfig(url) {
      let response = {};

      try {
        response = await axios({
          method: 'post',
          url: url + '/execute',
          timeout: 5000,
          data: {
            type: 'request',
            action: 'config.get',
          },
          headers: {
            'Content-Type': 'application/json',
            ...(this.values.token.length && { Authorization: `Bearer ${this.values.token}` }),
          },
        });

        this.validateResponse(response);
        return response.data.response.output;
      } catch (e) {
        if (e.response?.status === 401) {
          // If the access token is set, then it's likely invalid - prompt the user to re-enter it
          if (this.values.token.length) {
            throw new Error('Invalid access token. Please check the token and try again.');
          }

          // Otherwise, the user is not authenticated to the service on this browser - redirect to the login page
          window.open(`${url}/login?redirect=${encodeURIComponent(window.location.href)}`, '_blank');
          throw new Error('You are not authenticated to the Platypush service on this host. Please log in and then try again.');
        }

        throw new Error(`Failed to fetch device configuration: ${e.message}`);
      }
    },

    validateResponse(response) {
      const errors = response.data.response.errors;
      if (errors && errors.length) {
        this.errors.push(...errors);
        throw errors[0];
      }
    },

    onUrlInput(event) {
      const url = (event?.target?.value || this.$refs.form?.url?.value || '').trim();
      if (!url.length) {
        this.formValid = false;
        return;
      }

      try {
        new URL(url);
        this.formValid = true;
      } catch (e) {
        this.formValid = false;
      }
    },

    parseUrlArgs() {
      const args = this.getUrlArgs();
      if (args.url) {
        this.$refs.form.url.value = args.url;
      }

      if (args.name) {
        this.$refs.form.name.value = args.name;
      }

      if (args.token) {
        this.$refs.form.token.value = args.token;
      }
    },

    onHostChange() {
      const action = this.host?.name ? 'edit' : 'add';
      this.parseUrlArgs();
      this.clearUrlArgs();
      this.setSelectedTab(action);
      this.setSelectedHost(this.host?.name);

      if (!this.$refs.form?.url) {
        return;
      }

      if (this.host?.url) {
        this.$refs.form.url.value = this.host.url;
      } else if (this.host?.name) {
        this.$refs.form.url.value = (this.host.ssl ? 'https://' : 'http://') + this.host.address + (this.host.port || this.host.port?.length ? `:${this.host.port}` : '');
      } else {
        this.$refs.form.url.value = '';
      }

      if (this.host) {
        this.$refs.form.name.value = this.host.name || '';
        this.$refs.form.token.value = this.host.token || '';
      }

      this.formValid = true;
    },
  },

  mounted() {
    const action = this.getSelectedTab();
    this.parseUrlArgs();
    this.clearUrlArgs();
    this.setSelectedTab(action);
    this.setUrlArgs({
      url: this.values.url,
      name: this.values.name,
      token: this.values.token,
    });

    if (action === 'edit') {
      this.$nextTick(() => {
        this.onHostChange();
      });
    } else if (this.values.url.length) {
      this.onUrlInput();
      this.$refs.form.requestSubmit();
    } else {
      this.formValid = false;
    }

    this.$nextTick(() => {
      this.$refs?.form?.url?.focus();
    });
  },

  watch: {
    errors: {
      handler(errors, oldErrors) {
        errors
          .filter(error => !oldErrors.includes(error))
          ?.forEach(error => {
            console.error(error);
            this.notify(error, 'Device configuration error');
          });
      },
    },

    host: {
      handler() {
        this.onHostChange();
      },
    },
  },
};
</script>

<!-- vim:sw=2:ts=2:et: -->
