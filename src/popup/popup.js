import Vue from 'vue';
import App from './App';

require('../common.scss');
global.browser = require('webextension-polyfill');
Vue.prototype.$browser = global.browser;

/* eslint-disable no-new */
new Vue({
  el: '#app',
  render: h => h(App),
});
