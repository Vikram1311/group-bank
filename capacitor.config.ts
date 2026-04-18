import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.groupbank.shg',
  appName: 'SHG Bank',
  webDir: 'dist',
  android: {
    // Signing options are only applied when the required env variables are present.
    // Set KEYSTORE_PASSWORD and KEY_PASSWORD before building a release APK locally.
    ...(process.env.KEYSTORE_PASSWORD && process.env.KEY_PASSWORD
      ? {
          buildOptions: {
            keystorePath: 'release.keystore',
            keystorePassword: process.env.KEYSTORE_PASSWORD,
            keystoreAlias: 'release',
            keystoreAliasPassword: process.env.KEY_PASSWORD,
            releaseType: 'APK',
          },
        }
      : {}),
  },
  server: {
    // Use local bundled assets (no live-reload) for production APK
    androidScheme: 'https',
  },
};

export default config;
