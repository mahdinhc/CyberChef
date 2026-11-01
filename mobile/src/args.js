let uid = 1;
export const nextUid = () => `s${Date.now().toString(36)}${uid++}`;

export const stripHtml = s =>
  (s || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .trim();

const isHeader = n => /^\[\/?[^\]]*\]$/.test(n);

export function defaultArg(a) {
  const di = a.defaultIndex || 0;
  switch (a.type) {
    case "option": return a.value[di];
    case "editableOption":
    case "editableOptionShort": return a.value[di].value;
    case "populateOption":
    case "populateMultiOption": return (a.value.find(v => !isHeader(v.name)) || a.value[0]).name;
    case "argSelector": return a.value[di].name;
    case "toggleString": return { string: a.value || "", option: a.toggleValues[0] };
    case "boolean": return !!a.value;
    case "number": return a.value === undefined || a.value === null ? "" : String(a.value);
    case "label": return "";
    default: return a.value === undefined || a.value === null ? "" : String(a.value);
  }
}

export function newStep(name, ops) {
  return { uid: nextUid(), name, args: ops[name].a.map(defaultArg), disabled: false, open: true };
}

export function hiddenArgs(def, values) {
  const hidden = new Set();
  def.a.forEach((a, i) => {
    if (a.type !== "argSelector") return;
    const e = a.value.find(v => v.name === values[i]);
    if (!e) return;
    (e.off || []).forEach(x => hidden.add(x));
    (e.on || []).forEach(x => hidden.delete(x));
  });
  return hidden;
}

// Convert UI state to the CyberChef recipeConfig format
export function toRecipeConfig(steps, ops) {
  return steps.map(s => {
    const def = ops[s.name];
    const args = def.a.map((a, i) => {
      const v = s.args[i];
      if (a.type === "number") {
        const n = parseFloat(v);
        return Number.isNaN(n) ? NaN : n;
      }
      return v;
    });
    const item = { op: s.name, args };
    if (s.disabled) item.disabled = true;
    return item;
  });
}

// Load a CyberChef-format recipe ([{op, args}]) into UI steps
export function fromRecipeConfig(cfg, ops) {
  return cfg.filter(c => ops[c.op]).map(c => {
    const def = ops[c.op];
    const args = def.a.map((a, i) => {
      const v = c.args ? c.args[i] : undefined;
      if (v === undefined || v === null) return defaultArg(a);
      if (a.type === "number") return String(v);
      return v;
    });
    return { uid: nextUid(), name: c.op, args, disabled: !!c.disabled, open: false };
  });
}

// Short one-line summary of a step's current arguments (shown on collapsed cards)
export function stepSummary(step, def) {
  const parts = [];
  def.a.forEach((a, i) => {
    if (parts.length >= 2 || a.type === "label") return;
    let v = step.args[i];
    if (v && typeof v === "object") v = v.string;
    if (v === undefined || v === null || v === "" || v === false) return;
    v = v === true ? a.name : String(v).replace(/\s+/g, " ");
    parts.push(v.length > 18 ? v.slice(0, 18) + "\u2026" : v);
  });
  return parts.join("  \u00b7  ");
}

export const STARTER_PRESETS = [
  { id: "starter-b64d", name: "Decode Base64", recipe: [{ op: "From Base64" }] },
  { id: "starter-b64e", name: "Encode Base64", recipe: [{ op: "To Base64" }] },
  { id: "starter-hex", name: "Hex to text", recipe: [{ op: "From Hex" }] },
  { id: "starter-url", name: "URL decode", recipe: [{ op: "URL Decode" }] },
  { id: "starter-rot13", name: "ROT13", recipe: [{ op: "ROT13" }] },
  { id: "starter-md5", name: "MD5 hash", recipe: [{ op: "MD5" }] },
  { id: "starter-magic", name: "Magic (auto-detect)", recipe: [{ op: "Magic" }] }
];
