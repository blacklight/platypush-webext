<template>
  <div class="page add">
    <h2>Add a new device</h2>
    <form class="host-form" ref="form" @submit.prevent="$emit('add', $event.target)">
      <input type="text" name="name" placeholder="Name" autocomplete="off" :disabled="loading" />
      <input type="text" name="address" placeholder="IP or hostname" @keyup="onAddrChange($refs.form)" autocomplete="off" :disabled="loading" />
      <input type="text" name="port" value="8008" placeholder="HTTP port" @keyup="onPortChange($refs.form)" autocomplete="off" :disabled="loading" />
      <input type="text" name="websocketPort" value="8009" placeholder="Websocket port" autocomplete="off" :disabled="loading" />
      <input type="text" name="token" placeholder="Access token" autocomplete="off" :disabled="loading" />
      <div class="row ssl">
        <input type="checkbox" name="ssl" :disabled="loading" />
        <label for="ssl">Use SSL</label>
      </div>

      <div class="buttons">
        <input type="submit" value="Add" :disabled="loading" />
      </div>
    </form>
  </div>
</template>

<script>
import mixins from '../utils';

export default {
  name: 'NewHost',
  mixins: [mixins],
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
