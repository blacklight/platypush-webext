<template>
  <ul class="menu">
    <li class="host" v-for="(host, hostname) in hosts" :key="hostname" :class="{ selected: hostname === selectedHost }" @click="$emit('select', 'host', hostname)">
      <i class="fas fa-hdd" /> &nbsp; {{ host.name }}
      <ul class="host-menu" v-if="hostname === selectedHost">
        <li
          v-for="(option, optionName) in hostOptions"
          :key="optionName"
          :class="{ selected: selectedHostOption === optionName }"
          @click.stop="$emit('select', 'host', hostname, optionName)"
        >
          <i :class="option.iconClass" /> &nbsp; {{ option.displayName }}
        </li>
      </ul>
    </li>

    <li class="add" :class="{ selected: selectedTab === 'add' }" @click="$emit('select', 'add')"><i class="fas fa-plus" /> &nbsp; Add Device</li>
    <li class="config" :class="{ selected: selectedTab === 'config' }" @click="$emit('select', 'config')"><i class="fas fa-cog" /> &nbsp; Configuration</li>
  </ul>
</template>

<script>
export default {
  name: 'Menu',
  props: {
    hosts: Object,
    selectedTab: String,
    selectedHost: String,
    selectedHostOption: String,
  },

  computed: {
    hostOptions() {
      return {
        localProc: {
          displayName: 'Local Actions',
          iconClass: 'fas fa-puzzle-piece',
        },
        remoteProc: {
          displayName: 'Remote Procedures',
          iconClass: 'fas fa-database',
        },
        run: {
          displayName: 'Run Action',
          iconClass: 'fas fa-play',
        },
      };
    },
  },
};
</script>

<style lang="scss" scoped>
.menu {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  margin: 0;
  padding: 0;
  box-shadow: 1px 1px 1.5px 1px rgba(0, 0, 0, 0.5);

  @media screen and (max-width: 800px) {
    & {
      width: 45%;
    }
  }

  @media screen and (min-width: 800px) {
    & {
      width: 35%;
    }
  }

  @media screen and (min-width: 1024px) {
    & {
      width: 25%;
    }
  }

  li {
    display: block;
    cursor: pointer;
    padding: 1em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);

    &:hover {
      background-color: rgba(90, 140, 120, 1);
    }

    &.selected {
      background-color: rgba(80, 120, 110, 0.8);
      border: 0;
    }
  }

  .host.selected {
    padding-bottom: 0;
  }
}

.host-menu {
  margin: 0.5em -1em auto -1em;
  padding-left: 0;

  li {
    list-style-type: none;
    padding: 0.75em 2em;
    border-bottom: 0;

    &.selected {
      background-color: rgba(60, 140, 120, 0.9);
      padding-bottom: 0.75em;
    }
  }
}
</style>

<!-- vim:sw=2:ts=2:et: -->
