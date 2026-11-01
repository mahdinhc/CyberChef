import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, Switch, Modal, FlatList, ScrollView, StyleSheet, Platform
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, MONO } from "./theme";
import { stripHtml, hiddenArgs } from "./args";

export const IconBtn = ({ name, onPress, color, size = 24, style, disabled }) => {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      android_ripple={{ color: t.border, borderless: true, radius: 22 }}
      style={[{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : 1 }, style]}
    >
      <MaterialIcons name={name} size={size} color={color || t.text} />
    </Pressable>
  );
};

export const Btn = ({ label, icon, onPress, tonal, danger, disabled, style }) => {
  const t = useTheme();
  const bg = danger ? t.danger : tonal ? t.chip : t.primary;
  const fg = tonal ? t.text : t.dark ? t.onPrimary : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: "#ffffff30" }}
      style={[{
        height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: bg,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.5 : 1
      }, style]}
    >
      {icon ? <MaterialIcons name={icon} size={20} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: "600", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
};

export const Chip = ({ label, active, onPress }) => {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: "center", marginRight: 8,
        backgroundColor: active ? t.primary : t.chip
      }}
    >
      <Text style={{ color: active ? (t.dark ? t.onPrimary : "#fff") : t.text, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
};

/* ---------- bottom sheet list picker ---------- */
export function SelectSheet({ visible, title, options, selected, onSelect, onClose }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: "#000a" }} onPress={onClose} />
      <View style={{
        backgroundColor: t.surface, maxHeight: "70%", borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: insets.bottom + 8
      }}>
        <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: t.border, marginTop: 8 }} />
        <Text style={{ color: t.text, fontSize: 16, fontWeight: "700", padding: 16 }}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(o, i) => `${i}-${o.label}`}
          renderItem={({ item }) => item.header ? (
            <Text style={{ color: t.primary, fontSize: 12, fontWeight: "700", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
              {item.label.toUpperCase()}
            </Text>
          ) : (
            <Pressable
              onPress={() => { onSelect(item); onClose(); }}
              android_ripple={{ color: t.border }}
              style={{ paddingHorizontal: 16, minHeight: 48, justifyContent: "center", flexDirection: "row", alignItems: "center" }}
            >
              <Text style={{ flex: 1, color: item.label === selected ? t.primary : t.text, fontSize: 15 }}>{item.label}</Text>
              {item.label === selected ? <MaterialIcons name="check" size={20} color={t.primary} /> : null}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

/* ---------- argument editor ---------- */
const isHeader = n => /^\[\/?[^\]]*\]$/.test(n);

function inputStyle(t, multiline) {
  return {
    color: t.text, backgroundColor: t.surface2, borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: multiline ? 10 : 8, minHeight: 44, fontFamily: MONO, fontSize: 14,
    borderWidth: 1, borderColor: t.border, textAlignVertical: multiline ? "top" : "center"
  };
}

function SelectField({ t, label, value, onPress }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: t.sub, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <Pressable onPress={onPress} style={[inputStyle(t), { flexDirection: "row", alignItems: "center" }]}>
        <Text style={{ flex: 1, color: t.text, fontFamily: MONO, fontSize: 14 }} numberOfLines={1}>{String(value)}</Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={t.sub} />
      </Pressable>
    </View>
  );
}

export function ArgField({ a, value, onChange, onPopulate }) {
  const t = useTheme();
  const [sheet, setSheet] = useState(null);

  if (a.type === "label") {
    return <Text style={{ color: t.primary, fontWeight: "700", marginTop: 12, fontSize: 13 }}>{a.name}</Text>;
  }

  if (a.type === "boolean") {
    return (
      <Pressable onPress={() => onChange(!value)} style={{ flexDirection: "row", alignItems: "center", marginTop: 6, minHeight: 44 }}>
        <Text style={{ flex: 1, color: t.text, fontSize: 14 }}>{a.name}</Text>
        <Switch
          value={!!value}
          onValueChange={onChange}
          trackColor={{ true: t.primary + "99", false: t.border }}
          thumbColor={value ? t.primary : t.sub}
        />
      </Pressable>
    );
  }

  if (a.type === "option" || a.type === "argSelector" || a.type === "populateOption" || a.type === "populateMultiOption") {
    let options;
    if (a.type === "option") options = a.value.map(v => ({ label: v, raw: v }));
    else options = a.value.map(v => isHeader(v.name)
      ? (v.name.startsWith("[/") ? null : { header: true, label: v.name.replace(/^\[|\]$/g, "") })
      : { label: v.name, raw: v }).filter(Boolean);
    return (
      <>
        <SelectField t={t} label={a.name} value={value} onPress={() => setSheet(true)} />
        <SelectSheet
          visible={!!sheet} title={a.name} options={options} selected={value}
          onSelect={o => { onChange(o.label); if (a.type.startsWith("populate")) onPopulate(a, o.raw); }}
          onClose={() => setSheet(false)}
        />
      </>
    );
  }

  if (a.type === "editableOption" || a.type === "editableOptionShort") {
    const options = a.value.map(v => ({ label: v.name, raw: v }));
    return (
      <View style={{ marginTop: 10 }}>
        <Text style={{ color: t.sub, fontSize: 12, marginBottom: 4 }}>{a.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            value={String(value ?? "")} onChangeText={onChange} autoCapitalize="none" autoCorrect={false}
            style={[inputStyle(t), { flex: 1 }]} placeholderTextColor={t.sub} selectionColor={t.primary}
          />
          <IconBtn name="arrow-drop-down-circle" color={t.primary} onPress={() => setSheet(true)} />
        </View>
        <SelectSheet
          visible={!!sheet} title={`${a.name} presets`} options={options} selected={null}
          onSelect={o => onChange(o.raw.value)} onClose={() => setSheet(false)}
        />
      </View>
    );
  }

  if (a.type === "toggleString") {
    const cur = value || { string: "", option: a.toggleValues[0] };
    const options = a.toggleValues.map(v => ({ label: v }));
    return (
      <View style={{ marginTop: 10 }}>
        <Text style={{ color: t.sub, fontSize: 12, marginBottom: 4 }}>{a.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            value={cur.string} onChangeText={s => onChange({ ...cur, string: s })} autoCapitalize="none" autoCorrect={false}
            style={[inputStyle(t), { flex: 1 }]} selectionColor={t.primary}
          />
          <Pressable
            onPress={() => setSheet(true)}
            style={{ height: 44, borderRadius: 12, paddingHorizontal: 12, backgroundColor: t.chip, flexDirection: "row", alignItems: "center" }}
          >
            <Text style={{ color: t.primary, fontWeight: "700", fontSize: 13 }}>{cur.option}</Text>
            <MaterialIcons name="arrow-drop-down" size={20} color={t.primary} />
          </Pressable>
        </View>
        <SelectSheet
          visible={!!sheet} title={`${a.name} format`} options={options} selected={cur.option}
          onSelect={o => onChange({ ...cur, option: o.label })} onClose={() => setSheet(false)}
        />
      </View>
    );
  }

  const multiline = ["string", "binaryString", "byteArray", "text"].includes(a.type);
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: t.sub, fontSize: 12, marginBottom: 4 }}>{a.name}</Text>
      <TextInput
        value={String(value ?? "")}
        onChangeText={onChange}
        multiline={multiline}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={a.type === "number" ? "numbers-and-punctuation" : "default"}
        placeholder={a.hint || undefined}
        placeholderTextColor={t.sub}
        selectionColor={t.primary}
        style={inputStyle(t, multiline)}
      />
    </View>
  );
}

/* ---------- one recipe step ---------- */
export function StepCard({ index, step, def, count, onChange, onMove, onRemove, onToggle }) {
  const t = useTheme();
  const hidden = useMemo(() => hiddenArgs(def, step.args), [def, step.args]);

  const setArg = (i, v) => onChange({ ...step, args: step.args.map((x, k) => (k === i ? v : x)) });
  const populate = (a, entry) => {
    const next = [...step.args];
    const targets = Array.isArray(a.target) ? a.target : [a.target];
    targets.forEach((tg, k) => {
      if (tg === null || tg === undefined) return;
      const v = a.type === "populateMultiOption" ? entry.value[k] : entry.value;
      const tt = def.a[tg];
      next[tg] = tt && tt.type === "toggleString" && typeof v === "string" ? { ...(next[tg] || {}), string: v, option: (next[tg] || {}).option || tt.toggleValues[0] } :
        tt && tt.type === "number" ? String(v) : v;
    });
    onChange({ ...step, args: next });
  };

  return (
    <View style={{
      backgroundColor: t.surface, borderRadius: 20, marginHorizontal: 12, marginBottom: 10,
      borderWidth: 1, borderColor: t.border, opacity: step.disabled ? 0.55 : 1, overflow: "hidden"
    }}>
      <Pressable
        onPress={() => onChange({ ...step, open: !step.open })}
        android_ripple={{ color: t.border }}
        style={{ flexDirection: "row", alignItems: "center", paddingLeft: 14, minHeight: 56 }}
      >
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.chip, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
          <Text style={{ color: t.primary, fontWeight: "700", fontSize: 12 }}>{index + 1}</Text>
        </View>
        <Text style={{ flex: 1, color: t.text, fontSize: 15, fontWeight: "600" }} numberOfLines={2}>{step.name}</Text>
        <IconBtn name={step.disabled ? "visibility-off" : "visibility"} size={20} color={t.sub} onPress={onToggle} />
        <MaterialIcons name={step.open ? "expand-less" : "expand-more"} size={24} color={t.sub} style={{ marginRight: 10 }} />
      </Pressable>

      {step.open ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          {def.d ? (
            <Text style={{ color: t.sub, fontSize: 12, lineHeight: 17 }} numberOfLines={5}>{stripHtml(def.d)}</Text>
          ) : null}
          {def.a.map((a, i) => hidden.has(i) ? null : (
            <ArgField key={i} a={a} value={step.args[i]} onChange={v => setArg(i, v)} onPopulate={populate} />
          ))}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
            <IconBtn name="arrow-upward" disabled={index === 0} onPress={() => onMove(-1)} color={t.sub} />
            <IconBtn name="arrow-downward" disabled={index === count - 1} onPress={() => onMove(1)} color={t.sub} />
            <IconBtn name="delete-outline" onPress={onRemove} color={t.danger} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/* ---------- operation browser ---------- */
export function OperationPicker({ visible, ops, categories, favs, onToggleFav, onPick, onClose }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const list = useMemo(() => {
    if (!ops) return [];
    let names;
    if (cat === "All") names = Object.keys(ops);
    else if (cat === "Favourites") names = favs.filter(n => ops[n]);
    else names = (categories.find(c => c.name === cat) || { ops: [] }).ops;
    const s = q.trim().toLowerCase();
    if (!s) return cat === "All" ? [...names].sort((a, b) => a.localeCompare(b)) : names;
    const toks = s.split(/\s+/);
    const scored = [];
    for (const n of names) {
      const ln = n.toLowerCase();
      const ld = stripHtml(ops[n].d).toLowerCase();
      if (toks.every(k => ln.includes(k))) scored.push([ln.startsWith(s) ? 0 : 1, n]);
      else if (toks.every(k => ld.includes(k))) scored.push([2, n]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])).map(x => x[1]);
  }, [ops, categories, favs, q, cat]);

  const tabs = ["All", "Favourites", ...categories.map(c => c.name)];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 6 }}>
          <IconBtn name="arrow-back" onPress={onClose} />
          <View style={{
            flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: t.surface2,
            borderRadius: 24, paddingHorizontal: 14, height: 48, marginRight: 12
          }}>
            <MaterialIcons name="search" size={20} color={t.sub} />
            <TextInput
              value={q} onChangeText={setQ} placeholder="Search 500+ operations" placeholderTextColor={t.sub}
              autoCapitalize="none" autoCorrect={false} selectionColor={t.primary}
              style={{ flex: 1, color: t.text, fontSize: 15, marginLeft: 8 }}
            />
            {q ? <IconBtn name="close" size={18} color={t.sub} onPress={() => setQ("")} style={{ width: 32 }} /> : null}
          </View>
        </View>
        <View style={{ height: 48 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, alignItems: "center" }}>
            {tabs.map(c => <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />)}
          </ScrollView>
        </View>
        <FlatList
          data={list}
          keyExtractor={n => n}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={16}
          windowSize={7}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ListEmptyComponent={
            <Text style={{ color: t.sub, textAlign: "center", marginTop: 48 }}>
              {cat === "Favourites" ? "Star operations to find them here." : "No operations found."}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { onPick(item); setQ(""); }}
              android_ripple={{ color: t.border }}
              style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }}
            >
              <View style={{ flex: 1, paddingVertical: 10 }}>
                <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }}>{item}</Text>
                <Text style={{ color: t.sub, fontSize: 12, marginTop: 2 }} numberOfLines={2}>{stripHtml(ops[item].d)}</Text>
              </View>
              <IconBtn
                name={favs.includes(item) ? "star" : "star-outline"}
                color={favs.includes(item) ? t.warn : t.sub}
                onPress={() => onToggleFav(item)}
              />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

/* ---------- saved recipes ---------- */
export function RecipesModal({ visible, saved, onSave, onLoad, onDelete, onCopy, onImport, onClose }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4 }}>
          <IconBtn name="arrow-back" onPress={onClose} />
          <Text style={{ color: t.text, fontSize: 20, fontWeight: "700" }}>Recipes</Text>
        </View>
        <View style={{ padding: 16, gap: 10 }}>
          <TextInput
            value={name} onChangeText={setName} placeholder="Name for current recipe" placeholderTextColor={t.sub}
            selectionColor={t.primary}
            style={{ color: t.text, backgroundColor: t.surface2, borderRadius: 14, paddingHorizontal: 14, height: 48, fontSize: 15 }}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Save" icon="save" style={{ flex: 1 }} disabled={!name.trim()} onPress={() => { onSave(name.trim()); setName(""); }} />
            <Btn label="Copy JSON" icon="content-copy" tonal style={{ flex: 1 }} onPress={onCopy} />
            <Btn label="Import" icon="content-paste" tonal style={{ flex: 1 }} onPress={onImport} />
          </View>
        </View>
        <FlatList
          data={saved}
          keyExtractor={r => r.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ListEmptyComponent={<Text style={{ color: t.sub, textAlign: "center", marginTop: 32 }}>No saved recipes yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onLoad(item)}
              android_ripple={{ color: t.border }}
              style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }}>{item.name}</Text>
                <Text style={{ color: t.sub, fontSize: 12 }}>{item.recipe.length} operation{item.recipe.length === 1 ? "" : "s"}</Text>
              </View>
              <IconBtn name="delete-outline" color={t.danger} onPress={() => onDelete(item.id)} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
