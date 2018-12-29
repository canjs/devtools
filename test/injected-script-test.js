import mocha from "steal-mocha";
import chai from "chai/chai";

import { Component, DefineMap, DefineList, debug } from "can";
import "../canjs-devtools-injected-script";

const assert = chai.assert;

const isElement = (el) => el.toString() === "[object HTMLElement]";

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

    it("getViewModelData can handle ViewModels with circular references (#46)", () => {
        const circular = {};
        circular.circular = circular;

        const C = Component.extend({
            tag: "circular-app",
            view: "<p>hello</p>",
            ViewModel: {
                circular: {
                    default: () => circular
                }
            }
        });

        const c = new C();
        const el = c.element;

        const {
            viewModel,
            tagName,
            type,
            namesByPath
        } = devtools.getViewModelData(el).detail;

        assert.deepEqual(
            viewModel,
            { circular: { } },
            "gets empty object for circular property"
        );

        assert.deepEqual(
            namesByPath,
            {},
            "gets no names"
        );
    });

    it("getViewModelData can handle ViewModels with infinite recursion (#46)", () => {
        const Thing = DefineMap.extend("Thing", {
            anotherThing: {
                default() {
                    return new Thing();
                }
            }
        });

        const C = Component.extend({
            tag: "circular-app",
            view: "<p>hello</p>",
            ViewModel: {
                thing: { Default: Thing }
            }
        });

        const c = new C();
        const el = c.element;

        const {
            viewModel,
            tagName,
            type,
            namesByPath
        } = devtools.getViewModelData(el).detail;

        assert.deepEqual(
            viewModel,
            { thing: { } },
            "gets empty object for recusrive property"
        );

        assert.deepEqual(
            namesByPath,
            { thing: "Thing{}" },
            "gets correct name"
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
            { hobbies: { } },
            "works for DefineMap with nested array - unexpanded"
        );

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM(), "", { expandedKeys: [ "hobbies" ] }),
            { hobbies: { 0: { }, 1: { } } },
            "works for DefineMap with nested array - array expanded"
        );

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM(), "", { expandedKeys: [ "hobbies", "hobbies.0", "hobbies.1" ] }),
            { hobbies: { 0: { name: "singing" }, 1: { name: "dancing" } } },
            "works for DefineMap with nested array - all expanded"
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
            { hobbies: { } },
            "works for nested DefineMaps - unexpanded"
        );

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM(), "", { expandedKeys: [ "hobbies" ] }),
            { hobbies: { 0: { }, 1: { } } },
            "works for nested DefineMaps - array expanded"
        );

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM(), "", { expandedKeys: [ "hobbies", "hobbies.0", "hobbies.1" ] }),
            { hobbies: { 0: { name: "singing" }, 1: { name: "dancing" } } },
            "works for nested DefineMaps - everything expanded"
        );

        VM = DefineMap.extend({
            element: {
                default() {
                    return document.createElement("p");
                }
            }
        });

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM()),
            { element: {} },
            "works for DefineMaps with elements on them"
        );

        VM = DefineMap.extend({
            elements: {
                default() {
                    return new DefineList([
                        document.createElement("p"),
                        document.createElement("p")
                    ]);
                }
            }
        });

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM()),
            { elements: { } },
            "works for DefineMaps with a list of elements on them"
        );

        VM = DefineMap.extend("ViewModel", {
            Thing: {
                default: () => function Thing() {}
            }
        });

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM()),
            { },
            "works for DefineMaps with functions on them"
        );

        var PersonName = DefineMap.extend("Name", {
          first: { type: "string", default: "kevin" },
          last: { type: "string", default: "phillips" }
        });

        VM = DefineMap.extend("Person", {
          name: { Default: PersonName },
          age: { default: 32 }
        });

        assert.deepEqual(
            devtools.getSerializedViewModel(new VM()),
            { age: 32, name: {} },
            "only serializes top-level properties by default"
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
            "AThing{} - nothing expanded"
        );

        const ListOfThings = DefineList.extend("ListOfThings", {
            "#": Thing
        });

        ViewModel = DefineMap.extend("ViewModel", {
            things: { Type: ListOfThings, default: () => [{}] }
        });

        assert.deepEqual(
            devtools.getViewModelNamesByPath(new ViewModel()),
            { things: "ListOfThings[]" },
            "ListOfThings[] - nothing expanded"
        );

        assert.deepEqual(
            devtools.getViewModelNamesByPath(new ViewModel(), "", { expandedKeys: [ "things" ] }),
            { things: "ListOfThings[]", "things.0": "AThing{}" },
            "ListOfThings[] - list expanded"
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

        assert.deepEqual(
            devtools.getViewModelNamesByPath(new ViewModel(), "", {}),
            { things: "ListOfNamedThings[]" },
            "ListOfNamedThings[] - nothing expanded"
        );
        assert.deepEqual(
            devtools.getViewModelNamesByPath(new ViewModel(), "", { expandedKeys: [ "things" ] }),
            { things: "ListOfNamedThings[]", "things.0": "NamedThing{}" },
            "ListOfNamedThings[] - list expanded"
        );
        assert.deepEqual(
            devtools.getViewModelNamesByPath(new ViewModel(), "", { expandedKeys: [ "things", "things.0" ] }),
            { things: "ListOfNamedThings[]", "things.0": "NamedThing{}", "things.0.name": "Name{}" },
            "ListOfNamedThings[] - everything expanded"
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

        const list = new DefineList([ { one: "two" }, { three: "four" } ]);
        assert.deepEqual(
            devtools.getViewModelKeys(list),
            [ "0", "1" ],
            "ignore _ keys for DefineList"
        );
    });

    describe("component tree", () => {
        let el, treeData;
        const fixture = document.getElementById("mocha-fixture");

        // run once before all tests in this describe
        // so that component IDs do not change between tests
        before(() => {
            // <a-pp>
            //   <div>
            //      <a-child>
            //          <a-deep-child/>
            //      </a-child>
            //   </div>
            //   <a-nother-child>
            //      <p>
            //          <a-nother-deep-child/>
            //      </p>
            //   </a-nother-child>
            // </a-pp>
            Component.extend({
                tag: "a-child",
                view: "<a-deep-child/>",
                ViewModel: {}
            });

            Component.extend({
                tag: "a-deep-child",
                view: "<p>a deep child</p>",
                ViewModel: {}
            });

            Component.extend({
                tag: "a-nother-child",
                view: "<p><a-nother-deep-child/></p>",
                ViewModel: {}
            });

            Component.extend({
                tag: "a-nother-deep-child",
                view: "<p>another deep child</p>",
                ViewModel: {}
            });

            const App = Component.extend({
                tag: "a-pp",
                view: `
                    <div>
                        <a-child />
                    </div>
                    <a-nother-child/>
                `,
                ViewModel: {}
            });

            const a = new App();
            el = a.element;

            fixture.appendChild(el);

            const resp = devtools.getComponentTreeData();
            treeData = resp.detail.tree;
        });

        after(() => {
            fixture.removeChild(el);
        });

        it("getComponentTreeData", () => {
            assert.deepEqual(treeData, [{
                tagName: "a-pp",
                id: 0,
                children: [{
                    tagName: "a-child",
                    id: 1,
                    children: [{
                        tagName: "a-deep-child",
                        id: 2,
                        children: []
                    }]
                }, {
                    tagName: "a-nother-child",
                    id: 3,
                    children: [{
                        tagName: "a-nother-deep-child",
                        id: 4,
                        children: []
                    }]
                }]
            }]);
        });

        it("selectComponentById", () => {
            devtools.selectComponentById(0);
            assert.ok(isElement(devtools.$0), "App");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-pp", "a-pp");

            devtools.selectComponentById(1);
            assert.ok(isElement(devtools.$0), "Child");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-child", "a-child");

            devtools.selectComponentById(2);
            assert.ok(isElement(devtools.$0), "DeepChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-deep-child", "a-deep-child");

            devtools.selectComponentById(3);
            assert.ok(isElement(devtools.$0), "AnotherChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-nother-child", "a-nother-child");

            devtools.selectComponentById(4);
            assert.ok(isElement(devtools.$0), "AnotherDeepChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-nother-deep-child", "a-nother-deep-child");
        });
    });
});
