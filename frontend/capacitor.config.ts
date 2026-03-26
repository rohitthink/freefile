import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.freefile.itr',
  appName: 'FreeFile',
  webDir: 'out',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#111827',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark' as const,
    },
  },
};

export default config;
