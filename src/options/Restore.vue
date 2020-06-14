<template>
  <div class="page restore">
    <h2>Load configuration from a previous backup</h2>

    <div class="container">
      <textarea v-text="loading ? 'Loading...' : config" :disabled="loading" />
    </div>
  </div>
</template>

<script>
import mixins from '../utils';

export default {
  name: 'Restore',
  mixins: [mixins],
  data() {
    return {
      config: {},
    };
  },

  created() {
    this.config = this.loadConfig();
  },
};
</script>

<!-- vim:sw=2:ts=2:et: -->
