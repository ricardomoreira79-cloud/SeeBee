let map1, map2;
let userMarker1, routeLine1;
let routeLine2;

let hasCentered1 = false;
let hasCentered2 = false;

function buildMap(elId) {
  const map = L.map(elId, { zoomControl: true }).setView([-15.614, -56.175], 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  return map;
}

export function initMaps() {
  map1 = buildMap("map");
  map2 = buildMap("map2");

  userMarker1 = L.marker([-15.614, -56.175]).addTo(map1).bindPopup("Você");
  routeLine1 = L.polyline([], { weight: 4 }).addTo(map1);

  routeLine2 = L.polyline([], { weight: 4 }).addTo(map2);
}

export function setUserPosition(lat, lng) {
  userMarker1.setLatLng([lat, lng]);

  // primeira centralização automática com zoom de caminhada
  if (!hasCentered1) {
    map1.setView([lat, lng], 17);
    hasCentered1 = true;
  }
}

export function resetRouteLineHome() {
  routeLine1.setLatLngs([]);
}

export function addRoutePointHome(lat, lng) {
  const latlngs = routeLine1.getLatLngs();
  latlngs.push([lat, lng]);
  routeLine1.setLatLngs(latlngs);
}

export function addNestMarkerHome(lat, lng, status = "CATALOGADO") {
  const icon = L.divIcon({
    className: "nestPin",
    html: `<div style="
      width:14px;height:14px;border-radius:999px;
      background:${status === "CAPTURADO" ? "#ffd166" : "#36d77f"};
      border:2px solid rgba(0,0,0,.35);
      box-shadow: 0 10px 24px rgba(0,0,0,.35);
    "></div>`
  });

  L.marker([lat, lng], { icon }).addTo(map1);
}

/** MAPA 2 (instalações) */
export function renderRouteOnMap2({ routePoints = [], nests = [] }) {
  routeLine2.setLatLngs(routePoints.map(p => [p.lat, p.lng]));

  // centraliza na primeira coordenada do trajeto (ou do primeiro ninho)
  const focus = routePoints[0] || (nests[0] ? { lat: nests[0].lat, lng: nests[0].lng } : null);
  if (focus && !hasCentered2) {
    map2.setView([focus.lat, focus.lng], 15);
    hasCentered2 = true;
  }

  // pinagens
  for (const n of nests) {
    const icon = L.divIcon({
      className: "nestPin",
      html: `<div style="
        width:14px;height:14px;border-radius:999px;
        background:${n.status === "CAPTURADO" ? "#ffd166" : "#36d77f"};
        border:2px solid rgba(0,0,0,.35);
        box-shadow: 0 10px 24px rgba(0,0,0,.35);
      "></div>`
    });
    L.marker([n.lat, n.lng], { icon }).addTo(map2);
  }
}
