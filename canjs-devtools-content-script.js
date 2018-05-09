var port = chrome.runtime.connect({ name: "canjs-devtools" });

// listen for messages passed from injected-script
// and pass them back to extension panels
document.addEventListener("__CANJS_DEVTOOLS_REGISTER__", function(response) {
	port.postMessage("register");
});

// inject script into page to add __CANJS_DEVTOOLS__ namespace to window
// and register page with devtools extension
function injectScript(el) {
    var s = document.createElement("script");
    s.src = chrome.extension.getURL("canjs-devtools-injected-script.js");
    el.appendChild(s);
}

injectScript( document.body );
