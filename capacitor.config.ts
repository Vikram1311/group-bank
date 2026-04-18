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
    // Load live web app from Vercel so the APK never needs rebuilding after UI changes
    url: 'https://group-bank-3gguqmo10-vikram1311s-projects.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
};

export default config;
