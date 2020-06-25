global.browser = require('webextension-polyfill');

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
  }
});

// vim:sw=2:ts=2:et:
