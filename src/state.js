export const state = {
  user: null,

  online: navigator.onLine,

  map: null,
  mapReady: false,

  currentRoute: null,      // { id, name, started_at }
  routePoints: [],         // array de {lat,lng,ts}
  lastPos: null,

  nestsThisRoute: [],      // lista rápida na tela
  allTrails: [],
  allNests: [],

  watchId: null,
  polyline: null,

  selectedFile: null
};

export function resetSessionState() {
  state.currentRoute = null;
  state.routePoints = [];
  state.lastPos = null;
  state.nestsThisRoute = [];
  state.watchId = null;
  state.polyline = null;
  state.selectedFile = null;
}
