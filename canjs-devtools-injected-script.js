// expose devtools namespace on the window
var __CANJS_DEVTOOLS__ = {
    selectedElement: null,
    can: null,

    patchMethod: function(can, package, method, sendData) {
        var devtools = this;

        var orig = can[package][method];
        can[package][method] = function() {
            var ret = orig.apply(this, arguments);

            // if an element is selected in devtools, send new ViewModel / Binding data
            if (devtools.selectedElement) {
                sendData();
            }

            return ret;
        };
    },

    setSelectedElement: function(el) {
        this.selectedElement = el;

        if (el) {
            var can = this.can = el.ownerDocument.defaultView.can;

            if (can && !can.__CANJS_DEVTOOLS_PATCHED__) {
                // patch CanJS methods to send data back to devtools
                this.patchMethod(can, "Reflect", "setKeyValue", this.sendViewModelData.bind(this));
                this.patchMethod(can, "Reflect", "getKeyValue", this.sendViewModelData.bind(this));
                this.patchMethod(can, "Reflect", "setValue", this.sendViewModelData.bind(this));
                this.patchMethod(can, "Reflect", "getValue", this.sendViewModelData.bind(this));
                // mark as patched so it is not patched more than once
                can.__CANJS_DEVTOOLS_PATCHED__ = true;
            }
        }
    },

    sendViewModelData: function() {
    },

    sendMessage: function(detail) {
        var msg = new CustomEvent("__CANJS_DEVTOOLS_MSG__", {	
            detail: detail
        });	

        document.dispatchEvent(msg);
    }
};

__CANJS_DEVTOOLS__.sendMessage({
    type: "register",
    frameURL: window.location.href
});

