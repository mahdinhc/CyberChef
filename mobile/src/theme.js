import { useColorScheme } from "react-native";

const dark = {
  dark: true, bg: "#0E1214", surface: "#171C1F", surface2: "#1F2629", border: "#2A3236",
  text: "#E6ECEE", sub: "#93A1A7", primary: "#4FD1B5", onPrimary: "#00382D",
  danger: "#FF6B6B", warn: "#F2B84B", chip: "#233035"
};
const light = {
  dark: false, bg: "#F4F7F8", surface: "#FFFFFF", surface2: "#EAF0F2", border: "#D5DEE1",
  text: "#12191C", sub: "#5A6970", primary: "#0F8F78", onPrimary: "#FFFFFF",
  danger: "#C62F2F", warn: "#A86A00", chip: "#E1ECEF"
};
export const useTheme = () => (useColorScheme() === "light" ? light : dark);
export const MONO = "monospace";
