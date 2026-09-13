/**
 * Every user-facing string in the console lives here, so copy changes never
 * mean hunting through components. Keep values plain text — no markup.
 */
export const STRINGS = {
  app: {
    tagline: "See the world in motion",
    searchPlaceholder: "Search callsign, vessel, satellite, mission...",
    loadingConsole: "Loading OmniSky console…",
    loadingGlobe: "Initializing globe engine…",
  },
  feedStatus: {
    connecting: "Connecting",
    live: "Live",
    stale: "Stale",
    error: "Feed error",
  },
  panels: {
    alerts: "Active Alerts",
    alertsEmpty: "No alerts right now. The watch job checks every 15 minutes.",
    alertsHint: "Situations worth a look: lost AIS signals, loitering aircraft, launch windows.",
    insights: "AI Insights",
    insightsEmpty: "No insights yet — the next sweep runs within 15 minutes.",
    clickToLocate: "Click to centre the globe on this location",
  },
  footer: {
    liveLabel: "Live public data",
    demoLabel: "Demo data",
    disclaimer: "Coverage is partial and positions are not authoritative.",
  },
  account: {
    signIn: "Sign in",
    signOut: "Sign out",
    signUp: "Create account",
    continueWithGoogle: "Continue with Google",
    emailLabel: "Email",
    passwordLabel: "Password",
    displayNameLabel: "Display name",
    checkEmail: "Check your inbox to confirm your address, then sign in.",
    accountTitle: "Your account",
    digestTitle: "Daily intelligence digest",
    digestBlurb:
      "One email each morning summarising the most important activity from the last 24 hours.",
    digestOn: "Email me the daily digest",
    saved: "Saved",
  },
} as const;
