import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, Switch, Modal, FlatList, ScrollView, StyleSheet
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./icons";
import { useTheme, MONO, R } from "./theme";
import { stripHtml, hiddenArgs, stepSummary } from "./args";

/* ------------------------------------------------------------------ */
/* primitives                                                          */
/* ------------------------------------------------------------------ */
export const IconBtn = ({ name, onPress, color, size = 22, style, disabled, filled }) => {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      android_ripple={{ color: t.border, borderless: true, radius: 22 }}
      style={[{
        width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
        opacity: disabled ? 0.35 : 1, backgroundColor: filled ? t.primary : "transparent"
      }, style]}
    >
      <Icon name={name} size={size} color={filled ? (t.dark ? t.onPrimary : "#fff") : color || t.text} />
    </Pressable>
  );
};

export const Btn = ({ label, icon, onPress, variant = "filled", danger, disabled, style, compact }) => {
  const t = useTheme();
  const filled = variant === "filled";
  const outline = variant === "outline";
  const bg = filled ? (danger ? t.danger : t.primary) : outline ? "transparent" : t.chip;
  const fg = filled ? (t.dark ? t.onPrimary : "#fff") : danger ? t.danger : outline ? t.primary : t.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: "#ffffff22" }}
      style={[{
        height: compact ? 40 : 46, paddingHorizontal: compact ? 12 : 18, borderRadius: R.pill, backgroundColor: bg,
        borderWidth: outline ? 1.5 : 0, borderColor: t.primary, flexDirection: "row", alignItems: "center",
        justifyContent: "center", opacity: disabled ? 0.4 : 1
      }, style]}
    >
      {icon ? <Icon name={icon} size={18} color={fg} style={{ marginRight: label ? 8 : 0 }} /> : null}
      {label ? <Text style={{ color: fg, fontWeight: "700", fontSize: 13.5, letterSpacing: 0.2 }}>{label}</Text> : null}
    </Pressable>
  );
};

export const Chip = ({ label, active, onPress }) => {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 34, paddingHorizontal: 14, borderRadius: R.pill, justifyContent: "center", marginRight: 8,
        backgroundColor: active ? t.primary : t.chip, borderWidth: 1, borderColor: active ? t.primary : t.border
      }}
    >
      <Text style={{ color: active ? (t.dark ? t.onPrimary : "#fff") : t.text, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
};

export const Card = ({ children, style }) => {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.surface, borderRadius: R.card, borderWidth: 1, borderColor: t.border }, style]}>
      {children}
    </View>
  );
};

export const SectionLabel = ({ children, style }) => {
  const t = useTheme();
  return (
    <Text style={[{ color: t.sub, fontSize: 11.5, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }, style]}>
      {children}
    </Text>
  );
};

export const monoInput = (t, multiline) => ({
  color: t.text, backgroundColor: t.surface2, borderRadius: R.field, paddingHorizontal: 12,
  paddingVertical: multiline ? 10 : 8, minHeight: 46, fontFamily: MONO, fontSize: 13.5, lineHeight: multiline ? 20 : undefined,
  borderWidth: 1, borderColor: t.border, textAlignVertical: multiline ? "top" : "center"
});

/* ------------------------------------------------------------------ */
/* bottom sheet picker                                                 */
/* ------------------------------------------------------------------ */
export function SelectSheet({ visible, title, options, selected, onSelect, onClose }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const data = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter(o => !o.header && o.label.toLowerCase().includes(s)) : options;
  }, [options, q]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: "#000a" }} onPress={onClose} />
      <View style={{
        backgroundColor: t.surface, maxHeight: "75%", borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingBottom: insets.bottom + 8
      }}>
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, marginTop: 10 }} />
        <Text style={{ color: t.text, fontSize: 17, fontWeight: "700", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>{title}</Text>
        {options.length > 12 ? (
          <View style={{
            flexDirection: "row", alignItems: "center", backgroundColor: t.surface2, borderRadius: R.pill,
            marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, height: 42
          }}>
            <Icon name="search" size={18} color={t.sub} />
            <TextInput
              value={q} onChangeText={setQ} placeholder="Filter" placeholderTextColor={t.sub}
              style={{ flex: 1, color: t.text, marginLeft: 8, fontSize: 14 }} selectionColor={t.primary}
            />
          </View>
        ) : null}
        <FlatList
          data={data}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(o, i) => `${i}-${o.label}`}
          renderItem={({ item }) => item.header ? (
            <Text style={{ color: t.primary, fontSize: 11.5, fontWeight: "800", letterSpacing: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 }}>
              {item.label.toUpperCase()}
            </Text>
          ) : (
            <Pressable
              onPress={() => { onSelect(item); setQ(""); onClose(); }}
              android_ripple={{ color: t.border }}
              style={{ paddingHorizontal: 20, minHeight: 50, flexDirection: "row", alignItems: "center", backgroundColor: item.label === selected ? t.primaryDim : "transparent" }}
            >
              <Text style={{ flex: 1, color: item.label === selected ? t.primary : t.text, fontSize: 15, fontWeight: item.label === selected ? "700" : "400" }}>
                {item.label}
              </Text>
              {item.label === selected ? <Icon name="check" size={20} color={t.primary} /> : null}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* argument editor                                                     */
/* ------------------------------------------------------------------ */
const isHeader = n => /^\[\/?[^\]]*\]$/.test(n);

function FieldLabel({ t, children }) {
  return <Text style={{ color: t.sub, fontSize: 12, fontWeight: "600", marginBottom: 6 }}>{children}</Text>;
}

function SelectField({ t, label, value, onPress }) {
  return (
    <View style={{ marginTop: 14 }}>
      <FieldLabel t={t}>{label}</FieldLabel>
      <Pressable onPress={onPress} style={[monoInput(t), { flexDirection: "row", alignItems: "center" }]}>
        <Text style={{ flex: 1, color: t.text, fontFamily: MONO, fontSize: 13.5 }} numberOfLines={1}>{String(value)}</Text>
        <Icon name="drop-down" size={26} color={t.sub} />
      </Pressable>
    </View>
  );
}

export function ArgField({ a, value, onChange, onPopulate }) {
  const t = useTheme();
  const [sheet, setSheet] = useState(false);

  if (a.type === "label") {
    return <Text style={{ color: t.primary, fontWeight: "800", marginTop: 16, fontSize: 12.5, letterSpacing: 0.4 }}>{a.name}</Text>;
  }

  if (a.type === "boolean") {
    return (
      <Pressable onPress={() => onChange(!value)} style={{ flexDirection: "row", alignItems: "center", marginTop: 8, minHeight: 46 }}>
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
          visible={sheet} title={a.name} options={options} selected={value}
          onSelect={o => { onChange(o.label); if (a.type.startsWith("populate")) onPopulate(a, o.raw); }}
          onClose={() => setSheet(false)}
        />
      </>
    );
  }

  if (a.type === "editableOption" || a.type === "editableOptionShort") {
    const options = a.value.map(v => ({ label: v.name, raw: v }));
    return (
      <View style={{ marginTop: 14 }}>
        <FieldLabel t={t}>{a.name}</FieldLabel>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            value={String(value ?? "")} onChangeText={onChange} autoCapitalize="none" autoCorrect={false}
            style={[monoInput(t), { flex: 1 }]} placeholderTextColor={t.sub} selectionColor={t.primary}
          />
          <IconBtn name="layers" color={t.primary} onPress={() => setSheet(true)} style={{ marginLeft: 4 }} />
        </View>
        <SelectSheet
          visible={sheet} title={`${a.name} presets`} options={options} selected={null}
          onSelect={o => onChange(o.raw.value)} onClose={() => setSheet(false)}
        />
      </View>
    );
  }

  if (a.type === "toggleString") {
    const cur = value || { string: "", option: a.toggleValues[0] };
    const options = a.toggleValues.map(v => ({ label: v }));
    return (
      <View style={{ marginTop: 14 }}>
        <FieldLabel t={t}>{a.name}</FieldLabel>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            value={cur.string} onChangeText={s => onChange({ ...cur, string: s })} autoCapitalize="none" autoCorrect={false}
            style={[monoInput(t), { flex: 1 }]} selectionColor={t.primary}
          />
          <Pressable
            onPress={() => setSheet(true)}
            style={{ height: 46, borderRadius: R.field, paddingLeft: 12, paddingRight: 6, backgroundColor: t.primaryDim, flexDirection: "row", alignItems: "center", marginLeft: 8 }}
          >
            <Text style={{ color: t.primary, fontWeight: "800", fontSize: 12.5 }}>{cur.option}</Text>
            <Icon name="drop-down" size={22} color={t.primary} />
          </Pressable>
        </View>
        <SelectSheet
          visible={sheet} title={`${a.name} format`} options={options} selected={cur.option}
          onSelect={o => onChange({ ...cur, option: o.label })} onClose={() => setSheet(false)}
        />
      </View>
    );
  }

  const multiline = ["string", "binaryString", "byteArray", "text"].includes(a.type);
  return (
    <View style={{ marginTop: 14 }}>
      <FieldLabel t={t}>{a.name}</FieldLabel>
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
        style={monoInput(t, multiline)}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* recipe step card                                                    */
/* ------------------------------------------------------------------ */
export function StepCard({ index, step, def, count, onChange, onMove, onRemove, onToggle }) {
  const t = useTheme();
  const hidden = useMemo(() => hiddenArgs(def, step.args), [def, step.args]);
  const summary = useMemo(() => stepSummary(step, def), [step.args, def]);

  const setArg = (i, v) => onChange({ ...step, args: step.args.map((x, k) => (k === i ? v : x)) });
  const populate = (a, entry) => {
    const next = [...step.args];
    const targets = Array.isArray(a.target) ? a.target : [a.target];
    targets.forEach((tg, k) => {
      if (tg === null || tg === undefined) return;
      const v = a.type === "populateMultiOption" ? entry.value[k] : entry.value;
      const tt = def.a[tg];
      next[tg] = tt && tt.type === "toggleString" && typeof v === "string"
        ? { ...(next[tg] || {}), string: v, option: (next[tg] || {}).option || tt.toggleValues[0] }
        : tt && tt.type === "number" ? String(v) : v;
    });
    onChange({ ...step, args: next });
  };

  return (
    <View style={{
      backgroundColor: t.surface, borderRadius: R.card, marginHorizontal: 14, marginBottom: 10,
      borderWidth: 1, borderColor: t.border, opacity: step.disabled ? 0.55 : 1, overflow: "hidden", flexDirection: "row"
    }}>
      <View style={{ width: 4, backgroundColor: step.disabled ? t.border : t.primary }} />
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={() => onChange({ ...step, open: !step.open })}
          android_ripple={{ color: t.border }}
          style={{ flexDirection: "row", alignItems: "center", paddingLeft: 12, minHeight: 62 }}
        >
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <Text style={{ color: t.primary, fontWeight: "800", fontSize: 12.5 }}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1, paddingVertical: 10 }}>
            <Text style={{ color: t.text, fontSize: 15, fontWeight: "700" }} numberOfLines={2}>{step.name}</Text>
            {!step.open && summary ? (
              <Text style={{ color: t.sub, fontSize: 12, fontFamily: MONO, marginTop: 3 }} numberOfLines={1}>{summary}</Text>
            ) : null}
          </View>
          <IconBtn name={step.disabled ? "visibility-off" : "visibility"} size={20} color={t.sub} onPress={onToggle} />
          <Icon name={step.open ? "expand-less" : "expand-more"} size={24} color={t.sub} style={{ marginRight: 12 }} />
        </Pressable>

        {step.open ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
            {def.d ? (
              <View style={{ flexDirection: "row", backgroundColor: t.surface2, borderRadius: R.field, padding: 10 }}>
                <Icon name="info" size={16} color={t.sub} style={{ marginTop: 1, marginRight: 8 }} />
                <Text style={{ flex: 1, color: t.sub, fontSize: 12, lineHeight: 17 }} numberOfLines={6}>{stripHtml(def.d)}</Text>
              </View>
            ) : null}
            {def.a.map((a, i) => hidden.has(i) ? null : (
              <ArgField key={i} a={a} value={step.args[i]} onChange={v => setArg(i, v)} onPopulate={populate} />
            ))}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border, paddingTop: 4 }}>
              <IconBtn name="arrow-up" disabled={index === 0} onPress={() => onMove(-1)} color={t.sub} />
              <IconBtn name="arrow-down" disabled={index === count - 1} onPress={() => onMove(1)} color={t.sub} />
              <IconBtn name="delete" onPress={onRemove} color={t.danger} />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* operation browser                                                   */
/* ------------------------------------------------------------------ */
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
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingTop: 6, paddingBottom: 8 }}>
          <IconBtn name="arrow-back" onPress={onClose} />
          <View style={{
            flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: t.surface,
            borderRadius: R.pill, paddingHorizontal: 16, height: 48, marginRight: 12, borderWidth: 1, borderColor: t.border
          }}>
            <Icon name="search" size={20} color={t.sub} />
            <TextInput
              value={q} onChangeText={setQ} placeholder="Search operations" placeholderTextColor={t.sub}
              autoCapitalize="none" autoCorrect={false} selectionColor={t.primary}
              style={{ flex: 1, color: t.text, fontSize: 15, marginLeft: 10 }}
            />
            {q ? <IconBtn name="close" size={18} color={t.sub} onPress={() => setQ("")} style={{ width: 32, height: 32 }} /> : null}
          </View>
        </View>
        <View style={{ height: 46 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, alignItems: "center" }}>
            {tabs.map(c => <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />)}
          </ScrollView>
        </View>
        <Text style={{ color: t.sub, fontSize: 12, paddingHorizontal: 18, paddingVertical: 6 }}>
          {list.length} operation{list.length === 1 ? "" : "s"}
        </Text>
        <FlatList
          data={list}
          keyExtractor={n => n}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={16}
          windowSize={7}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 56 }}>
              <Icon name={cat === "Favourites" ? "star-outline" : "search"} size={44} color={t.border} />
              <Text style={{ color: t.sub, marginTop: 10 }}>
                {cat === "Favourites" ? "Star operations to pin them here." : "No operations found."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { onPick(item); setQ(""); }}
              android_ripple={{ color: t.border }}
              style={{ flexDirection: "row", alignItems: "center", paddingLeft: 18, minHeight: 68, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }}
            >
              <View style={{ flex: 1, paddingVertical: 10, paddingRight: 4 }}>
                <Text style={{ color: t.text, fontSize: 15, fontWeight: "700" }}>{item}</Text>
                <Text style={{ color: t.sub, fontSize: 12, marginTop: 3, lineHeight: 16 }} numberOfLines={2}>{stripHtml(ops[item].d)}</Text>
              </View>
              <IconBtn
                name={favs.includes(item) ? "star" : "star-outline"}
                color={favs.includes(item) ? t.warn : t.sub}
                onPress={() => onToggleFav(item)}
              />
              <View style={{ width: 8 }} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* presets                                                             */
/* ------------------------------------------------------------------ */
export function PresetsModal({ visible, presets, starters, canSave, onSave, onLoad, onDelete, onCopy, onImport, onClose }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [withInput, setWithInput] = useState(false);
  const [tab, setTab] = useState("mine");

  const data = tab === "mine" ? presets : starters;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4, height: 56 }}>
          <IconBtn name="arrow-back" onPress={onClose} />
          <Text style={{ flex: 1, color: t.text, fontSize: 20, fontWeight: "800" }}>Presets</Text>
          <IconBtn name="copy" onPress={onCopy} color={t.sub} disabled={!canSave} />
          <IconBtn name="paste" onPress={onImport} color={t.sub} />
        </View>

        <Card style={{ marginHorizontal: 14, padding: 14 }}>
          <SectionLabel>Save current recipe</SectionLabel>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
            <TextInput
              value={name} onChangeText={setName} placeholder="Preset name" placeholderTextColor={t.sub}
              selectionColor={t.primary} style={[monoInput(t), { flex: 1, fontFamily: undefined, fontSize: 15 }]}
            />
          </View>
          <Pressable onPress={() => setWithInput(!withInput)} style={{ flexDirection: "row", alignItems: "center", marginTop: 8, minHeight: 44 }}>
            <Text style={{ flex: 1, color: t.text, fontSize: 14 }}>Also store the current input</Text>
            <Switch value={withInput} onValueChange={setWithInput} trackColor={{ true: t.primary + "99", false: t.border }} thumbColor={withInput ? t.primary : t.sub} />
          </Pressable>
          <Btn
            label="Save preset" icon="bookmark-add" disabled={!canSave || !name.trim()} style={{ marginTop: 6 }}
            onPress={() => { onSave(name.trim(), withInput); setName(""); setTab("mine"); }}
          />
          {!canSave ? <Text style={{ color: t.sub, fontSize: 12, marginTop: 8 }}>Add at least one operation to the recipe first.</Text> : null}
        </Card>

        <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingTop: 16, paddingBottom: 6 }}>
          <Chip label={`My presets (${presets.length})`} active={tab === "mine"} onPress={() => setTab("mine")} />
          <Chip label="Starter presets" active={tab === "starter"} onPress={() => setTab("starter")} />
        </View>

        <FlatList
          data={data}
          keyExtractor={r => r.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16, paddingTop: 4 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40, paddingHorizontal: 32 }}>
              <Icon name="bookmark-border" size={44} color={t.border} />
              <Text style={{ color: t.sub, textAlign: "center", marginTop: 10 }}>
                No presets yet. Build a recipe, give it a name above and save it to reuse later.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onLoad(item, "replace")}
              android_ripple={{ color: t.border }}
              style={{
                flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginBottom: 8, paddingLeft: 12,
                minHeight: 68, borderRadius: R.card, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border
              }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: t.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Icon name="bookmark" size={20} color={t.primary} />
              </View>
              <View style={{ flex: 1, paddingVertical: 10 }}>
                <Text style={{ color: t.text, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: t.sub, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
                  {item.recipe.map(r => r.op).join("  \u203A  ")}{item.input ? "  \u00B7  +input" : ""}
                </Text>
              </View>
              <IconBtn name="playlist-add" color={t.primary} onPress={() => onLoad(item, "append")} />
              {tab === "mine" ? <IconBtn name="delete" color={t.danger} onPress={() => onDelete(item.id)} /> : <View style={{ width: 6 }} />}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
