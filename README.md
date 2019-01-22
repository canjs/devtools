[![Build Status](https://travis-ci.org/canjs/devtools.svg?branch=master)](https://travis-ci.org/canjs/devtools)

# devtools
Chrome DevTools for CanJS.

## Architecture

There are many moving parts that make the devtools extension work. This is because Chrome's policies only allow access to certain things (the DOM, the `window`, etc) from specific scripts.

Each of these files is listed below, with their primary purpose, how they get executed, and the limitations imposed by Chrome's policies.

### manifest.json

This provides information to Chrome based on the [Manifest File Format](https://developer.chrome.com/apps/manifest). It kicks off execution of many of the scripts below.

### canjs-devtools-background.js

This is a [Background Script](https://developer.chrome.com/extensions/background_pages). It is configured to execute through the `manifest.json`:

```
"background": {
    "scripts": [ "canjs-devtools-background.js" ]
}
```

This script runs any time Chrome is open (even if devtools is not open). It is responsible for listening to messages from the `canjs-devtools-content-script.js` and keeping a list of frames that are using CanJS.

Whenever a new frame is found that is using CanJS, the background script will update the CanJS Extension icon to the "enabled" state.

### canjs-devtools-content-script.js

This is a [Content Script](https://developer.chrome.com/extensions/content_scripts). It is also configured to run through the `manifest.json`:

```
"content_scripts": [ {
    "all_frames": true,
    "js": [ "canjs-devtools-content-script.js" ],
    "matches": [ "*://*/*" ]
} ]
```

Content scripts have access to the DOM, but run in a separate JavaScript execution environment (and therefore **cannot** access the `window` of the user's page).

They also have access to _some_ Chrome APIs.

`canjs-devtools-content-script.js` is responsible for injecting the `canjs-devtools-injected-script.js` script into the user's page and for passing messages between the injected script and the background script.

Since `canjs-devtools-content-script.js` shares a `document` with `canjs-devtools-injected-script.js`, it uses `document.addEventListener` for listening for messages from `canjs-devtools-injected-script.js`.

And since it has access to some Chrome APIs, it uses `chrome.runtime.connect` to open a port that it can use to pass messages to the background script.

These messages are used for keeping a list of frames that are using CanJS.

### canjs-devtools-injected-script.js

This script runs in the user's page after it is injected by `canjs-devtools-content-script.js`. It adds the `window.__CANJS_DEVTOOLS__` global.

### index.html

This is the main page. It is set as the `"devtools_page"` in the manifest.json. It is not rendered. Its only purpose is to load `index.js`.

### index.js

This is loaded through a `<script>` tag in `index.html`. It creates the sidebar panes whenever there is an open frame that has CanJS installed.

### Sidebars - viewmodel-editor.js, bindings-graph.js, queues-stack.js

These are the UI of the sidebar panels. They retrieve data from the users page by calling functions on the `__CANJS_DEVTOOLS__` object through the `canjs-devtools-helpers.mjs` helper.

### canjs-devtools-helpers.mjs

This contains a helper used by the sidebars for running functions in _each_ of the frames that have CanJS. This uses ` chrome.devtools.inspectedWindow.eval`.

### can-devtools-components

This is a separate project that holds UI components used by devtools. This is kept separate so that these components can be developed using normal demo pages, tests, etc without having to worry about installing a Chrome Extension. The code for this project is hosted [here](https://github.com/canjs/can-devtools-components).

## Deploying a new version

New versions can be published through the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard).

To publish a new version, update the version number in the `manifest.json` and create a zip file of the entire devtools directory.

Currently, only [@phillipskevin](https://github.com/phillipskevin/) can publish new versions.
