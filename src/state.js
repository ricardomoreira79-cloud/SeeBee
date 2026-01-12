export const state = {
  user: null,

  route: {
    active: false,
    id: null,
    points: [],
    distanceMeters: 0
  },

  nests: {
    list: [],
    count: 0
  }
};

export function resetSessionState() {
  state.route.active = false;
  state.route.id = null;
  state.route.points = [];
  state.route.distanceMeters = 0;

  state.nests.list = [];
  state.nests.count = 0;
}
