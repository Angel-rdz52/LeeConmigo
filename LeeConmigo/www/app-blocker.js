// app-blocker.js
// Puente entre la web app (WebView) y el plugin nativo de Android "AppBlocker".
// Si se ejecuta fuera de Android (navegador normal), usa un fallback en memoria
// para que puedas seguir probando la interfaz sin dispositivo.

const NATIVE_DISPONIBLE = () => !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AppBlocker);

const AppBlockerFallback = (() => {
  let apps = JSON.parse(localStorage.getItem('lc_fallback_blocklist') || '[]');
  let unlocks = JSON.parse(localStorage.getItem('lc_fallback_unlocks') || '{}');
  return {
    async listInstalledApps() {
      return { apps: [
        { packageName: 'com.mojang.minecraftpe', label: 'Minecraft' },
        { packageName: 'com.roblox.client', label: 'Roblox' },
        { packageName: 'com.google.android.youtube', label: 'YouTube' },
        { packageName: 'com.supercell.clashofclans', label: 'Clash of Clans' },
      ] };
    },
    async getBlockedApps() { return { apps }; },
    async setBlockedApps({ apps: nuevas }) {
      apps = nuevas;
      localStorage.setItem('lc_fallback_blocklist', JSON.stringify(apps));
      return { ok: true };
    },
    async unlockApp({ packageName, minutes }) {
      unlocks[packageName] = Date.now() + minutes * 60000;
      localStorage.setItem('lc_fallback_unlocks', JSON.stringify(unlocks));
      return { ok: true };
    },
    async hasUsageAccessPermission() { return { granted: true }; },
    async hasOverlayPermission() { return { granted: true }; },
    async requestUsageAccessPermission() { return { granted: true }; },
    async requestOverlayPermission() { return { granted: true }; },
    async startMonitorService() { return { ok: true }; },
  };
})();

const AppBlocker = {
  async listInstalledApps() {
    if (NATIVE_DISPONIBLE()) return window.Capacitor.Plugins.AppBlocker.listInstalledApps();
    return AppBlockerFallback.listInstalledApps();
  },
  async getBlockedApps() {
    if (NATIVE_DISPONIBLE()) return window.Capacitor.Plugins.AppBlocker.getBlockedApps();
    return AppBlockerFallback.getBlockedApps();
  },
  async setBlockedApps(apps) {
    if (NATIVE_DISPONIBLE()) return window.Capacitor.Plugins.AppBlocker.setBlockedApps({ apps });
    return AppBlockerFallback.setBlockedApps({ apps });
  },
  async unlockApp(packageName, minutes) {
    if (NATIVE_DISPONIBLE()) return window.Capacitor.Plugins.AppBlocker.unlockApp({ packageName, minutes });
    return AppBlockerFallback.unlockApp({ packageName, minutes });
  },
  async hasPermissions() {
    if (NATIVE_DISPONIBLE()) {
      const usage = await window.Capacitor.Plugins.AppBlocker.hasUsageAccessPermission();
      const overlay = await window.Capacitor.Plugins.AppBlocker.hasOverlayPermission();
      return usage.granted && overlay.granted;
    }
    return true;
  },
  async requestPermissions() {
    if (NATIVE_DISPONIBLE()) {
      await window.Capacitor.Plugins.AppBlocker.requestUsageAccessPermission();
      await window.Capacitor.Plugins.AppBlocker.requestOverlayPermission();
    }
  },
  async startMonitor() {
    if (NATIVE_DISPONIBLE()) return window.Capacitor.Plugins.AppBlocker.startMonitorService();
  },
};

window.AppBlocker = AppBlocker;
