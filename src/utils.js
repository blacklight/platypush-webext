import axios from 'axios';

export default {
  methods: {
    notify(message, title) {
      browser.notifications.create({
        type: 'basic',
        title: title,
        message: message,
      });
    },

    async run(action, host) {
      const url = (host.ssl ? 'https' : 'http') + '://' + host.address + ':' + host.port + '/execute';
      const config = {};
      let args = action.args;
      if (Array.isArray(action.args)) {
        args = action.args
          .filter(arg => arg.value && arg.value.length)
          .reduce((obj, arg) => {
            obj[arg.name] = arg.value;
            return obj;
          }, {});
      }

      if (host.token && host.token.length) {
        config.headers = {
          'X-Token': host.token,
        };
      }

      try {
        const msg = await axios.post(
          url,
          {
            type: 'request',
            action: this.action.name,
            args: args,
          },
          config
        );

        const errors = msg.data.response.errors;
        if (errors && errors.length) {
          throw new Error(errors[0]);
        }

        return msg.data.response.output;
      } catch (e) {
        this.notify('Request error', e.toString());
        throw e;
      }
    },
  },
};

// vim:sw=2:ts=2:et:
