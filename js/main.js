// js/main.js - ARQUIVO COMPLETO v19
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal, setOnlineUI } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMapLayers } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, discardRoute, loadMyTrails } from "./routes.js";

const supabase = getSupabase();
let detailMap = null;
let allSpeciesData = [];
const GENERIC_BEE = "https://cdn-icons-png.flaticon.com/512/3069/3069186.png";

// --- AUXILIARES ---
function initDetailMap() { if (detailMap) return; detailMap = L.map("mapDetail").setView([0,0], 15); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(detailMap); }
function calcDist(p1, p2) { const R = 6371e3; const φ1 = p1.lat * Math.PI/180, φ2 = p2.lat * Math.PI/180; const a = Math.sin(((p2.lat-p1.lat)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2) * Math.sin(((p2.lng-p1.lng)*Math.PI/180)/2)**2; return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); }
function refreshMap() { setTimeout(() => { if(state.map) { state.map.invalidateSize(); if(state.lastPos) setMapCenter(state.lastPos.lat, state.lastPos.lng, 18); else state.map.locate({ setView: true, maxZoom: 18 }); } }, 100); }

async function uploadFile(file, bucket) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${state.user.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) { console.error("Erro upload:", error); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
}

// UX: Feedback visual ao selecionar foto
function setupPhotoInputFeedback(labelId, inputId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if(!input || !label) return;
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            label.style.borderColor = "var(--primary)";
            label.style.color = "var(--primary)";
            label.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
            if(!label.getAttribute("data-original")) label.setAttribute("data-original", label.innerHTML);
            label.innerHTML = `✅ ${file.name.substring(0, 15)}...`; 
            label.appendChild(input); 
        }
    };
}

// --- LISTENERS ---
function setupListeners() {
  ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
  ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");
  if(ui.nestCancel) ui.nestCancel.onclick = closeNestModal;
  
  const navigate = (target) => { 
      switchTab(target); ui.sideMenu.classList.remove("open"); 
      if(target==="view-traps"){refreshMap();loadRecentTrails();} 
      if(target==="view-meliponaries")loadColoniesData(); 
      if(target==="view-captures")loadCaptures();
      if(target==="view-profile")loadProfile(); 
  };
  document.querySelectorAll("[data-target]").forEach(el => el.onclick = () => navigate(el.dataset.target));
  ui.btnLogout.onclick = async () => { if(confirm("Sair?")) await supabase.auth.signOut(); };
  window.addEventListener('online', () => setOnlineUI(true)); window.addEventListener('offline', () => setOnlineUI(false));

  document.querySelectorAll(".segment-btn").forEach(btn => { btn.onclick = () => { document.querySelectorAll(".segment-btn").forEach(b => b.classList.remove("active")); document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden")); btn.classList.add("active"); document.getElementById(btn.dataset.sub).classList.remove("hidden"); }; });
  const btnSeeAll = document.getElementById("btnSeeAllTrails"); if(btnSeeAll) btnSeeAll.onclick = () => { navigate("view-meliponaries"); document.querySelector('[data-sub="tab-history"]').click(); };

  // Modal Matriz
  document.getElementById("btnAddColony").onclick = () => { loadSpeciesData(); document.getElementById("colonyName").value = ""; document.getElementById("colonyDate").value = ""; document.getElementById("colonyPopularName").value = ""; document.getElementById("speciesPreview").src = GENERIC_BEE; document.getElementById("colony-modal").style.display="flex"; };
  document.getElementById("colonyCancel").onclick = () => document.getElementById("colony-modal").style.display="none";
  document.getElementById("colonyStatus").onchange = (e) => { const g=document.getElementById("removalDateGroup"); if(e.target.value!=="ATIVA")g.classList.remove("hidden"); else{g.classList.add("hidden");document.getElementById("colonyRemovalDate").value="";}};
  document.getElementById("colonyPopularName").onchange = (e) => updateSpeciesPreview(e.target.value, "colonyScientificName", "speciesPreview");
  document.getElementById("colonySave").onclick = saveColony;
  document.getElementById("historyDateFilter").onchange = loadColoniesData;
  document.getElementById("closeDetailTrail").onclick = () => document.getElementById("trail-detail-modal").style.display="none";
  
  // Modal Edição
  document.getElementById("btnCancelEditNest").onclick = () => document.getElementById("nest-edit-modal").style.display="none";
  document.getElementById("editNestStatus").onchange = (e) => { const isCaptured = e.target.value === "CAPTURADO"; document.getElementById("editCaptureContainer").classList.toggle("hidden", !isCaptured); if(isCaptured) loadSpeciesData(); };
  const popCapture = document.getElementById("editCapturePopular"); if(popCapture) popCapture.onchange = (e) => updateSpeciesPreview(e.target.value, "editCaptureScientific", "captureSpeciesPreview");
  document.getElementById("btnSaveEditNest").onclick = saveNestEdit;
  
  // Ninho Isca
  ui.btnMarkNest.onclick = () => { 
      if(!state.lastPos) return alert("Aguarde GPS"); 
      document.getElementById("nestNote").value = ""; 
      const pInput = document.getElementById("nestPhoto"); pInput.value = ""; 
      const label = document.getElementById("btnNestPhotoLabel");
      if(label) { label.style = ""; label.innerHTML = "📷 Foto"; label.appendChild(pInput); }
      document.getElementById("nest-modal").style.display="flex"; 
  };
  
  setupPhotoInputFeedback("btnNestPhotoLabel", "nestPhoto");
  setupPhotoInputFeedback("btnEditPhotoLabel", "editNestPhoto");

  document.getElementById("btnSaveProfile").onclick = saveProfile;
  const avatarInput = document.getElementById("profileAvatarInput");
  if(avatarInput) avatarInput.onchange = (e) => { const file = e.target.files[0]; if(file) document.getElementById("profileImageDisplay").src = URL.createObjectURL(file); };
}

function updateSpeciesPreview(popularName, scientificSelectId, imgId) {
    const sciSelect = document.getElementById(scientificSelectId); const img = document.getElementById(imgId);
    sciSelect.innerHTML = '<option value="Sem identificação">Sem identificação</option>';
    if(popularName) {
        sciSelect.disabled = false;
        const matches = allSpeciesData.filter(s => s.popular_name === popularName);
        matches.forEach(m => { sciSelect.innerHTML += `<option value="${m.scientific_name}">${m.scientific_name}</option>`; });
        const withImg = matches.find(m => m.image_url);
        img.src = withImg ? withImg.image_url : GENERIC_BEE;
    } else { sciSelect.disabled = true; img.src = GENERIC_BEE; }
}

// --- PERFIL ---
async function loadProfile() {
    document.getElementById("profileEmailDisplay").textContent = state.user.email;
    const { data: userProfile, error } = await supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
    if (!userProfile) { await supabase.from('profiles').insert({ id: state.user.id, full_name: 'Usuário', user_type: 'ADM' }); return loadProfile(); }
    document.getElementById("profileFullName").value = userProfile.full_name || "";
    document.getElementById("profileCPF").value = userProfile.cpf || "";
    document.getElementById("profilePhone").value = userProfile.phone || "";
    document.getElementById("profileType").value = userProfile.user_type || "ADM";
    if(userProfile.avatar_url) document.getElementById("profileImageDisplay").src = userProfile.avatar_url;
    updateMenuUI(userProfile);
}

async function saveProfile() {
    const avatarFile = document.getElementById("profileAvatarInput").files[0];
    let avatarUrl = null;
    try { if(avatarFile) avatarUrl = await uploadFile(avatarFile, 'avatars'); } catch(e) { alert("Erro foto: " + e.message); return; }
    const updates = { full_name: document.getElementById("profileFullName").value, cpf: document.getElementById("profileCPF").value, phone: document.getElementById("profilePhone").value, user_type: document.getElementById("profileType").value };
    if(avatarUrl) updates.avatar_url = avatarUrl;
    const { error } = await supabase.from('profiles').update(updates).eq('id', state.user.id);
    if(error) alert("Erro ao salvar: " + error.message); else { toast(ui.routeHint, "Perfil atualizado!"); loadProfile(); }
}

function updateMenuUI(profile) {
    const name = profile.full_name || "Usuário";
    document.getElementById("menu-name-display").textContent = name.split(" ")[0]; 
    document.getElementById("menu-user-role").textContent = profile.user_type === 'ADM' ? 'ADMINISTRADOR' : profile.user_type;
    const imgElement = document.getElementById("menu-avatar-img"); const charElement = document.getElementById("menu-avatar-char");
    if(profile.avatar_url && imgElement) { charElement.classList.add("hidden"); imgElement.src = profile.avatar_url; imgElement.classList.remove("hidden"); } 
    else if (charElement) { if(imgElement) imgElement.classList.add("hidden"); charElement.textContent = name.charAt(0).toUpperCase(); charElement.classList.remove("hidden"); }
}

// --- NEGÓCIO (ZERO LIMITES) ---
async function createNestFull(note, lat, lng, routeId, photoFile) {
    let publicUrl = null;
    if (photoFile) publicUrl = await uploadFile(photoFile, 'ninhos-fotos');
    const { error } = await supabase.from("nests").insert({ user_id: state.user.id, route_id: routeId, lat, lng, note, status: "CATALOGADO", photo_url: publicUrl });
    if (error) throw new Error(error.message);
}

async function loadSpeciesData() { if (allSpeciesData.length > 0) return; const { data } = await supabase.from("species").select("*").order("popular_name"); if(data) { allSpeciesData = data; const uniques = [...new Set(data.map(i => i.popular_name))]; const options = '<option value="">Selecione...</option>' + uniques.map(u => `<option value="${u}">${u}</option>`).join(""); document.getElementById("colonyPopularName").innerHTML = options; const editSel = document.getElementById("editCapturePopular"); if(editSel) editSel.innerHTML = '<option value="">Não identificada</option>' + uniques.map(u => `<option value="${u}">${u}</option>`).join(""); } }
async function saveColony() { const name=document.getElementById("colonyName").value, popular=document.getElementById("colonyPopularName").value, scientific=document.getElementById("colonyScientificName").value, date=document.getElementById("colonyDate").value, status=document.getElementById("colonyStatus").value, removal=document.getElementById("colonyRemovalDate").value; if(!name||!date) return alert("Preencha nome e data."); if(status!=="ATIVA"&&!removal) return alert("Preencha remoção."); const { error } = await supabase.from("colonies").insert({ user_id:state.user.id, name, species_name: popular?`${popular} (${scientific})`:"Não identificada", installation_date:date, status, removal_date:removal||null }); if(error) alert("Erro: "+error.message); else { document.getElementById("colony-modal").style.display="none"; loadColoniesData(); } }

// --- GRAVAÇÃO ---
ui.btnStartRoute.onclick=async()=>{
    const name=prompt("Nome da Instalação:",`Instalação ${new Date().toLocaleDateString()}`); if(!name)return;
    const modal = document.getElementById("countdown-modal"); const num = document.getElementById("countdown-number");
    if(modal) { modal.style.display = "flex"; let count = 3; num.textContent = count; const timer = setInterval(async () => { count--; if(count > 0) num.textContent = count; else { clearInterval(timer); modal.style.display = "none"; startRouteLogic(name); } }, 1000); } else startRouteLogic(name);
};

async function startRouteLogic(name) {
    await createRoute(supabase,name);
    ui.btnStartRoute.classList.add("hidden");ui.btnFinishRoute.classList.remove("hidden");ui.btnMarkNest.disabled=false;
    ui.statusBadge.textContent="GRAVANDO";ui.statusBadge.classList.add("active");
    clearMapLayers(); state._dist=0;state.nestCount=0;state.routePoints = []; ui.distanceText.textContent="0 m";ui.nestsCountText.textContent="0";
    startGPS();
}

function startGPS(){
    if(!navigator.geolocation)return alert("Sem GPS");
    state.watchId=navigator.geolocation.watchPosition(async(pos)=>{
        const p={lat:pos.coords.latitude,lng:pos.coords.longitude,t:new Date().toISOString()};
        const isFirstPoint = state.routePoints.length === 0;
        if (!isFirstPoint) {
            const last = state.routePoints[state.routePoints.length-1];
            const dist = calcDist(last, p);
            if (dist > 500) return; 
            state._dist += dist; ui.distanceText.textContent = Math.round(state._dist) + " m";
        }
        state.lastPos = p; ui.gpsStatus.textContent = "GPS: OK";
        state.routePoints.push(p); 
        addRoutePoint(p.lat, p.lng); 
        if(isFirstPoint) { setMapCenter(p.lat, p.lng); addMarker(p.lat, p.lng, "#10b981", "Início"); }
        if(navigator.onLine) await appendRoutePoint(supabase, p);
    },(e)=>ui.gpsStatus.textContent="Erro GPS",{enableHighAccuracy:true});
}

// CANCELAR = CONTINUAR
ui.btnFinishRoute.onclick=async()=>{
    if(state.watchId)navigator.geolocation.clearWatch(state.watchId);
    if(state.nestCount===0){
        if(!confirm("Sem ninhos. Descartar e finalizar?")) { startGPS(); return; }
        await discardRoute(supabase); toast(ui.routeHint,"Descartado","error");
    }else{
        if(state.lastPos) addMarker(state.lastPos.lat,state.lastPos.lng,"#ef4444","Fim");
        if(navigator.onLine)await finishRoute(supabase);
        toast(ui.routeHint,"Salvo!","ok");
    }
    ui.btnStartRoute.classList.remove("hidden");ui.btnFinishRoute.classList.add("hidden");ui.btnMarkNest.disabled=true;
    ui.statusBadge.textContent="PARADO";ui.statusBadge.classList.remove("active");
    loadRecentTrails();
};

ui.btnMarkNest.onclick=()=>{ 
    if(!state.lastPos) return alert("Aguarde GPS"); 
    document.getElementById("nestNote").value = ""; 
    const pInput = document.getElementById("nestPhoto"); pInput.value = ""; 
    const label = document.getElementById("btnNestPhotoLabel");
    if(label) { label.style = ""; label.innerHTML = "📷 Foto"; label.appendChild(pInput); }
    document.getElementById("nest-modal").style.display="flex"; 
};

ui.btnConfirmNest.onclick=async()=>{
    ui.btnConfirmNest.textContent="...";
    try{
        const file=document.getElementById("nestPhoto").files[0];
        const note=document.getElementById("nestNote").value;
        await createNestFull(note,state.lastPos.lat,state.lastPos.lng,state.currentRoute.id,file);
        addMarker(state.lastPos.lat,state.lastPos.lng,"#fbbf24","Ninho");
        state.nestCount++;ui.nestsCountText.textContent=state.nestCount;closeNestModal();toast(ui.routeHint,"Ninho salvo");
    }catch(e){alert(e.message);}finally{ui.btnConfirmNest.textContent="Salvar";}
};

// Funções de listagem
function renderTrailCard(t){const ninhos=(t.nests&&t.nests.length)||0;const capturas=t.nests?t.nests.filter(n=>n.status==='CAPTURADO').length:0;return`<div class="route-card" onclick="window.openTrailDetail('${t.id}')"><div style="display:flex; justify-content:space-between;"><strong>${t.name}</strong><span style="color:#10b981; font-size:12px;">${ninhos} Ninhos | ${capturas} Cap.</span></div><div style="font-size:12px; color:#9ca3af; margin-top:5px;">${new Date(t.created_at).toLocaleString()}</div></div>`;}
async function loadRecentTrails(){const trails=await loadMyTrails(supabase);const list=document.getElementById("trailsListRecent");if(!list)return;if(!trails||trails.length===0){list.innerHTML="<div style='color:#9ca3af; text-align:center;'>Sem histórico.</div>";return;}list.innerHTML=trails.slice(0,3).map(renderTrailCard).join("");}
async function loadColoniesData(){const { data: cols } = await supabase.from("colonies").select("*").eq("user_id", state.user.id).order("installation_date", {ascending: false}); const list = document.getElementById("coloniesList"); if(list) list.innerHTML = (!cols||cols.length===0) ? "<div class='empty-state' style='padding:20px; text-align:center; color:#9ca3af'>Nenhuma matriz.</div>" : cols.map(c => `<div class="route-card"><div style="display:flex; justify-content:space-between;"><strong>${c.name}</strong><span class="badge-status ${c.status==='ATIVA'?'active':''}">${c.status}</span></div><div style="font-size:12px; color:#9ca3af;">${c.species_name}</div><div style="font-size:11px;">Instalado: ${new Date(c.installation_date).toLocaleDateString()}</div></div>`).join(""); const dateFilter = document.getElementById("historyDateFilter").value; let query = supabase.from("routes").select("*, nests(*)").eq("user_id", state.user.id).eq("status", "finished").order("created_at", { ascending: false }); if(dateFilter) query = query.gte("created_at", dateFilter+"T00:00:00").lte("created_at", dateFilter+"T23:59:59"); else query = query.limit(10); const { data: trails } = await query; const histList = document.getElementById("trailsListHistory"); if(histList) histList.innerHTML = (!trails||trails.length===0) ? "<div class='empty-state' style='padding:20px; text-align:center; color:#9ca3af'>Sem trilhas.</div>" : trails.map(renderTrailCard).join("");}
async function loadCaptures(){const { data: captures } = await supabase.from("nests").select("*, routes(name, created_at)").eq("user_id", state.user.id).eq("status", "CAPTURADO").order("capture_date", {ascending: false}); const count = captures ? captures.length : 0; const badge = document.getElementById("menuBadgeCaptures"); badge.textContent = count; badge.classList.toggle("hidden", count === 0); const list = document.getElementById("capturesList"); if(!list) return; if(!captures || captures.length === 0) { list.innerHTML = "<div class='empty-state' style='text-align:center; color:#9ca3af; padding:20px;'>Nenhuma captura ativa.</div>"; return; } list.innerHTML = captures.map(c => { const installDate = c.routes ? new Date(c.routes.created_at) : new Date(c.created_at); const captureDate = c.capture_date ? new Date(c.capture_date) : new Date(); const removalDate = new Date(captureDate.getTime() + (35 * 24 * 60 * 60 * 1000)); const img = c.photo_url || "https://placehold.co/100x100?text=S/F"; const species = c.species_name || "Não identificada"; return `<div class="capture-card"><img src="${img}" class="capture-img" onclick="window.open('${img}')"><div class="capture-info"><span class="capture-title" onclick="window.openTrailDetail('${c.route_id}')">📍 ${c.routes ? c.routes.name : 'Trilha desconhecida'}</span><span class="capture-meta">🐝 ${species}</span><span class="capture-meta">📅 Instalado: ${installDate.toLocaleDateString()}</span><span class="capture-meta" style="color:#fbbf24">⏳ Retirar: ${removalDate.toLocaleDateString()}</span></div><div class="capture-actions"><button class="btn-icon-sm" onclick="window.editNest('${c.id}')">✏️</button><button class="btn-icon-sm danger" onclick="window.deleteNest('${c.id}')">🗑️</button></div></div>`; }).join("");}
window.openTrailDetail=async(trailId)=>{document.getElementById("trail-detail-modal").style.display="flex"; document.getElementById("detailTrailTitle").textContent="Carregando..."; setTimeout(() => { initDetailMap(); detailMap.invalidateSize(); }, 200); const { data: route } = await supabase.from("routes").select("*").eq("id", trailId).single(); const { data: nests } = await supabase.from("nests").select("*").eq("route_id", trailId).order("created_at"); if(!route) return; document.getElementById("detailTrailTitle").textContent = route.name; const start = new Date(route.created_at); const end = route.ended_at ? new Date(route.ended_at) : null; document.getElementById("metaDate").textContent = start.toLocaleDateString(); document.getElementById("metaTime").textContent = start.toLocaleTimeString().slice(0,5); document.getElementById("metaNests").textContent = nests ? nests.length : 0; let totalDist=0; if(route.path&&route.path.length>1) for(let i=1;i<route.path.length;i++) totalDist+=calcDist(route.path[i-1], route.path[i]); document.getElementById("metaDist").textContent = Math.round(totalDist) + " m"; detailMap.eachLayer(l => { if(l instanceof L.Marker || l instanceof L.Polyline) detailMap.removeLayer(l); }); if(route.path&&route.path.length>0) { const poly=L.polyline(route.path.map(p=>[p.lat,p.lng]), {color:'#ef4444',weight:4}).addTo(detailMap); detailMap.fitBounds(poly.getBounds()); } const divList=document.getElementById("detailNestsList"); divList.innerHTML=""; if(nests) nests.forEach((n, i) => { L.marker([n.lat, n.lng]).addTo(detailMap).bindPopup(`Ninho ${i+1} (${n.status})`); const img = n.photo_url || "https://placehold.co/100x100?text=Sem+Foto"; divList.innerHTML += `<div class="nest-item-row" id="nest-row-${n.id}"><div class="nest-info-block"><a href="${img}" target="_blank"><img src="${img}" style="width:50px; height:50px; border-radius:8px; object-fit:cover; border:1px solid #374151;"></a><div><div style="font-weight:bold; color:white;">Ninho ${i+1}</div><div style="font-size:11px; color:#9ca3af;">${n.status}</div></div></div><div class="nest-actions"><button class="btn-icon-sm" onclick="window.editNest('${n.id}')">✏️</button><button class="btn-icon-sm danger" onclick="window.deleteNest('${n.id}')">🗑️</button></div></div>`; }); state.currentDetailNests = nests;};
window.editNest=(nestId)=>{ let nest = state.currentDetailNests ? state.currentDetailNests.find(n => n.id === nestId) : null; const openModal = (n) => { document.getElementById("editNestId").value = n.id; document.getElementById("editNestStatus").value = n.status; document.getElementById("editNestNote").value = n.note || ""; document.getElementById("editCaptureContainer").classList.toggle("hidden", n.status !== "CAPTURADO"); document.getElementById("captureSpeciesPreview").src = GENERIC_BEE; document.getElementById("nest-edit-modal").style.display = "flex"; loadSpeciesData(); }; if(nest) openModal(nest); else supabase.from("nests").select("*").eq("id", nestId).single().then(({data}) => openModal(data));};
window.saveNestEdit=()=>{ saveNestEdit(); }; window.deleteNest=()=>{ deleteNest(); };

bindAuth(supabase, async () => { setupListeners(); initMap(); setOnlineUI(navigator.onLine); if(state.user) { switchTab("view-home"); loadMyTrails(supabase); loadCaptures(); loadProfile(); } });