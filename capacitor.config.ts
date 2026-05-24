import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eduvantage.app',
  appName: 'EduVantage',
  webDir: '.vercel/output/static', // Next-on-pages static output directory
  bundledWebRuntime: false,
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  },
  server: {
    // For local development, you can point this to your localhost server:
    // url: "http://192.168.x.x:3000", 
    // cleartext: true
  }
};

export default config;
