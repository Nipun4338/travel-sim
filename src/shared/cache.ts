// The Cache Storage name for baked Regions and Flight Zones, shared by the service worker config
// (vite.config.ts) and the offline downloads (src/core/offline.ts), so a download is what the
// worker serves when there's no network.
export const REGION_CACHE = 'travel-sim-regions';
