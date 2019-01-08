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

    describe("getViewModelData", () => {
        it("basics", () => {
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

        it("can handle elements", () => {
            const C = Component.extend({
                tag: "app-with-element",
                view: "<p>this app has an element on its viewModel</p>",
                ViewModel: {
                    element: {
                        default() {
                            return document.createElement("p");
                        }
                    }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModel,
                namesByPath,
                messages
            } = devtools.getViewModelData(el).detail;

            assert.deepEqual(
                viewModel,
                { element: {} },
                "gets correct viewModel data"
            );

            assert.deepEqual(
                namesByPath,
                { element: "HTMLParagraphElement{}" },
                "gets correct name data"
            );

            assert.deepEqual(
                messages,
                { element: { type: "info", message: "CanJS Devtools does not expand HTML Elements" } },
                "gets correct message data"
            );
        });

        it("can handle lists of elements", () => {
            const C = Component.extend({
                tag: "app-with-list-of-elements",
                view: "<p>this app has a list of elements on its viewModel</p>",
                ViewModel: {
                    elements: {
                        default() {
                            return new DefineList([
                                document.createElement("p"),
                                document.createElement("p")
                            ]);
                        }
                    }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModel,
                namesByPath,
                messages
            } = devtools.getViewModelData(el).detail;

            assert.deepEqual(
                viewModel,
                { elements: { } },
                "gets correct viewModel data - unexpanded"
            );

            assert.deepEqual(
                namesByPath,
                { elements: "DefineList[]" },
                "gets correct name data - unexpanded"
            );

            assert.deepEqual(
                messages,
                {},
                "gets correct message data - unexpanded"
            );

            const {
                viewModel: viewModelListExpanded,
                namesByPath: namesByPathListExpanded,
                messages: messagesListExpanded
            } = devtools.getViewModelData(el, { expandedKeys: [ "elements" ] }).detail;

            assert.deepEqual(
                viewModelListExpanded,
                { elements: { 0: { }, 1: { } } },
                "gets correct viewModel data - list expanded"
            );

            assert.deepEqual(
                namesByPathListExpanded,
                {
                    elements: "DefineList[]",
                    "elements.0": "HTMLParagraphElement{}",
                    "elements.1": "HTMLParagraphElement{}"
                },
                "gets correct name data - list expanded"
            );

            assert.deepEqual(
                messagesListExpanded,
                {
                    "elements.0": { type: "info", message: "CanJS Devtools does not expand HTML Elements" },
                    "elements.1": { type: "info", message: "CanJS Devtools does not expand HTML Elements" },
                },
                "gets correct message data - list expanded"
            );
        });

        it("can handle functions", () => {
            const C = Component.extend({
                tag: "app-with-functions",
                view: "<p>this app uses functions</p>",
                ViewModel: {
                    Thing: {
                        default: () => function Thing() {}
                    }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModel
            } = devtools.getViewModelData(el).detail;


            assert.deepEqual(
                viewModel,
                { },
                "works for DefineMaps with functions"
            );
        });

        it("can handle circular references (#46)", () => {
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
                namesByPath,
                messages
            } = devtools.getViewModelData(el).detail;

            assert.deepEqual(
                viewModel,
                { circular: { } },
                "gets empty object for circular property"
            );

            assert.deepEqual(
                namesByPath,
                { circular: "Object{}" },
                "gets correct name for circular property"
            );

            assert.equal(typeof messages, "object");
            assert.equal(typeof messages.circular, "object");
            assert.equal(messages.circular.type, "error");
            assert.ok(messages.circular.message.match(/Error getting value of "circular":/))
        });

        it("can handle infinite recursion (#46)", () => {
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
                namesByPath
            } = devtools.getViewModelData(el).detail;

            assert.deepEqual(
                viewModel,
                { thing: { } },
                "gets empty object for recursive property"
            );

            assert.deepEqual(
                namesByPath,
                { thing: "Thing{}" },
                "gets correct name"
            );
        });

        it("can handle nulls", () => {
            const C = Component.extend({
                tag: "app-with-nulls",
                view: "<p>hello</p>",
                ViewModel: {
                    thisIsNull: { default: null }
                }
            });

            const c = new C();
            const el = c.element;

            const {
                viewModel,
                namesByPath,
                messages
            } = devtools.getViewModelData(el).detail;

            assert.deepEqual(
                viewModel,
                { thisIsNull: null },
                "gets null for property that is null"
            );

            assert.deepEqual(
                messages,
                { },
                "gets no messages"
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

    it("getSerializedViewModelData - viewModel", () => {
        let VM = DefineMap.extend({
            name: "string"
        });

        assert.deepEqual(
            devtools.getSerializedViewModelData(new VM()).viewModel,
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
            devtools.getSerializedViewModelData(new VM()).viewModel,
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
            devtools.getSerializedViewModelData(new VM()).viewModel,
            { hobbies: { } },
            "works for DefineMap with nested array - unexpanded"
        );

        assert.deepEqual(
            devtools.getSerializedViewModelData(new VM(), { expandedKeys: [ "hobbies" ] }).viewModel,
            { hobbies: { 0: { }, 1: { } } },
            "works for DefineMap with nested array - array expanded"
        );

        assert.deepEqual(
            devtools.getSerializedViewModelData(new VM(), { expandedKeys: [ "hobbies", "hobbies.0", "hobbies.1" ] }).viewModel,
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
            devtools.getSerializedViewModelData(new VM()).viewModel,
            { hobbies: { } },
            "works for nested DefineMaps - unexpanded"
        );

        assert.deepEqual(
            devtools.getSerializedViewModelData(new VM(), { expandedKeys: [ "hobbies" ] }).viewModel,
            { hobbies: { 0: { }, 1: { } } },
            "works for nested DefineMaps - array expanded"
        );

        assert.deepEqual(
            devtools.getSerializedViewModelData(new VM(), { expandedKeys: [ "hobbies", "hobbies.0", "hobbies.1" ] }).viewModel,
            { hobbies: { 0: { name: "singing" }, 1: { name: "dancing" } } },
            "works for nested DefineMaps - everything expanded"
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
            devtools.getSerializedViewModelData(new VM()).viewModel,
            { age: 32, name: {} },
            "only serializes top-level properties by default"
        );
    });

    it("getSerializedViewModelData - namesByPath", () => {
        const Thing = DefineMap.extend("AThing", {});

        let ViewModel = DefineMap.extend("ViewModel", {
            aThing: { Type: Thing, Default: Thing }
        });

        assert.deepEqual(
            devtools.getSerializedViewModelData(new ViewModel()).namesByPath,
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
            devtools.getSerializedViewModelData(new ViewModel()).namesByPath,
            { things: "ListOfThings[]" },
            "ListOfThings[] - nothing expanded"
        );

        assert.deepEqual(
            devtools.getSerializedViewModelData(new ViewModel(), { expandedKeys: [ "things" ] }).namesByPath,
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
            devtools.getSerializedViewModelData(new ViewModel()).namesByPath,
            { things: "ListOfNamedThings[]" },
            "ListOfNamedThings[] - nothing expanded"
        );
        assert.deepEqual(
            devtools.getSerializedViewModelData(new ViewModel(), { expandedKeys: [ "things" ] }).namesByPath,
            { things: "ListOfNamedThings[]", "things.0": "NamedThing{}" },
            "ListOfNamedThings[] - list expanded"
        );
        assert.deepEqual(
            devtools.getSerializedViewModelData(new ViewModel(), { expandedKeys: [ "things", "things.0" ] }).namesByPath,
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
                },
                hobbies: {
                    type: "any",
                    default() {
                        return [ "running", "jumping" ];
                    }
                }
            }
        });

        const c = new C();
        const vm = c.viewModel;
        const el = c.element;

        assert.deepEqual(
            devtools.getSerializedViewModelData(vm, { expandedKeys: [ "hobbies" ] }).viewModel,
            { first: "Kevin", last: "McCallister", name: "Kevin McCallister", hobbies: { 0: "running", 1: "jumping" } },
            "default viewmodel data"
        );

        devtools.updateViewModel(el, [
            { type: "set", key: "first", value: "Marty" },
            { type: "set", key: "last", value: "McFly" }
        ]);

        assert.deepEqual(
            devtools.getSerializedViewModelData(vm, { expandedKeys: [ "hobbies" ] }).viewModel,
            { first: "Marty", last: "McFly", name: "Marty McFly", hobbies: { 0: "running", 1: "jumping" } },
            "set works"
        );

        devtools.updateViewModel(el, [
            { type: "delete", key: "last" }
        ]);

        assert.deepEqual(
            devtools.getSerializedViewModelData(vm, { expandedKeys: [ "hobbies" ] }).viewModel,
            { first: "Marty", last: undefined, name: "Marty undefined", hobbies: { 0: "running", 1: "jumping" } },
            "delete works"
        );

        devtools.updateViewModel(el, [
            { type: "splice", key: "hobbies", index: 0, deleteCount: 1, insert: [ "skipping" ] }
        ]);

        assert.deepEqual(
            devtools.getSerializedViewModelData(vm, { expandedKeys: [ "hobbies" ] }).viewModel,
            { first: "Marty", last: undefined, name: "Marty undefined", hobbies: { 0: "skipping", 1: "jumping" } },
            "splice works"
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
        let appOne, appTwo, treeData;
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
            appOne = a.element;

            const b = new App();
            appTwo = b.element;

            fixture.appendChild(appOne);
            fixture.appendChild(appTwo);

            const resp = devtools.getComponentTreeData();
            treeData = resp.detail.tree;
        });

        after(() => {
            fixture.removeChild(appOne);
            fixture.removeChild(appTwo);
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
            }, {
                tagName: "a-pp",
                id: 5,
                children: [{
                    tagName: "a-child",
                    id: 6,
                    children: [{
                        tagName: "a-deep-child",
                        id: 7,
                        children: []
                    }]
                }, {
                    tagName: "a-nother-child",
                    id: 8,
                    children: [{
                        tagName: "a-nother-deep-child",
                        id: 9,
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

            devtools.selectComponentById(5);
            assert.ok(isElement(devtools.$0), "App");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-pp", "second a-pp");

            devtools.selectComponentById(6);
            assert.ok(isElement(devtools.$0), "Child");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-child", "second a-child");

            devtools.selectComponentById(7);
            assert.ok(isElement(devtools.$0), "DeepChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-deep-child", "second a-deep-child");

            devtools.selectComponentById(8);
            assert.ok(isElement(devtools.$0), "AnotherChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-nother-child", "second a-nother-child");

            devtools.selectComponentById(9);
            assert.ok(isElement(devtools.$0), "AnotherDeepChild");
            assert.equal(devtools.$0.tagName.toLowerCase(), "a-nother-deep-child", "second a-nother-deep-child");
        });
    });
});
