import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

const Ctx = createContext(null);
export const useEngine = () => useContext(Ctx);

export function EngineProvider({ children }) {
  const web = useRef(null);
  const pending = useRef(new Map());
  const idRef = useRef(0);
  const [state, setState] = useState({ ready: false, ops: null, categories: [], error: null });

  const onMessage = useCallback(e => {
    let m;
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.type === "ready") {
      setState({ ready: true, ops: m.ops, categories: m.categories, error: null });
    } else if (m.type === "result") {
      const p = pending.current.get(m.id);
      if (p) { pending.current.delete(m.id); p(m); }
    }
  }, []);

  const bake = useCallback((input, recipe) => new Promise(resolve => {
    const id = ++idRef.current;
    pending.current.set(id, resolve);
    const payload = JSON.stringify({ id, input, recipe });
    web.current?.injectJavaScript(`window.__bake(${payload});true;`);
  }), []);

  useEffect(() => () => pending.current.clear(), []);

  return (
    <Ctx.Provider value={{ ...state, bake }}>
      {children}
      <View pointerEvents="none" style={{ position: "absolute", width: 2, height: 2, opacity: 0 }}>
        <WebView
          ref={web}
          source={{ uri: "file:///android_asset/engine/engine.html" }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          onMessage={onMessage}
          onError={() => setState(s => ({ ...s, error: "Engine failed to load" }))}
          onHttpError={() => setState(s => ({ ...s, error: "Engine files not found in the APK" }))}
        />
      </View>
    </Ctx.Provider>
  );
}
