global.browser = require('webextension-polyfill');

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'getURL':
      sendResponse(window.location.href);
      break;

    case 'getBody':
      sendResponse(document.body.innerHTML);
      break;

    case 'setBody':
      document.body.innerHTML = message.html;
      break;
  }
});

// vim:sw=2:ts=2:et:
