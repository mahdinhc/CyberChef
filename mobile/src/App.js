import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Share, BackHandler, StyleSheet
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { EngineProvider, useEngine } from "./Engine";
import { useTheme, MONO } from "./theme";
import { newStep, toRecipeConfig, fromRecipeConfig } from "./args";
import { IconBtn, Btn, StepCard, OperationPicker, RecipesModal } from "./components";

const K = { state: "cc:state", favs: "cc:favs", saved: "cc:saved" };

function Main() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const engine = useEngine();
  const { ready, ops, categories, bake, error: engineError } = engine;

  const [tab, setTab] = useState("recipe");
  const [input, setInput] = useState("");
  const [steps, setSteps] = useState([]);
  const [auto, setAuto] = useState(true);
  const [out, setOut] = useState({ text: "", error: null, duration: null });
  const [baking, setBaking] = useState(false);
  const [picker, setPicker] = useState(false);
  const [recipes, setRecipes] = useState(false);
  const [favs, setFavs] = useState([]);
  const [saved, setSaved] = useState([]);
  const [toast, setToast] = useState("");
  const [loaded, setLoaded] = useState(false);
  const toastTimer = useRef(null);

  const say = useCallback(m => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1600);
  }, []);

  // restore
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
        if (r) setSaved(JSON.parse(r));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // persist
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

  // back button closes modals first
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (picker) { setPicker(false); return true; }
      if (recipes) { setRecipes(false); return true; }
      if (tab !== "recipe") { setTab("recipe"); return true; }
      return false;
    });
    return () => sub.remove();
  }, [picker, recipes, tab]);

  const addOp = name => {
    setSteps(s => [...s.map(x => ({ ...x, open: false })), newStep(name, ops)]);
    setPicker(false);
    setTab("recipe");
  };
  const updateStep = (uid, next) => setSteps(s => s.map(x => (x.uid === uid ? next : x)));
  const moveStep = (i, d) => setSteps(s => {
    const a = [...s]; const j = i + d;
    if (j < 0 || j >= a.length) return s;
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  });
  const toggleFav = n => setFavs(f => {
    const nf = f.includes(n) ? f.filter(x => x !== n) : [...f, n];
    AsyncStorage.setItem(K.favs, JSON.stringify(nf)).catch(() => {});
    return nf;
  });

  const cleanRecipe = () => JSON.parse(JSON.stringify(recipe, (k, v) => (typeof v === "number" && Number.isNaN(v) ? null : v)));
  const persistSaved = list => { setSaved(list); AsyncStorage.setItem(K.saved, JSON.stringify(list)).catch(() => {}); };

  const saveRecipe = name => {
    persistSaved([{ id: String(Date.now()), name, recipe: cleanRecipe() }, ...saved]);
    say("Recipe saved");
  };
  const loadRecipe = r => {
    setSteps(fromRecipeConfig(r.recipe, ops));
    setRecipes(false);
    setTab("recipe");
  };
  const importRecipe = async () => {
    try {
      const txt = await Clipboard.getStringAsync();
      const parsed = JSON.parse(txt);
      const cfg = Array.isArray(parsed) ? parsed : parsed.recipe;
      const next = fromRecipeConfig(cfg, ops);
      if (!next.length) throw new Error("empty");
      setSteps(next);
      setRecipes(false);
      setTab("recipe");
      say(`Imported ${next.length} operations`);
    } catch {
      say("Clipboard has no valid recipe JSON");
    }
  };

  const copy = async (txt, msg = "Copied") => { await Clipboard.setStringAsync(txt); say(msg); };

  if (engineError) {
    return (
      <View style={[S.center, { backgroundColor: t.bg }]}>
        <MaterialIcons name="error-outline" size={48} color={t.danger} />
        <Text style={{ color: t.text, marginTop: 12, fontSize: 16 }}>{engineError}</Text>
      </View>
    );
  }

  const header = (
    <View style={{ paddingTop: insets.top, backgroundColor: t.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 4 }}>
        <MaterialIcons name="restaurant" size={22} color={t.primary} />
        <Text style={{ flex: 1, color: t.text, fontSize: 20, fontWeight: "700", marginLeft: 10 }}>CyberChef</Text>
        <IconBtn name="folder-open" onPress={() => setRecipes(true)} disabled={!ready} />
        <IconBtn name="bolt" color={auto ? t.primary : t.sub} onPress={() => { setAuto(!auto); say(auto ? "Auto bake off" : "Auto bake on"); }} />
        <IconBtn name="play-arrow" color={t.primary} onPress={() => { runBake(); setTab("output"); }} disabled={!ready} />
      </View>
      {baking ? <ActivityIndicator size="small" color={t.primary} style={{ position: "absolute", right: 14, bottom: -22 }} /> : null}
    </View>
  );

  const nav = (
    <View style={{
      flexDirection: "row", backgroundColor: t.surface, paddingBottom: insets.bottom,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border
    }}>
      {[["input", "Input", "edit"], ["recipe", "Recipe", "tune"], ["output", "Output", "terminal"]].map(([k, l, ic]) => {
        const on = tab === k;
        return (
          <Pressable key={k} onPress={() => setTab(k)} android_ripple={{ color: t.border }} style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 4, borderRadius: 16, backgroundColor: on ? t.chip : "transparent" }}>
              <MaterialIcons name={ic} size={24} color={on ? t.primary : t.sub} />
              {k === "recipe" && validSteps.length ? (
                <View style={{ position: "absolute", top: -2, right: 8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                  <Text style={{ color: t.dark ? t.onPrimary : "#fff", fontSize: 10, fontWeight: "800" }}>{validSteps.length}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ color: on ? t.text : t.sub, fontSize: 12, fontWeight: on ? "700" : "500", marginTop: 2 }}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  let body;
  if (!ready) {
    body = (
      <View style={S.center}>
        <ActivityIndicator size="large" color={t.primary} />
        <Text style={{ color: t.sub, marginTop: 14 }}>Starting CyberChef engine…</Text>
      </View>
    );
  } else if (tab === "input") {
    body = (
      <View style={{ flex: 1, padding: 12 }}>
        <TextInput
          value={input} onChangeText={setInput} multiline autoCapitalize="none" autoCorrect={false}
          placeholder="Type or paste your input here" placeholderTextColor={t.sub} selectionColor={t.primary}
          style={{
            flex: 1, color: t.text, backgroundColor: t.surface, borderRadius: 20, padding: 16, fontFamily: MONO, fontSize: 14,
            textAlignVertical: "top", borderWidth: 1, borderColor: t.border
          }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
          <Text style={{ flex: 1, color: t.sub, fontSize: 12 }}>{input.length} chars · {input ? input.split("\n").length : 0} lines</Text>
          <Btn label="Paste" icon="content-paste" tonal onPress={async () => setInput(await Clipboard.getStringAsync())} />
          <Btn label="Clear" icon="clear" tonal onPress={() => setInput("")} disabled={!input} />
        </View>
      </View>
    );
  } else if (tab === "recipe") {
    body = (
      <View style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}>
          {validSteps.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 72, paddingHorizontal: 32 }}>
              <MaterialIcons name="auto-awesome" size={56} color={t.primary} />
              <Text style={{ color: t.text, fontSize: 18, fontWeight: "700", marginTop: 14 }}>Build your recipe</Text>
              <Text style={{ color: t.sub, textAlign: "center", marginTop: 6 }}>
                Add operations to encode, decode, encrypt, hash and analyse data. Try “From Base64” or “Magic”.
              </Text>
            </View>
          ) : validSteps.map((s, i) => (
            <StepCard
              key={s.uid} index={i} step={s} def={ops[s.name]} count={validSteps.length}
              onChange={n => updateStep(s.uid, n)}
              onMove={d => moveStep(steps.indexOf(s), d)}
              onRemove={() => setSteps(x => x.filter(y => y.uid !== s.uid))}
              onToggle={() => updateStep(s.uid, { ...s, disabled: !s.disabled })}
            />
          ))}
          {validSteps.length > 1 ? (
            <Pressable onPress={() => setSteps([])} style={{ alignSelf: "center", padding: 12 }}>
              <Text style={{ color: t.danger, fontWeight: "600" }}>Clear recipe</Text>
            </Pressable>
          ) : null}
        </ScrollView>
        <Pressable
          onPress={() => setPicker(true)}
          android_ripple={{ color: "#ffffff30" }}
          style={{
            position: "absolute", right: 16, bottom: 16, height: 56, paddingHorizontal: 20, borderRadius: 18,
            backgroundColor: t.primary, flexDirection: "row", alignItems: "center", gap: 8, elevation: 6
          }}
        >
          <MaterialIcons name="add" size={24} color={t.dark ? t.onPrimary : "#fff"} />
          <Text style={{ color: t.dark ? t.onPrimary : "#fff", fontWeight: "700", fontSize: 15 }}>Add operation</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <View style={{ flex: 1, padding: 12 }}>
        {out.error ? (
          <View style={{ backgroundColor: t.danger + "22", borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: "row", gap: 8 }}>
            <MaterialIcons name="error-outline" size={20} color={t.danger} />
            <Text selectable style={{ flex: 1, color: t.danger, fontSize: 13 }}>{out.error}</Text>
          </View>
        ) : null}
        <ScrollView style={{ flex: 1, backgroundColor: t.surface, borderRadius: 20, borderWidth: 1, borderColor: t.border }} contentContainerStyle={{ padding: 16 }}>
          <Text selectable style={{ color: t.text, fontFamily: MONO, fontSize: 14 }}>
            {out.text || (baking ? "Baking…" : "Output will appear here")}
          </Text>
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
          <Text style={{ flex: 1, color: t.sub, fontSize: 12 }}>
            {out.text.length} chars{out.duration != null ? ` · ${out.duration} ms` : ""}
          </Text>
          <Btn label="Copy" icon="content-copy" tonal onPress={() => copy(out.text)} disabled={!out.text} />
          <Btn label="Share" icon="share" tonal onPress={() => Share.share({ message: out.text })} disabled={!out.text} />
          <Btn label="To input" icon="input" tonal onPress={() => { setInput(out.text); setSteps([]); setTab("input"); }} disabled={!out.text} />
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
        <View pointerEvents="none" style={{ position: "absolute", bottom: insets.bottom + 90, alignSelf: "center", backgroundColor: t.text, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ color: t.bg, fontWeight: "600" }}>{toast}</Text>
        </View>
      ) : null}
      {ready ? (
        <>
          <OperationPicker
            visible={picker} ops={ops} categories={categories} favs={favs}
            onToggleFav={toggleFav} onPick={addOp} onClose={() => setPicker(false)}
          />
          <RecipesModal
            visible={recipes} saved={saved} onSave={saveRecipe} onLoad={loadRecipe}
            onDelete={id => persistSaved(saved.filter(r => r.id !== id))}
            onCopy={() => copy(JSON.stringify(cleanRecipe(), null, 2), "Recipe JSON copied")}
            onImport={importRecipe} onClose={() => setRecipes(false)}
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
