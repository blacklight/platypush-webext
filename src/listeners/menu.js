import utils from '../utils';

export default {
  async Listener(info, tab) {
    const [host, , action] = info.menuItemId.split(this.separator).slice(1);
    const target = await utils.methods.getTargetElement();

    if (action in this.actions) {
      await utils.methods.run(this.actions[action], this.hosts[host]);
    } else {
      await utils.methods.runScript(this.scripts[action].script, this.hosts[host], tab, target);
    }
  },
};

// vim:sw=2:ts=2:et:
