export const state = {
  user: null,

  // rota atual (gravação)
  route: null,          // { id, name, status, started_at }
  routePath: [],        // [{lat,lng,ts}]
  routeDistanceM: 0,

  // ninhos desta rota (para lista rápida na tela)
  currentNests: [],

  // watchers
  geoWatchId: null,

  // cache UI
  lastPos: null,
};

export function resetSessionState() {
  state.route = null;
  state.routePath = [];
  state.routeDistanceM = 0;
  state.currentNests = [];
  state.lastPos = null;

  if (state.geoWatchId != null) {
    try { navigator.geolocation.clearWatch(state.geoWatchId); } catch {}
    state.geoWatchId = null;
  }
}
