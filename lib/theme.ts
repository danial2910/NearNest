// Raw values for props that cannot take a className (icon colors, shadows,
// RefreshControl). Keep in sync with tailwind.config.js.
export const colors = {
  primary: "#0E4D92",
  text: "#111827",
  textMuted: "#374151",
  icon: "#6B7280",
  iconSubtle: "#9CA3AF",
  emptyIcon: "#A3A3A3",
  danger: "#EF4444",
  warning: "#D97706",
  white: "#FFFFFF",
} as const;

export const shadows = {
  subtle: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  control: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButton: {
    shadowColor: "#0E4D92",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
