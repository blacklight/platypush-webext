global.browser = require('webextension-polyfill');

const context = {
  targetElement: null,
};

browser.runtime.onMessage.addListener(async message => {
  switch (message.type) {
    case 'getURL':
      return Promise.resolve(window.location.href);

    case 'setURL':
      window.location.href = message.url;
      break;

    case 'getDOM':
      return Promise.resolve(document.getElementsByTagName('html')[0].outerHTML);

    case 'setDOM':
      document.documentElement.innerHTML = message.html;
      break;

    case 'getTargetElement':
      return Promise.resolve(context.targetElement ? context.targetElement.outerHTML : null);
  }
});

document.addEventListener('contextmenu', event => {
  context.targetElement = event.target;
});

// vim:sw=2:ts=2:et:
