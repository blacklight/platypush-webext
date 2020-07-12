import utils from '../utils';

export default {
  async Listener(command) {
    const [commands, hosts, actions, scripts] = await Promise.all([utils.methods.getCommands(), utils.methods.getHosts(), utils.methods.getActions(), utils.methods.getScripts()]);

    if (command in commands) {
      const actionName = commands[command];
      if (actionName in actions) {
        const action = actions[actionName];
        const host = hosts[Object.values(action.hosts)[0]];
        return await utils.methods.run(action, host);
      }

      if (actionName in scripts) {
        const script = scripts[actionName];
        const host = hosts[Object.values(script.hosts)[0]];
        return await utils.methods.runScript(script.script, host);
      }

      console.warn('No such action nor script', actionName);
    }
  },
};

// vim:sw=2:ts=2:et:
