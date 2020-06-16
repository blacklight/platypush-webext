<template>
  <div class="row hosts-selector">
    <span>
      <input type="checkbox" id="select-all-hosts" :checked="Object.keys(selectedHosts).length === Object.keys(hosts).length" @click="toggleSelectAll" />
      <label for="select-all-hosts">Select All</label>
    </span>

    <span v-for="(host, name) in hosts" :key="name">
      <input type="checkbox" :id="'host_' + name" :value="name" :checked="name in selectedHosts" data-type="host" @click="toggleHost" />
      <label :for="'host_' + name" v-text="name" />
    </span>
  </div>
</template>

<script>
import mixins from '../utils';

export default {
  name: 'MultipleHostSelector',
  mixins: [mixins],
  props: {
    hosts: Object,
    selected: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      selectedHosts: this.selected.reduce((obj, host) => {
        obj[host] = true;
        return obj;
      }, {}),
    };
  },

  methods: {
    toggleHost(event) {
      const hostname = event.target.value;
      if (hostname in this.selectedHosts) {
        delete this.selectedHosts[hostname];
      } else {
        this.selectedHosts[hostname] = true;
      }
    },

    toggleSelectAll() {
      if (Object.keys(this.selectedHosts).length === Object.keys(this.hosts).length) {
        this.selectedHosts = {};
      } else {
        this.selectedHosts = Object.keys(this.hosts).reduce((obj, hostname) => {
          obj[hostname] = true;
          return obj;
        }, {});
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.hosts-selector {
  span {
    display: flex;
    align-items: center;
    margin-right: 1em;

    label {
      margin-left: 0.3em;
    }
  }
}
</style>

<!-- vim:sw=2:ts=2:et: -->
