global.browser = require('webextension-polyfill');

const context = {
  targetElement: null,
};

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'getURL':
      sendResponse(window.location.href);
      break;

    case 'getDOM':
      sendResponse(document.getElementsByTagName('html')[0].outerHTML);
      break;

    case 'setDOM':
      document.getElementsByTagName('html')[0].innerHTML = message.html;
      break;

    case 'getTargetElement':
      sendResponse(context.targetElement ? context.targetElement.outerHTML : null);
      break;
  }
});

document.addEventListener('contextmenu', event => {
  context.targetElement = event.target;
});

// vim:sw=2:ts=2:et:
