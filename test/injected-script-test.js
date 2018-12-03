import mocha from "steal-mocha";
import chai from "chai/chai";

import { Component, DefineMap, DefineList, debug } from "can";
import "../canjs-devtools-injected-script";

const assert = chai.assert;

describe("canjs-devtools-injected-script", () => {
    let devtools, windowCan;

    beforeEach(() => {
        // register devtools
        debug();

        // make sure devtools is not using global `can`
        windowCan = window.can;
        delete window.can;

        // get access to devtools functions
        devtools = window.__CANJS_DEVTOOLS__;
    });

    afterEach(() => {
        window.can = windowCan;
    });

    it("getViewModelData", () => {
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

        const {
            viewModel: viewModelFromEl,
            tagName: tagNameFromEl,
            type: typeFromEl,
            namesByPath: namesByPathFromEl
        } = devtools.getViewModelData(el).detail;

        assert.equal(typeFromEl, "viewModel", "type from el");
        assert.equal(tagNameFromEl, "<a-pp>", "tagName from el");
        assert.deepEqual(
            viewModelFromEl,
            { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
            "viewModel from el"
        );
        assert.deepEqual(
            namesByPathFromEl,
            {},
            "namesByPath from el"
        );

        const {
            viewModel: viewModelFromChild,
            tagName: tagNameFromChild,
            type: typeFromChild,
            namesByPath: namesByPathFromChild
        } = devtools.getViewModelData(el.querySelector("p")).detail;

        assert.equal(typeFromChild, "viewModel", "type from child of el");
        assert.equal(tagNameFromChild, "<a-pp>", "tagName from child of el");
        assert.deepEqual(
            viewModelFromChild,
            { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
            "viewModel from child of el"
        );
        assert.deepEqual(
            namesByPathFromChild,
            {},
            "namesByPath from child of el"
        );
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
            devtools.getNearestElementWithViewModel(el),
            el,
            "gets element from element with a viewmodel"
        );

        assert.deepEqual(
            devtools.getNearestElementWithViewModel(el.querySelector("p")),
            el,
            "gets element from child of element with a viewmodel"
        );

    });

    it("getSerializedViewModel", () => {
        let VM = DefineMap.extend({
            name: "string"
        });

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM()),
            { name: undefined },
            "works for basic ViewModel"
        );

        VM = DefineMap.extend({
            first: { type: "string", default: "Kevin" },
            last: { type: "string", default: "McCallister" },
            get name() {
                return this.first + " " + this.last;
            }
        });

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM()),
            { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
            "works for ViewModel with serialized properties"
        );

        VM = DefineMap.extend({
            hobbies: {
                default() {
                    return [{ name: "singing" }, { name: "dancing" }];
                }
            }
        });

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM()),
            { hobbies: [{ name: "singing" }, { name: "dancing" }] },
            "works for DefineMap with nested array"
        );

        VM = DefineMap.extend({
            hobbies: {
                Type: DefineList.extend("Hobbies", {
                    "#": DefineMap.extend("Hobby", {
                        name: "string"
                    })
                }),
                default() {
                    return [{ name: "singing" }, { name: "dancing" }];
                }
            }
        });

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM()),
            { hobbies: [{ name: "singing" }, { name: "dancing" }] },
            "works for nested DefineMaps"
        );
    });

    it("getViewModelNamesByPath", () => {
        const Thing = DefineMap.extend("AThing", {});
        let ViewModel = DefineMap.extend("ViewModel", {
            aThing: { Type: Thing, Default: Thing }
        });

        assert.deepEqual(
            devtools.getViewModelNamesByPath(new ViewModel()),
            { aThing: "AThing{}" },
            "AThing{}"
        );

        const ListOfThings = DefineList.extend("ListOfThings", {
            "#": Thing
        });
        ViewModel = DefineMap.extend("ViewModel", {
            things: { Type: ListOfThings, default: () => [{}] }
        });

        let { things: thingsName, "things.0": thingName } = devtools.getViewModelNamesByPath(new ViewModel());
        assert.equal(
            thingsName,
            "ListOfThings[]",
            "ListOfThings[]"
        );
        assert.equal(
            thingName,
            "AThing{}",
            "AThing{}"
        );

        const Name = DefineMap.extend("Name", {});
        const NamedThing = DefineMap.extend("NamedThing", {
            name: Name
        });
        const ListOfNamedThings = DefineList.extend("ListOfNamedThings", {
            "#": NamedThing
        });
        ViewModel = DefineMap.extend("ViewModel", {
            things: { Type: ListOfNamedThings, default: () => [{ name: {} }] }
        });

        let {
            things: namedThingsName,
            "things.0": namedThingName,
            "things.0.name": namedThingsNameName
        } = devtools.getViewModelNamesByPath(new ViewModel());

        assert.equal(
            namedThingsName,
            "ListOfNamedThings[]",
            "ListOfNamedThings[]"
        );
        assert.equal(
            namedThingName,
            "NamedThing{}",
            "NamedThing{}"
        );
        assert.equal(
            namedThingsNameName,
            "Name{}",
            "Name{}"
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
        const vm = c.viewModel;
        const el = c.element;

        assert.deepEqual(
            devtools.getSerializedViewModel(vm),
            { first: "Kevin", last: "McCallister", name: "Kevin McCallister" },
            "default viewmodel data"
        );

        devtools.updateViewModel(el, { first: "Marty", last: "McFly" });

        assert.deepEqual(
            devtools.getSerializedViewModel(vm),
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
        const vm = c.viewModel;

        assert.deepEqual(
            devtools.getViewModelKeys(vm),
            [ "first", "last", "name" ],
            "gets viewmodel keys"
        );
    });
});
