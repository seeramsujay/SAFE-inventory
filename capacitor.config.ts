import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safinventory.admin',
  appName: 'Industrial Nexus Companion',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
