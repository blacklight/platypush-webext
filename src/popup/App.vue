<template>
  <div class="container">
    <div class="head">
      <a href="/options/options.html" target="_blank">
        <i class="fas fa-cog" />
      </a>
    </div>

    <div class="hosts">
      <div class="host" v-for="(host, i) in hosts" :key="i">
        <div class="name" v-text="host.name" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      hosts: {},
    };
  },

  methods: {},
};
</script>

<style scoped>
.container {
  width: 400px;
  font-size: 14px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif;
  padding: 0.1em 0.2em;
}

a,
a:visited {
  color: initial;
  text-decoration: underline dotted #888;
}

a:hover {
  opacity: 0.7;
}

h2 {
  font-size: 1.2em;
}
</style>

<!-- vim:sw=2:ts=2:et: -->
