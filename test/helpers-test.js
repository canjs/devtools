import mocha from "steal-mocha";
import chai from "chai/chai";

import { Component, DefineMap, DefineList, debug, Reflect, Observation } from "can";

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

        steal.import("canjs-devtools-helpers")
            .then(() => {
                // get access to devtools helpers functions
                helpers = window.CANJS_DEVTOOLS_HELPERS;
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
        let $0;

        beforeEach(() => {
            $0 = { viewModel: {} };

            window.__CANJS_DEVTOOLS__ = {
                $0,
                canReflect: Reflect,
                canObservation: Observation
            };
        });

        afterEach(() => {
            delete window.__CANJS_DEVTOOLS__;
            $0 = null;
        });

        it("hobbies.length", (done) => {
            let devtoolsVM = new (DefineMap.extend("DevtoolsVM", {
                hobbies: new DefineList({})
            }));

            $0.viewModel = devtoolsVM;

            let str = helpers.getBreakpointEvalString("hobbies.length");
            let breakpoint = eval( str );

            assert.equal(breakpoint.expression, "DevtoolsVM{}.hobbies.length");
            assert.equal(Reflect.getValue(breakpoint.observation), devtoolsVM.hobbies.length, "obs === hobbies.length");

            Reflect.onValue(breakpoint.observation, () => {
                assert.ok("observation has correct binding");
                done();
            });

            devtoolsVM.hobbies.push("skiing");
        });
    });
});
