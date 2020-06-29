<template>
  <div class="page backup">
    <div class="head">
      <h2>Extension Configuration</h2>
      <form class="loader" ref="loader" @submit.prevent="loadURL">
        <div class="loader-head">
          Load configuration
          <input type="radio" id="_file" value="file" v-model="extConfigType" />
          <label for="_file">From file</label>
          <input type="radio" id="_url" value="url" v-model="extConfigType" />
          <label for="_url">From URL</label>
        </div>

        <div class="loader-body">
          <input type="file" name="file" placeholder="Configuration file" accept="application/json, text/x-json, text/plain" @change="uploadFile" v-if="extConfigType === 'file'" />
          <input type="text" name="url" placeholder="Configuration URL" v-model="extURL" v-if="extConfigType === 'url'" />
          <input type="submit" value="Load" v-if="extConfigType === 'url'" />
        </div>
      </form>
    </div>

    <form class="content" ref="content" @submit.prevent="save">
      <div class="textarea">
        <PrismEditor name="text" v-model="config" :code="loading ? 'Loading...' : config" language="js" :emitEvents="true" />
        <!-- <textarea name="text" ref="text" v-model="config" v-text="loading ? 'Loading...' : config" @focus="onFocus" :disabled="loading" /> -->
      </div>

      <div class="buttons">
        <button type="button" :disabled="savedConfig === config" @click="reload"><i class="fas fa-undo" /> &nbsp; Undo</button>
        <button type="submit" :disabled="savedConfig === config"><i class="fas fa-save" /> &nbsp; Save</button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from 'axios';
import mixins from '../utils';

import 'prismjs';
import 'prismjs/themes/prism.css';
import PrismEditor from 'vue-prism-editor';

export default {
  name: 'Backup',
  mixins: [mixins],
  components: { PrismEditor },

  data() {
    return {
      config: null,
      savedConfig: null,
      extConfigType: 'file',
      extURL: null,
    };
  },

  methods: {
    onFocus(event) {
      event.target.select();
      document.execCommand('copy');
      event.target.selectionStart = event.target.selectionEnd = 0;
      this.notify('Configuration copied to the clipboard');
    },

    async reload() {
      const config = await this.loadConfig();
      this.config = JSON.stringify(config, null, '  ');
      this.savedConfig = this.config;
    },

    async save() {
      this.loading = true;

      try {
        const config = JSON.parse(this.config);
        await this.saveConfig(config);
        await this.reload();
        this.$emit('reload');
      } catch (e) {
        console.warn(e);
        this.notify(e.message, 'Could not save the configuration');
      } finally {
        this.loading = false;
      }
    },

    uploadFile(event) {
      if (!(event.target.files && event.target.files.length)) {
        return;
      }

      const self = this;
      const reader = new FileReader();
      this.loading = true;

      reader.onload = evt => {
        self.config = evt.target.result;
        self.loading = false;
      };

      reader.onerror = evt => {
        this.notify(reader.error, 'Could not read the file');
        self.loading = false;
      };

      reader.readAsText(event.target.files[0]);
    },

    async loadURL(event) {
      const url = event.target.url.value.trim();
      this.loading = true;

      try {
        const response = await axios.get(url);
        this.config = JSON.stringify(response.data, null, '  ');
      } catch (e) {
        console.warn(e);
        this.notify(e.message, 'Unable to parse the URL');
      } finally {
        this.loading = false;
      }
    },
  },

  created() {
    this.reload();
  },
};
</script>

<style lang="scss" scoped>
$head-height: 10em;
$buttons-height: 5em;

.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0 !important;

  .head,
  .content {
    padding: 0 1em;
  }

  .head {
    height: $head-height;
  }

  .content {
    height: calc(100% - #{$head-height});

    .textarea {
      height: calc(100% - #{$buttons-height});
      overflow: auto;

      pre {
        border: 1px dotted #888;
        border-radius: 2em;
      }
    }

    .buttons {
      height: $buttons-height;
      display: flex;
      align-items: center;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
    }
  }
}

.loader {
  margin-bottom: 1em;

  .loader-head {
    margin-bottom: 1em;
  }

  .loader-body {
    display: flex;
    align-items: center;
    position: relative;
  }

  [type='text'] {
    width: 80%;
    min-width: 10em;
    max-width: 40em;
    margin: 0;
  }

  [type='submit'] {
    position: absolute;
    right: 0;
  }
}
</style>

<!-- vim:sw=2:ts=2:et: -->
