import mocha from "steal-mocha";
import chai from "chai/chai";

import { Component, debug } from "can";
import "../canjs-devtools-injected-script";

const assert = chai.assert;

describe("canjs-devtools-injected-script", () => {
    let devtools;

    beforeEach(() => {
        // register devtools
        debug();

        // make sure devtools is not using global `can`
        delete window.can;

        // get access to devtools functions
        devtools = window.__CANJS_DEVTOOLS__;
    });

    describe("getViewModelData", () => {
        let el;

        beforeEach(() => {
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
            el = c.element;
        });

        it("works for elements with viewModels", () => {
            let { viewModel, tagName, type } = devtools.getViewModelData(el).detail;

            assert.equal(type, "viewModel", "type");
            assert.equal(tagName, "<a-pp>", "tagName");
            assert.deepEqual(
                viewModel,
                { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
                "viewModel"
            );
        });

        it("works for children of elements with viewModels", () => {
            let { viewModel, tagName, type } = devtools.getViewModelData(el.querySelector("p")).detail;

            assert.equal(type, "viewModel", "type");
            assert.equal(tagName, "<a-pp>", "tagName");
            assert.deepEqual(
                viewModel,
                { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
                "viewModel"
            );
        });
    });

    it("getNearestElementWithViewModel", () => {
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

    it("getSerializedViewModel", () => {
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

    it("updateViewModel", () => {
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

    it("getViewModelKeys", () => {
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
