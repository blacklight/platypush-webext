const Service = (() => {
  const getCommands = async (message, sender, sendResponse) => {
    const commands = await browser.commands.getAll();
    sendResponse(commands);
  };

  return {
    getCommands: getCommands,
  };
})();

export default {
  async Listener(message, sender, sendResponse) {
    if (message.type in Service) {
      await Service[message.type](message, sender, sendResponse);
    } else {
      console.warn('No such handled message type', message.type);
    }
  },
};

// vim:sw=2:ts=2:et:
