<template>
  <div class="input autocomplete">
    <input
      type="text"
      name="action"
      autocomplete="off"
      ref="input"
      :value="value"
      :placeholder="placeholder"
      :disabled="disabled"
      @keydown="onKeyDown"
      @keyup="onKeyUp"
      @focus="showItems = true"
      @blur="showItems = false"
      @change="onInput"
    />

    <ul class="items" ref="items" v-if="filteredItems.length && showItems">
      <li class="item" :class="{ selected: selectedItem == i }" v-for="(item, i) in filteredItems" :key="i" v-text="item" @mousedown="onSelect" @touchstart="onSelect" />
    </ul>
  </div>
</template>

<script>
import mixins from '../utils';

function _filter(item, items) {
  return items.filter(i => i.startsWith(item));
}

export default {
  name: 'Autocomplete',
  mixins: [mixins],
  props: {
    items: Array,
    value: String,
    placeholder: String,
    filter: {
      type: Function,
      default: _filter,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      showItems: false,
      selectedItem: -1,
      lastValue: this.value,
      filteredItems: [],
    };
  },

  methods: {
    onInput() {
      const value = this.$refs.input.value;
      this.lastValue = value;
      this.filterItems();
      this.$emit('change', value);
    },

    onSelect(event) {
      const value = event.target.innerText;
      this.$refs.input.value = value;
      this.showItems = false;
      this.filterItems();
      this.$emit('change', value);
      this.$refs.input.focus();
    },

    onKeyDown(event) {
      if (event.key === 'Enter') {
        this.showItems = false;
        if (!this.$refs.items) {
          return;
        }

        const selected = this.$refs.items.querySelector('.selected');
        if (!selected) {
          return;
        }

        this.$refs.input.value = selected.innerText;
        this.$emit('change', selected.innerText);
        event.preventDefault();
      }
    },

    onKeyUp(event) {
      if (event.key === 'Escape') {
        this.showItems = false;
        return;
      }

      this.showItems = true;

      if (['ArrowUp', 'ArrowDown'].indexOf(event.key) >= 0) {
        switch (event.key) {
          case 'ArrowUp':
            if (this.selectedItem > 0) {
              this.selectedItem--;
            } else {
              this.selectedItem = this.filteredItems.length - 1;
            }
            break;

          case 'ArrowDown':
            if (this.selectedItem >= this.filteredItems.length - 1) {
              this.selectedItem = this.filteredItems.length ? 0 : -1;
            } else {
              this.selectedItem++;
            }
            break;
        }

        const self = this;
        setTimeout(() => {
          const selected = self.$refs.items.querySelector('.selected');
          if (selected) {
            self.$refs.items.scrollTop = selected.offsetTop;
          }
        }, 10);

        event.stopPropagation();
        return;
      }

      const value = this.$refs.input.value;
      if (this.lastValue === value) {
        return;
      }

      this.selectedItem = -1;
      this.lastValue = value;
      this.filterItems();
      this.$emit('change', value);
    },

    filterItems() {
      const value = this.$refs.input.value;
      if (!value.length) {
        this.filteredItems = [];
        return;
      }

      this.filteredItems = this.filter(value, this.items);
    },
  },
};
</script>

<style lang="scss" scoped>
.autocomplete {
  display: flex;
  flex-direction: column;
  position: relative;
}

.items {
  width: 100%;
  max-height: 20em;
  overflow-x: hidden;
  overflow-y: auto;
  position: absolute;
  top: 1.35em;
  background: white;
  z-index: 5;
  list-style: none;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.5em;
}

.item {
  cursor: pointer;
  padding: 0.5em;

  &.selected {
    background-color: rgba(200, 255, 220, 1);
  }

  &:hover {
    background-color: rgba(200, 255, 220, 0.7);
  }
}
</style>

<!-- vim:sw=2:ts=2:et: -->
