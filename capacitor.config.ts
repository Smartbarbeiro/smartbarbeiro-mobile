import type { CapacitorConfig } from '@capacitor/cli';

const devServerUrl = process.env.CAP_DEV_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.smartbarbeiro.client',
  appName: 'Smart Barbeiro',
  webDir: 'dist',
  server: devServerUrl
    ? {
        url: devServerUrl,
        cleartext: true,
      }
    : undefined,
};

export default config;
