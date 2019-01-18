import mocha from "steal-mocha";
import chai from "chai/chai";

import Panel from "./panel.mjs";
const PanelVM = Panel.ViewModel;

const assert = chai.assert;

describe("canjs-devtools-panel", () => {
    beforeEach(() => {
        window.CANJS_DEVTOOLS_HELPERS = {
            runDevtoolsFunction() {}
        };
    });

    afterEach(() => {
        delete window.CANJS_DEVTOOLS_HELPERS;
    });

    it("error", () => {
        const vm = new PanelVM();
        vm.listenTo("error", () => {});

        assert.equal(vm.error, undefined, "no error by default");

        vm.error = "there was an error";
        assert.equal(vm.error, "there was an error", "error can be set");

        vm.selectedNode = {};
        assert.equal(vm.error, undefined, "error is reset when a node is selected");
    });

    it("breakpointsError", () => {
        const vm = new PanelVM();
        vm.listenTo("breakpointsError", () => {});

        assert.equal(vm.breakpointsError, undefined, "no breakpointsError by default");

        vm.breakpointsError = "there was an error";
        assert.equal(vm.breakpointsError, "there was an error", "breakpointsError can be set");

        vm.selectedNode = {};
        assert.equal(vm.breakpointsError, undefined, "breakpointsError is reset when a node is selected");
    });

    it("viewModelData", () => {
        const vm = new PanelVM();
        vm.listenTo("viewModelData", () => {});

        assert.equal(vm.viewModelData, undefined, "no viewModelData by default");

        vm.viewModelData = { foo: "bar" };
        assert.deepEqual(vm.viewModelData.serialize(), { foo: "bar" }, "viewModelData can be set");

        vm.selectedNode = {};
        assert.deepEqual(vm.viewModelData.serialize(), {}, "viewModelData is reset when a node is selected");
    });

    it("typeNamesData", () => {
        const vm = new PanelVM();
        vm.listenTo("typeNamesData", () => {});

        assert.equal(vm.typeNamesData, undefined, "no typeNamesData by default");

        vm.typeNamesData = { foo: "bar" };
        assert.deepEqual(vm.typeNamesData.serialize(), { foo: "bar" }, "typeNamesData can be set");

        vm.selectedNode = {};
        assert.deepEqual(vm.typeNamesData.serialize(), {}, "typeNamesData is reset when a node is selected");
    });

    it("messages", () => {
        const vm = new PanelVM();
        vm.listenTo("messages", () => {});

        assert.equal(vm.messages, undefined, "no messages by default");

        vm.messages = { foo: "bar" };
        assert.deepEqual(vm.messages.serialize(), { foo: "bar" }, "messages can be set");

        vm.selectedNode = {};
        assert.deepEqual(vm.messages.serialize(), {}, "messages is reset when a node is selected");
    });
});
