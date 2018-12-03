import mocha from "steal-mocha";
import chai from "chai/chai";

import { Component, debug } from "can";
import "../canjs-devtools-injected-script";

const assert = chai.assert;

describe("canjs-devtools-injected-script", function() {
    let devtools;

    beforeEach(function() {
        // register devtools
        debug();

        // get access to devtools functions
        devtools = window.__CANJS_DEVTOOLS__;
    });

    it("getViewModelData", function() {
        const C = Component.extend({
            tag: "a-pp",
            view: "<p>{{name}}</p>",
            ViewModel: {
                first: { type: "string", default: "Kevin" },
                last: { type: "string", default: "McCallister" },
                get name() {
                    return this.first + " " + this.last;
                }
            }
        }); 

        const c = new C();
        const el = c.element;

        assert.deepEqual(
            devtools.getViewModelData(el).detail.viewModel,
            { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
            "gets viewmodel data from element with a viewmodel"
        );

        assert.deepEqual(
            devtools.getViewModelData(el.querySelector("p")).detail.viewModel,
            { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
            "gets viewmodel data from child of element with a viewmodel"
        );
    });

    it("getNearestElementWithViewModel", function() {
        const C = Component.extend({
            tag: "a-pp",
            view: "<p>{{name}}</p>",
            ViewModel: { }
        }); 

        const c = new C();
        const el = c.element;

        assert.deepEqual(
            devtools.getNearestElementWithViewModel(el, devtools.canNamespace),
            el,
            "gets element from element with a viewmodel"
        );

        assert.deepEqual(
            devtools.getNearestElementWithViewModel(el.querySelector("p"), devtools.canNamespace),
            el,
            "gets element from child of element with a viewmodel"
        );

    });

    it("getSerializedViewModel", function() {
        const C = Component.extend({
            tag: "a-pp",
            view: "<p>{{name}}</p>",
            ViewModel: {
                first: { type: "string", default: "Kevin" },
                last: { type: "string", default: "McCallister" },
                get name() {
                    return this.first + " " + this.last;
                }
            }
        }); 

        const c = new C();
        const el = c.element;

        assert.deepEqual(
            devtools.getSerializedViewModel(el, devtools.canNamespace),
            { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
            "gets viewmodel data"
        );
    });

    it("updateViewModel", function() {
        const C = Component.extend({
            tag: "a-pp",
            view: "<p>{{name}}</p>",
            ViewModel: {
                first: { type: "string", default: "Kevin" },
                last: { type: "string", default: "McCallister" },
                get name() {
                    return this.first + " " + this.last;
                }
            }
        }); 

        const c = new C();
        const el = c.element;

        assert.deepEqual(
            devtools.getSerializedViewModel(el, devtools.canNamespace),
            { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
            "default viewmodel data"
        );

        devtools.updateViewModel(el, { first: "Marty", last: "McFly" });

        assert.deepEqual(
            devtools.getSerializedViewModel(el, devtools.canNamespace),
            { first: "Marty", last: "McFly", name: "Marty McFly" },
            "updated viewmodel data"
        );
    });

    it("getViewModelKeys", function() {
        const C = Component.extend({
            tag: "a-pp",
            view: "<p>{{name}}</p>",
            ViewModel: {
                first: { type: "string", default: "Kevin" },
                last: { type: "string", default: "McCallister" },
                get name() {
                    return this.first + " " + this.last;
                }
            }
        }); 

        const c = new C();
        const el = c.element;

        assert.deepEqual(
            devtools.getViewModelKeys(el, devtools.canNamespace),
            [ "first", "last", "name" ],
            "gets viewmodel keys"
        );

    });
});
