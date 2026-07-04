import type { CapacitorConfig } from '@capacitor/cli';

const devServerUrl = process.env.CAP_DEV_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.smartbarbeiro.client',
  appName: 'Smart Barbeiro',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    ...(devServerUrl ? { url: devServerUrl } : {}),
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },
};

export default config;
