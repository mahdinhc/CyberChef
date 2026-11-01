import { Platform, useColorScheme } from "react-native";

const dark = {
  dark: true, bg: "#0A0E11", surface: "#11171B", surface2: "#192026", border: "#25303A",
  text: "#E8EEF1", sub: "#8D9FA9", primary: "#3DDBB8", onPrimary: "#00382E", primaryDim: "#10363A",
  danger: "#FF6B6B", warn: "#F2B84B", success: "#4ADE80", chip: "#1E2830"
};
const light = {
  dark: false, bg: "#F2F5F7", surface: "#FFFFFF", surface2: "#EBF0F3", border: "#DAE2E7",
  text: "#0E1A21", sub: "#566873", primary: "#0A8F78", onPrimary: "#FFFFFF", primaryDim: "#D6F1EA",
  danger: "#C62F2F", warn: "#A86A00", success: "#1B8F4A", chip: "#E2EBEF"
};
export const useTheme = () => (useColorScheme() === "light" ? light : dark);
export const MONO = Platform.select({ android: "monospace", ios: "Menlo", default: "monospace" });
export const R = { card: 16, field: 12, pill: 999 };
