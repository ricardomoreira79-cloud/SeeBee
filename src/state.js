export const State = {
  supabase: null,
  session: null,
  user: null,

  map: null,
  routeLine: null,

  // trajeto
  activeRouteId: null,
  watchId: null,
  lastPos: null,
  totalDistanceM: 0,

  // marcados na trilha atual
  marked: []
};
