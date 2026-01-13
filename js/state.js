// js/state.js
export const state = {
  user: null,
  online: true,

  // trilha ativa
  currentRoute: null,
  routePoints: [],
  nestsThisRoute: [],
  lastPos: null,
  watchId: null,
  _dist: 0,

  // seleção local
  selectedFile: null,

  // listas gerais
  allTrails: [],
  allNests: [],
};

// Função para limpar o estado ao deslogar
export function resetSessionState() {
  state.currentRoute = null;
  state.routePoints = [];
  state.nestsThisRoute = [];
  state.lastPos = null;
  state._dist = 0;
  state.watchId = null;
  state.selectedFile = null;

  state.allTrails = [];
  state.allNests = [];
}