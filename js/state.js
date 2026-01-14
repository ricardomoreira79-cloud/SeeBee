// js/state.js
export const state = {
  user: null,
  online: true,
  map: null,
  mapReady: false,
  polyline: null,
  watchId: null,
  lastPos: null,
  _dist: 0,
  currentRoute: null,
  allTrails: [],
  allNests: []
};

export function resetSessionState() {
  state.currentRoute = null;
  state.lastPos = null;
  state._dist = 0;
  if (state.watchId) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;
  state.allTrails = [];
  state.allNests = [];
}