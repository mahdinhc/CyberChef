import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Share, BackHandler, StyleSheet, Image
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { EngineProvider, useEngine } from "./Engine";
import { Icon } from "./icons";
import { useTheme, MONO, R } from "./theme";
import { newStep, toRecipeConfig, fromRecipeConfig, STARTER_PRESETS } from "./args";
import { IconBtn, Btn, Card, StepCard, OperationPicker, PresetsModal } from "./components";

const K = { state: "cc:state", favs: "cc:favs", saved: "cc:saved" };
const logo = require("../assets/icon.png");

function Main() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, ops, categories, bake, error: engineError } = useEngine();

  const [tab, setTab] = useState("recipe");
  const [input, setInput] = useState("");
  const [steps, setSteps] = useState([]);
  const [auto, setAuto] = useState(true);
  const [out, setOut] = useState({ text: "", error: null, duration: null });
  const [baking, setBaking] = useState(false);
  const [picker, setPicker] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [favs, setFavs] = useState([]);
  const [presets, setPresets] = useState([]);
  const [toast, setToast] = useState("");
  const [loaded, setLoaded] = useState(false);
  const toastTimer = useRef(null);

  const say = useCallback(m => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1700);
  }, []);

  // restore saved state
  useEffect(() => {
    (async () => {
      try {
        const [s, f, r] = await Promise.all([
          AsyncStorage.getItem(K.state), AsyncStorage.getItem(K.favs), AsyncStorage.getItem(K.saved)
        ]);
        if (s) {
          const p = JSON.parse(s);
          setInput(p.input || "");
          setSteps((p.steps || []).map(x => ({ ...x, open: false })));
          setAuto(p.auto !== false);
          if (p.tab) setTab(p.tab);
        }
        if (f) setFavs(JSON.parse(f));
        if (r) setPresets(JSON.parse(r));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // persist working state
  useEffect(() => {
    if (!loaded) return;
    const h = setTimeout(() => {
      AsyncStorage.setItem(K.state, JSON.stringify({ input, steps, auto, tab })).catch(() => {});
    }, 600);
    return () => clearTimeout(h);
  }, [input, steps, auto, tab, loaded]);

  const validSteps = useMemo(() => (ops ? steps.filter(s => ops[s.name]) : steps), [steps, ops]);
  const recipe = useMemo(() => (ops ? toRecipeConfig(validSteps, ops) : []), [validSteps, ops]);
  const recipeKey = JSON.stringify(recipe);

  const runBake = useCallback(async () => {
    if (!ready) return;
    if (!recipe.some(r => !r.disabled)) {
      setBaking(false);
      setOut({ text: input, error: null, duration: 0 });
      return;
    }
    setBaking(true);
    const res = await bake(input, recipe);
    if (res.skipped) return;
    setBaking(false);
    setOut({ text: res.output || "", error: res.error, duration: res.duration });
  }, [ready, recipeKey, input, bake]);

  useEffect(() => {
    if (!auto || !ready) return;
    const h = setTimeout(runBake, 350);
    return () => clearTimeout(h);
  }, [auto, ready, runBake]);

  // hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (picker) { setPicker(false); return true; }
      if (presetsOpen) { setPresetsOpen(false); return true; }
      if (tab !== "recipe") { setTab("recipe"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [picker, presetsOpen, tab]);

  const addOp = name => {
    setSteps(s => [...s.map(x => ({ ...x, open: false })), newStep(name, ops)]);
    setPicker(false);
    setTab("recipe");
  };
  const updateStep = (uid, next) => setSteps(s => s.map(x => (x.uid === uid ? next : x)));
  const moveStep = (uid, d) => setSteps(s => {
    const i = s.findIndex(x => x.uid === uid);
    const j = i + d;
    if (i < 0 || j < 0 || j >= s.length) return s;
    const a = [...s];
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  });
  const toggleFav = n => setFavs(f => {
    const nf = f.includes(n) ? f.filter(x => x !== n) : [...f, n];
    AsyncStorage.setItem(K.favs, JSON.stringify(nf)).catch(() => {});
    return nf;
  });

  const cleanRecipe = () => JSON.parse(JSON.stringify(recipe, (k, v) => (typeof v === "number" && Number.isNaN(v) ? null : v)));
  const persistPresets = list => { setPresets(list); AsyncStorage.setItem(K.saved, JSON.stringify(list)).catch(() => {}); };

  const savePreset = (name, withInput) => {
    const p = { id: String(Date.now()), name, recipe: cleanRecipe() };
    if (withInput) p.input = input;
    persistPresets([p, ...presets]);
    say(`Preset “${name}” saved`);
  };
  const loadPreset = (p, mode) => {
    const next = fromRecipeConfig(p.recipe, ops);
    if (!next.length) { say("Preset has no valid operations"); return; }
    if (mode === "append") {
      setSteps(s => [...s.map(x => ({ ...x, open: false })), ...next]);
      say(`Added ${next.length} operation${next.length === 1 ? "" : "s"}`);
    } else {
      setSteps(next);
      if (typeof p.input === "string") setInput(p.input);
      say(`Loaded “${p.name}”`);
    }
    setPresetsOpen(false);
    setTab("recipe");
  };
  const importPreset = async () => {
    try {
      const parsed = JSON.parse(await Clipboard.getStringAsync());
      const cfg = Array.isArray(parsed) ? parsed : parsed.recipe;
      const next = fromRecipeConfig(cfg, ops);
      if (!next.length) throw new Error("empty");
      setSteps(next);
      setPresetsOpen(false);
      setTab("recipe");
      say(`Imported ${next.length} operations`);
    } catch {
      say("Clipboard has no valid recipe JSON");
    }
  };

  const copy = async (txt, msg = "Copied") => { await Clipboard.setStringAsync(txt); say(msg); };

  if (engineError) {
    return (
      <View style={[S.center, { backgroundColor: t.bg, padding: 32 }]}>
        <Icon name="error" size={56} color={t.danger} />
        <Text style={{ color: t.text, marginTop: 14, fontSize: 17, fontWeight: "700", textAlign: "center" }}>{engineError}</Text>
      </View>
    );
  }

  const onPrimary = t.dark ? t.onPrimary : "#fff";
  const activeCount = validSteps.filter(s => !s.disabled).length;

  /* ---------------- header ---------------- */
  const header = (
    <View style={{ paddingTop: insets.top, backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.border }}>
      <View style={{ height: 64, flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 6 }}>
        <Image source={logo} style={{ width: 36, height: 36, borderRadius: 10 }} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: t.text, fontSize: 19, fontWeight: "800", letterSpacing: 0.2 }}>CyberChef</Text>
          <Text style={{ color: t.sub, fontSize: 11.5, marginTop: 1 }}>
            {ready ? `${activeCount} step${activeCount === 1 ? "" : "s"} · auto-bake ${auto ? "on" : "off"}` : "starting engine…"}
          </Text>
        </View>
        <IconBtn name="bookmark" color={t.primary} onPress={() => setPresetsOpen(true)} disabled={!ready} />
        <IconBtn name="bolt" color={auto ? t.warn : t.sub} onPress={() => { setAuto(!auto); say(auto ? "Auto-bake off" : "Auto-bake on"); }} />
        <View style={{ width: 4 }} />
        <IconBtn name="play" filled size={24} onPress={() => { runBake(); setTab("output"); }} disabled={!ready} />
        <View style={{ width: 4 }} />
      </View>
      {baking ? <View style={{ height: 2, backgroundColor: t.primary }} /> : <View style={{ height: 2 }} />}
    </View>
  );

  /* ---------------- bottom nav ---------------- */
  const nav = (
    <View style={{
      flexDirection: "row", backgroundColor: t.surface, paddingBottom: insets.bottom,
      borderTopWidth: 1, borderTopColor: t.border
    }}>
      {[["input", "Input", "edit"], ["recipe", "Recipe", "tune"], ["output", "Output", "terminal"]].map(([k, l, ic]) => {
        const on = tab === k;
        return (
          <Pressable key={k} onPress={() => setTab(k)} android_ripple={{ color: t.border }} style={{ flex: 1, alignItems: "center", paddingTop: 10, paddingBottom: 10 }}>
            <View style={{ width: 64, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: on ? t.primaryDim : "transparent" }}>
              <Icon name={ic} size={22} color={on ? t.primary : t.sub} />
              {k === "recipe" && validSteps.length ? (
                <View style={{ position: "absolute", top: -3, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                  <Text style={{ color: onPrimary, fontSize: 10, fontWeight: "800" }}>{validSteps.length}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ color: on ? t.text : t.sub, fontSize: 12, fontWeight: on ? "800" : "500", marginTop: 4 }}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  /* ---------------- tab bodies ---------------- */
  let body;
  if (!ready) {
    body = (
      <View style={S.center}>
        <Image source={logo} style={{ width: 88, height: 88, borderRadius: 22 }} />
        <ActivityIndicator size="small" color={t.primary} style={{ marginTop: 28 }} />
        <Text style={{ color: t.sub, marginTop: 12, fontSize: 13 }}>Loading all CyberChef operations…</Text>
      </View>
    );
  } else if (tab === "input") {
    body = (
      <View style={{ flex: 1, padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ flex: 1, color: t.text, fontSize: 18, fontWeight: "800" }}>Input</Text>
          <Text style={{ color: t.sub, fontSize: 12 }}>{input.length} chars · {input ? input.split("\n").length : 0} lines</Text>
        </View>
        <TextInput
          value={input} onChangeText={setInput} multiline autoCapitalize="none" autoCorrect={false} spellCheck={false}
          placeholder="Type or paste your input here…" placeholderTextColor={t.sub} selectionColor={t.primary}
          style={{
            flex: 1, color: t.text, backgroundColor: t.surface, borderRadius: R.card, padding: 16, fontFamily: MONO,
            fontSize: 14, lineHeight: 21, textAlignVertical: "top", borderWidth: 1, borderColor: t.border
          }}
        />
        <View style={{ flexDirection: "row", marginTop: 12 }}>
          <Btn label="Paste" icon="paste" variant="tonal" style={{ flex: 1, marginRight: 8 }} onPress={async () => setInput(await Clipboard.getStringAsync())} />
          <Btn label="Clear" icon="close" variant="tonal" style={{ flex: 1 }} onPress={() => setInput("")} disabled={!input} />
        </View>
      </View>
    );
  } else if (tab === "recipe") {
    body = (
      <View style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 18, fontWeight: "800" }}>Recipe</Text>
              <Text style={{ color: t.sub, fontSize: 12, marginTop: 2 }}>
                {validSteps.length ? `${validSteps.length} operation${validSteps.length === 1 ? "" : "s"}` : "No operations yet"}
              </Text>
            </View>
            <Btn compact label="Presets" icon="bookmark-border" variant="outline" onPress={() => setPresetsOpen(true)} />
            {validSteps.length ? (
              <IconBtn name="delete" color={t.danger} onPress={() => setSteps([])} style={{ marginLeft: 4 }} />
            ) : null}
          </View>

          {validSteps.length === 0 ? (
            <Card style={{ marginHorizontal: 14, padding: 24, alignItems: "center" }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.primaryDim, alignItems: "center", justifyContent: "center" }}>
                <Icon name="sparkle" size={34} color={t.primary} />
              </View>
              <Text style={{ color: t.text, fontSize: 17, fontWeight: "800", marginTop: 16 }}>Build your recipe</Text>
              <Text style={{ color: t.sub, textAlign: "center", marginTop: 6, lineHeight: 19 }}>
                Chain operations to encode, decode, encrypt, hash and analyse data. Try “From Base64” or “Magic”, or load a saved preset.
              </Text>
              <View style={{ flexDirection: "row", marginTop: 18 }}>
                <Btn label="Add operation" icon="add" onPress={() => setPicker(true)} style={{ marginRight: 8 }} />
                <Btn label="Presets" icon="bookmark" variant="tonal" onPress={() => setPresetsOpen(true)} />
              </View>
            </Card>
          ) : validSteps.map((s, i) => (
            <StepCard
              key={s.uid} index={i} step={s} def={ops[s.name]} count={validSteps.length}
              onChange={n => updateStep(s.uid, n)}
              onMove={d => moveStep(s.uid, d)}
              onRemove={() => setSteps(x => x.filter(y => y.uid !== s.uid))}
              onToggle={() => updateStep(s.uid, { ...s, disabled: !s.disabled })}
            />
          ))}
        </ScrollView>

        <Pressable
          onPress={() => setPicker(true)}
          android_ripple={{ color: "#ffffff30" }}
          style={{
            position: "absolute", right: 16, bottom: 16, height: 56, paddingHorizontal: 22, borderRadius: 20,
            backgroundColor: t.primary, flexDirection: "row", alignItems: "center", elevation: 6
          }}
        >
          <Icon name="add" size={24} color={onPrimary} />
          <Text style={{ color: onPrimary, fontWeight: "800", fontSize: 15, marginLeft: 8 }}>Add operation</Text>
        </Pressable>
      </View>
    );
  } else {
    const ok = !out.error;
    body = (
      <View style={{ flex: 1, padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ flex: 1, color: t.text, fontSize: 18, fontWeight: "800" }}>Output</Text>
          {baking ? (
            <ActivityIndicator size="small" color={t.primary} />
          ) : (
            <View style={{
              flexDirection: "row", alignItems: "center", paddingHorizontal: 10, height: 28, borderRadius: 14,
              backgroundColor: (ok ? t.success : t.danger) + "22"
            }}>
              <Icon name={ok ? "check-circle" : "error"} size={15} color={ok ? t.success : t.danger} />
              <Text style={{ color: ok ? t.success : t.danger, fontSize: 12, fontWeight: "700", marginLeft: 6 }}>
                {ok ? (out.duration != null ? `${out.duration} ms` : "Ready") : "Error"}
              </Text>
            </View>
          )}
        </View>

        {out.error ? (
          <View style={{ backgroundColor: t.danger + "1F", borderRadius: R.field, padding: 12, marginBottom: 10, flexDirection: "row" }}>
            <Icon name="error" size={18} color={t.danger} style={{ marginTop: 1, marginRight: 8 }} />
            <Text selectable style={{ flex: 1, color: t.danger, fontSize: 13, lineHeight: 18 }}>{out.error}</Text>
          </View>
        ) : null}

        <ScrollView
          style={{ flex: 1, backgroundColor: t.surface, borderRadius: R.card, borderWidth: 1, borderColor: t.border }}
          contentContainerStyle={{ padding: 16 }}
        >
          <Text selectable style={{ color: out.text ? t.text : t.sub, fontFamily: MONO, fontSize: 14, lineHeight: 21 }}>
            {out.text || (baking ? "Baking…" : "Output will appear here")}
          </Text>
        </ScrollView>

        <Text style={{ color: t.sub, fontSize: 12, marginTop: 8 }}>{out.text.length} chars</Text>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <Btn label="Copy" icon="copy" variant="tonal" compact style={{ flex: 1, marginRight: 8 }} onPress={() => copy(out.text)} disabled={!out.text} />
          <Btn label="Share" icon="share" variant="tonal" compact style={{ flex: 1, marginRight: 8 }} onPress={() => Share.share({ message: out.text })} disabled={!out.text} />
          <Btn label="To input" icon="input" variant="tonal" compact style={{ flex: 1 }} onPress={() => { setInput(out.text); setSteps([]); setTab("input"); }} disabled={!out.text} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? "light" : "dark"} />
      {header}
      <View style={{ flex: 1 }}>{body}</View>
      {nav}
      {toast ? (
        <View pointerEvents="none" style={{
          position: "absolute", bottom: insets.bottom + 92, alignSelf: "center", backgroundColor: t.text,
          borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 11, elevation: 8
        }}>
          <Text style={{ color: t.bg, fontWeight: "700", fontSize: 13 }}>{toast}</Text>
        </View>
      ) : null}
      {ready ? (
        <>
          <OperationPicker
            visible={picker} ops={ops} categories={categories} favs={favs}
            onToggleFav={toggleFav} onPick={addOp} onClose={() => setPicker(false)}
          />
          <PresetsModal
            visible={presetsOpen} presets={presets} starters={STARTER_PRESETS} canSave={validSteps.length > 0}
            onSave={savePreset} onLoad={loadPreset}
            onDelete={id => persistPresets(presets.filter(r => r.id !== id))}
            onCopy={() => copy(JSON.stringify(cleanRecipe(), null, 2), "Recipe JSON copied")}
            onImport={importPreset} onClose={() => setPresetsOpen(false)}
          />
        </>
      ) : null}
    </View>
  );
}

const S = StyleSheet.create({ center: { flex: 1, alignItems: "center", justifyContent: "center" } });

export default function App() {
  return (
    <SafeAreaProvider>
      <EngineProvider>
        <Main />
      </EngineProvider>
    </SafeAreaProvider>
  );
}
