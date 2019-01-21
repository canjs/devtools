import mocha from "steal-mocha";
import chai from "chai/chai";

import { Component, DefineMap, DefineList, debug, Reflect, Observation, queues } from "can";

const assert = chai.assert;

describe("canjs-devtools-helpers", () => {
    let helpers, windowChrome, chrome;

    beforeEach((done) => {
        // store original chrome api (it probably doesn't exist)
        windowChrome = window.chrome;

        chrome = {
            devtools: {},
            runtime: { onMessage: { addListener() {} } }
        };
        window.chrome = chrome;

        steal.import("canjs-devtools-helpers.mjs")
            .then((mod) => {
                helpers = mod.default;
                done();
            });
    });

    afterEach(() => {
        window.chrome = windowChrome;
    });

    describe("runDevtoolsFunction", () => {
        let evalCalls;

        beforeEach(() => {
            evalCalls = [];

            chrome.devtools = {
                inspectedWindow: {
                    eval(fnString, options, callback) {
                        evalCalls.push({
                            fnString: fnString.split("__CANJS_DEVTOOLS__.")[1],
                            url: options.frameURL
                        });
                    }
                }
            };
        });

        it("makes an eval call to each registered frame", () => {
            helpers.registeredFrames = { "www.one.com": true, "www.two.com": true };

            helpers.runDevtoolsFunction({
                fnString: "fooBar()"
            });

            assert.equal(evalCalls.length, 2);

            assert.equal(evalCalls[0].fnString, "fooBar()");
            assert.equal(evalCalls[0].url, "www.one.com");

            assert.equal(evalCalls[1].fnString, "fooBar()");
            assert.equal(evalCalls[1].url, "www.two.com");
        });
    });

    describe("getBreakpointEvalString", () => {
        let $0, debuggerHitCount, mock;

        beforeEach(() => {
            $0 = { viewModel: {} };

            window.__CANJS_DEVTOOLS__ = {
                $0,
                canReflect: Reflect,
                canObservation: Observation,
                canQueues: queues,
                register() {}
            };

            // mock debugger so we can track when it is read
            debuggerHitCount = 0;
            mock = {
                get _debugger() {
                    debuggerHitCount++;
                }
            };
        });

        afterEach(() => {
            delete window.__CANJS_DEVTOOLS__;
            $0 = null;
        });

        it("hobbies.length", () => {
            let devtoolsVM = new (DefineMap.extend("DevtoolsVM", {
                hobbies: { Default: DefineList }
            }));

            $0.viewModel = devtoolsVM;

            let str = helpers.getBreakpointEvalString("hobbies.length", "mock._debugger");
            let breakpoint = eval( str );

            assert.equal(breakpoint.expression, "DevtoolsVM{}.hobbies.length");
            assert.equal(Reflect.getValue(breakpoint.observation), devtoolsVM.hobbies.length, "obs === hobbies.length");

            Reflect.onValue(breakpoint.observation, () => {});

            devtoolsVM.hobbies.push("skiing");
            assert.equal(debuggerHitCount, 1, "debugger hit once");

            devtoolsVM.hobbies.push("badminton");
            assert.equal(debuggerHitCount, 2, "debugger hit again");
        });

        it("hobbies.length > 1", () => {
            let devtoolsVM = new (DefineMap.extend("DevtoolsVM", {
                hobbies: { Default: DefineList }
            }));

            $0.viewModel = devtoolsVM;

            let str = helpers.getBreakpointEvalString("hobbies.length > 1", "mock._debugger");
            let breakpoint = eval( str );

            assert.equal(breakpoint.expression, "DevtoolsVM{}.hobbies.length > 1");
            assert.equal(Reflect.getValue(breakpoint.observation), false, "obs === false");

            Reflect.onValue(breakpoint.observation, () => {});

            devtoolsVM.hobbies.push("skiing");
            assert.equal(debuggerHitCount, 0, "debugger not hit");

            devtoolsVM.hobbies.push("badminton");
            assert.equal(debuggerHitCount, 1, "debugger hit once");

            devtoolsVM.hobbies.push("luge");
            assert.equal(debuggerHitCount, 1, "debugger not hit again");
        });

        it("hobbies.length > counter", () => {
            let devtoolsVM = new (DefineMap.extend("DevtoolsVM", {
                hobbies: { Default: DefineList },
                counter: { default: 2 }
            }));

            $0.viewModel = devtoolsVM;

            let str = helpers.getBreakpointEvalString("hobbies.length > counter", "mock._debugger");
            let breakpoint = eval( str );

            assert.equal(breakpoint.expression, "DevtoolsVM{}.hobbies.length > DevtoolsVM{}.counter");
            assert.equal(Reflect.getValue(breakpoint.observation), false, "has correct value");

            Reflect.onValue(breakpoint.observation, () => {});

            devtoolsVM.hobbies.push("skiing");
            assert.equal(debuggerHitCount, 0, "debugger not hit");

            devtoolsVM.hobbies.push("badminton");
            assert.equal(debuggerHitCount, 0, "debugger still not hit");

            devtoolsVM.hobbies.push("curling");
            assert.equal(debuggerHitCount, 1, "debugger hit");

            devtoolsVM.hobbies.push("fencing");
            assert.equal(debuggerHitCount, 1, "debugger not hit again");
        });

        it("returns an error if no componentelement is selected", () => {
            window.__CANJS_DEVTOOLS__.$0 = null;

            let str = helpers.getBreakpointEvalString("hobbies.length", "mock._debugger");
            let breakpoint = eval( str );

            assert.equal(breakpoint.error, "Please select a component in order to create a mutation breakpoint for its ViewModel");
        });
    });
});
