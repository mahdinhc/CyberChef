/**
 * CyberChef mobile engine.
 * Runs the real CyberChef core inside a hidden Android WebView (main thread, no worker)
 * and talks to the React Native UI through ReactNativeWebView.postMessage.
 */
import Chef from "../../src/core/Chef.mjs";
import OperationConfig from "../../src/core/config/OperationConfig.json" with { type: "json" };
import Categories from "../../src/core/config/Categories.json" with { type: "json" };
import OpModules from "../../src/core/config/modules/OpModules.mjs";

// Shims for code paths that expect the web app / worker globals
window.app = window.app || { options: { attemptHighlight: false } };
self.OpModules = OpModules;
self.OperationConfig = OperationConfig;
self.inputNum = -1;
self.setOption = () => {};
self.sendStatusMessage = () => {};
self.sendProgressMessage = () => {};
self.loadRequiredModules = () => {};

const chef = new Chef();
self.chef = chef;

function post(msg) {
    const send = () => window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    if (window.ReactNativeWebView) send();
    else setTimeout(() => post(msg), 50);
}

function slimConfig() {
    const ops = {};
    for (const name of Object.keys(OperationConfig)) {
        const o = OperationConfig[name];
        ops[name] = {
            d: o.description || "",
            u: o.infoURL || "",
            i: o.inputType,
            o: o.outputType,
            f: !!o.flowControl,
            m: o.module,
            a: (o.args || []).map(a => ({
                name: a.name,
                type: a.type,
                value: a.value,
                toggleValues: a.toggleValues,
                defaultIndex: a.defaultIndex,
                target: a.target,
                min: a.min,
                max: a.max,
                step: a.step,
                hint: a.hint
            }))
        };
    }
    const categories = Categories
        .filter(c => c.name !== "Favourites")
        .map(c => ({ name: c.name, ops: c.ops.filter(n => ops[n]) }));
    return { ops, categories };
}

let latestId = 0;
let queue = Promise.resolve();

async function bake({ id, input, recipe }) {
    if (id < latestId) {
        post({ type: "result", id, skipped: true });
        return;
    }
    try {
        const res = await chef.bake(input, recipe, { returnType: "string" });
        let out = res.result;
        if (res.type === "html" && typeof out === "string") {
            const div = document.createElement("div");
            div.innerHTML = out;
            out = div.textContent;
        }
        post({
            type: "result",
            id,
            output: typeof out === "string" ? out : String(out),
            outType: res.type,
            duration: res.duration,
            error: res.error ? (res.error.displayStr || String(res.error)) : null
        });
    } catch (e) {
        post({ type: "result", id, output: "", error: String((e && e.message) || e) });
    }
}

window.__bake = payload => {
    latestId = Math.max(latestId, payload.id);
    queue = queue.then(() => bake(payload));
};

post({ type: "ready", ...slimConfig() });
