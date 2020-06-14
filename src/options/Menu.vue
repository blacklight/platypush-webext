<template>
  <ul class="menu">
    <li class="host" v-for="(host, i) in hosts" :key="i" :class="{ selected: i === selectedHost }" @click="$emit('select-host', i)">
      <i class="fas fa-hdd" /> &nbsp; {{ host.name }}
      <ul class="host-menu" v-if="i === selectedHost">
        <li v-for="(option, name) in hostOptions" :key="name" :class="{ selected: selectedHostOption === name }" @click.stop="$emit('select-host-option', name)">
          <i :class="option.iconClass" /> &nbsp; {{ option.displayName }}
        </li>
      </ul>
    </li>

    <li class="add" :class="{ selected: isAddHost }" @click="$emit('select-add-host')"><i class="fas fa-plus" /> &nbsp; Add Device</li>
    <li class="backup" :class="{ selected: isBackupMode }" @click="$emit('select-backup-mode')"><i class="fas fa-save" /> &nbsp; Backup Configuration</li>
    <li class="restore" :class="{ selected: isRestoreMode }" @click="$emit('select-restore-mode')"><i class="fas fa-window-restore" /> &nbsp; Restore Configuration</li>
  </ul>
</template>

<script>
export default {
  name: 'Menu',
  props: {
    hosts: Array,
    selectedHost: Number,
    selectedHostOption: String,
    isAddHost: Boolean,
    isBackupMode: Boolean,
    isRestoreMode: Boolean,
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
