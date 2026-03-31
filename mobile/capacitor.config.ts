import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ai.geothority.app",
  appName: "Geothority",
  webDir: "../out",
  server: {
    // In development, point to the Next.js dev server
    // url: "http://localhost:3010",
    // In production, use the hosted URL
    url: "https://geothority.ai",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0F1117",
    scheme: "Geothority",
    preferredContentMode: "mobile",
  },
  android: {
    backgroundColor: "#0F1117",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0F1117",
      showSpinner: false,
      androidSplashResourceName: "splash",
      iosSplashResourceName: "Default",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F1117",
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
    },
  },
};

export default config;
