/**
 * This script shows some of the capabilities of the Platypush Script API, and how
 * you can leverage the provided API to create custom scripts that can be executed
 * from anywhere in your browser.
 *
 * In order to create a new script:
 *
 * 1. Make sure that you have added at least one Platypush device in the extension
 *    configuration.
 *
 * 2. Select the device from the menu -> Run Action -> select "Script" on "Action mode".
 *
 * 3. Create your script, test it, and when you're happy save it. It will be listed
 *    among the available actions and you can run it on any tab either from the toolbar
 *    menu or from any context menu.
 *
 * 4. Note: some of the APIs (like those used to access the DOM or the current
 *    tab) won't be available in the context of the extension (i.e. when you test
 *    your script on the extension page) due to browser sandboxing limitations.
 */

export default {
  example: async (app, args) => {
    // Show the available arguments
    console.log('Arguments', args);

    /* Output:
     * args = {
     *   // This is the Platypush host selected in the context
     *   host: {
     *     // Host name
     *     name: "your_host",
     *     // Host IP/DNS name
     *     address: "192.168.1.3",
     *     // HTTP port
     *     port: 8008,
     *     // Websocket port
     *     websocketPort: 8009,
     *     // Uses SSL
     *     ssl: false,
     *     // Access token:
     *     token: "your_token"
     *   },
     *
     *   // Set if the action is executed from the context menu
     *   tabId: <selectedTabId>,
     *
     *   // Set if the action is executed from the context menu on a page element
     *   target: "<target html>"
     * }
     */

    // Show the available API
    console.log('API', app);

    // Run a Platypush action on the selected host (example: play/pause the music)
    const response = await app.run({ action: 'music.mpd.pause', args: {} }, args.host);
    console.log('Response from Platypush server', response);

    // Get the URL in the current tab
    const url = await app.getURL();
    console.log('URL', url);

    // Set the current page URL (i.e. change the current page)
    app.setURL('https://www.google.com/');

    // Open a URL in a new tab
    app.openTab('https://www.google.com/');

    // The app API also exposes the axios library for performing AJAX calls
    const apiResponse = await app.axios.get('https://yourdomain.com/api/v1/your/endpoint');
    console.log('API response', apiResponse);

    // Get the DOM object of the current page
    const dom = await app.getDOM();

    // You can perform any transformations on the DOM. For instance, the API
    // also exposes the Mercury Parser API for simplifying/distlling text from
    // HTML. You can use it to simplify the content of any page.
    const simplifiedDOM = await app.mercury.parse(url, dom.body.innerHTML);

    // Finally, you can use setDOM to replace the content of the page
    await app.setDOM(`<html><head>${simplifiedDOM.title}</head><body>${simplifiedDOM.content}</body></html>`);

    // If the user spawned this action from a context menu after clicking on
    // an element then you can grab the target element
    if (args.target) {
      console.log('Selected element (HTML)', args.target);

      // Convert HTML to DOM
      const targetDOM = app.HTML2DOM(args.target);
      console.log('Selected element (DOM)', targetDOM);
    }

    // Read and set the clipboard with getClipboard/setClipboard
    const text = await app.getClipboard();
    console.log('Text in clipboard', text);
    await app.setClipboard(`<p>${text}</p>`);

    // Anything returned from the function will be returned to the called
    return 42;
  },
};

// vim:sw=2:ts=2:et:
