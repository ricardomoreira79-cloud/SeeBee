export const state = {
  session: null,

  // mapa/trajeto
  map: null,
  polyline: null,
  lastLatLng: null,
  watchId: null,

  // trajeto ativo
  routeId: null,
  routePoints: [],
  distanceM: 0,

  // wake lock (quando suportado)
  wakeLock: null
};

export function resetRouteState() {
  state.routeId = null;
  state.routePoints = [];
  state.distanceM = 0;
  state.lastLatLng = null;
}
