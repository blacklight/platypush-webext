<template>
  <div class="page edit">
    <h2>Edit device {{ host.name }}</h2>
    <form class="host-form" ref="form" @submit.prevent="$emit('save', $event.target)">
      <input type="text" name="name" placeholder="Name" :value="host.name" autocomplete="off" :disabled="loading" />
      <input type="text" name="address" placeholder="IP or hostname" :value="host.address" autocomplete="off" :disabled="loading" />
      <input type="text" name="port" placeholder="HTTP port" autocomplete="off" :value="host.port" :disabled="loading" @keyup="onPortChange($refs.form)" />
      <input type="text" name="websocketPort" :value="host.websocketPort" placeholder="Websocket port" autocomplete="off" :disabled="loading" />
      <input type="text" name="token" placeholder="Access token" :value="host.token" autocomplete="off" :disabled="loading" />
      <div class="row ssl">
        <input type="checkbox" name="ssl" v-model="host.ssl" :disabled="loading" />
        <label for="ssl">Use SSL</label>
      </div>

      <div class="buttons">
        <input type="submit" value="Edit" :disabled="loading" />
        <button type="button" @click="$emit('remove')" :disabled="loading">Remove</button>
      </div>
    </form>
  </div>
</template>

<script>
import mixins from '../utils';

export default {
  name: 'EditHost',
  mixins: [mixins],
  props: {
    host: Object,
  },
};
</script>

<style lang="scss" scoped>
form {
  input[type='text'] {
    .row.ssl {
      display: flex;
      align-items: center;
    }
  }
}
</style>

<!-- vim:sw=2:ts=2:et: -->
