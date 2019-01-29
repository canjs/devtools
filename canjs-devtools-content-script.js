var port = chrome.runtime.connect({ name: "canjs-devtools" });

// listen for messages passed from injected-script
// and pass them back to the background script
document.addEventListener("__CANJS_DEVTOOLS_EVENT__", function(ev) {
	port.postMessage(ev.detail);
});

// inject script into page to add __CANJS_DEVTOOLS__ namespace to window
// and register page with devtools extension
function injectScript(el) {
    var s = document.createElement("script");
    s.src = chrome.extension.getURL("canjs-devtools-injected-script.js");
    el.appendChild(s);
}

injectScript( document.documentElement );
