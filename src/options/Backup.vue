<template>
  <div class="page backup">
    <h2>Backup the current configuration</h2>

    <div class="container">
      <textarea v-text="loading ? 'Loading...' : config" :disabled="loading" />
    </div>
  </div>
</template>

<script>
import mixins from '../utils';

export default {
  name: 'Backup',
  mixins: [mixins],
  data() {
    return {
      config: {},
    };
  },

  created() {
    const self = this;
    this.loadConfig().then(config => {
      self.config = config;
    });
  },
};
</script>

<!-- vim:sw=2:ts=2:et: -->
