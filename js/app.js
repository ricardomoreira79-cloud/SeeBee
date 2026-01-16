// js/app.js - VERSÃO DEFINITIVA (CHAVES INCLUSAS)

// 1. CHAVES REAIS (JA INCLUSAS)
const SB_URL = 'https://sgrtyotwnlwpwfecnoze.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncnR5b3R3bmx3cHdmZWNub3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjgxMjcsImV4cCI6MjA4MzM0NDEyN30.QZvTN3mHUwqBwvXeL6q89qNW_4s1Cvopa40nt4TFa9w';

// Inicializa cliente (Usa nome diferente para não conflitar com a lib global)
const sbClient = window.supabase.createClient(SB_URL, SB_KEY);

const state = {
    user: null,
    map: null,
    polyline: null,
    routePoints: [],
    dist: 0,
    nestCount: 0,
    watchId: null,
    currentRouteId: null,
    lastPos: null
};

window.app = {
    
    init: async () => {
        // Listener de Auth
        sbClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                state.user = session.user;
                app.showApp();
            } else if (event === 'SIGNED_OUT') {
                app.showLogin();
            }
        });

        // Check sessão
        const { data } = await sbClient.auth.getSession();
        if (data.session) {
            state.user = data.session.user;
            app.showApp();
        }
    },

    login: async () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const { error } = await sbClient.auth.signInWithPassword({ email, password: pass });
        if(error) alert(error.message);
    },

    signup: async () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const { error } = await sbClient.auth.signUp({ email, password: pass });
        if(error) alert(error.message);
        else alert("Conta criada! Verifique seu email.");
    },

    loginGoogle: async () => {
        await sbClient.auth.signInWithOAuth({ 
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
    },

    logout: async () => {
        await sbClient.auth.signOut();
        window.location.reload();
    },

    showApp: () => {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        app.initMap();
        app.loadProfile();
    },

    showLogin: () => {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
    },

    // --- MAPA ---
    initMap: () => {
        if(state.map) return;
        state.map = L.map('map').setView([-15.6, -56.1], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(state.map);
        // RISCO VERMELHO
        state.polyline = L.polyline([], { color: '#ef4444', weight: 5 }).addTo(state.map);
    },

    nav: (page) => {
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-' + page).classList.remove('hidden');
        document.getElementById('drawer').classList.remove('open');
        if(page === 'map' && state.map) setTimeout(() => state.map.invalidateSize(), 200);
    },

    // --- GPS ---
    startTracking: async () => {
        const name = prompt("Nome da Trilha:", "Instalação " + new Date().toLocaleDateString());
        if(!name) return;

        // Limpa
        state.routePoints = []; state.dist = 0; state.nestCount = 0;
        state.polyline.setLatLngs([]);
        state.map.eachLayer(l => { if(l instanceof L.Marker) state.map.removeLayer(l); });
        
        document.getElementById('distText').innerText = "0 m";
        document.getElementById('nestCountText').innerText = "0";

        // Cria Rota
        const { data, error } = await sbClient.from('routes').insert({
            user_id: state.user.id, name, status: 'active'
        }).select().single();

        if(error) return alert("Erro BD: " + error.message);
        state.currentRouteId = data.id;

        // UI
        document.getElementById('btnStart').classList.add('hidden');
        document.getElementById('btnStop').classList.remove('hidden');
        document.getElementById('btnNest').disabled = false;
        document.getElementById('statusBadge').innerText = "GRAVANDO";
        document.getElementById('statusBadge').style.background = "#10b981";

        app.gpsOn();
    },

    gpsOn: () => {
        if(!navigator.geolocation) return alert("Sem GPS");
        
        state.watchId = navigator.geolocation.watchPosition(pos => {
            const lat = pos.coords.latitude; 
            const lng = pos.coords.longitude;
            const p = { lat, lng };

            document.getElementById('gpsStatus').innerText = "OK";

            if(state.routePoints.length === 0) {
                state.map.setView([lat, lng], 18);
                app.addMarker(lat, lng, '#10b981', 'Início');
            } else {
                const last = state.routePoints[state.routePoints.length-1];
                const d = app.calcDist(last.lat, last.lng, lat, lng);
                state.dist += d;
                document.getElementById('distText').innerText = Math.round(state.dist) + " m";
            }

            state.lastPos = p;
            state.routePoints.push(p);
            
            // DESENHA O RISCO
            state.polyline.addLatLng([lat, lng]);
            state.map.panTo([lat, lng]);

            // Salva ponto
            if(navigator.onLine) {
                sbClient.from('route_points').insert({ route_id: state.currentRouteId, lat, lng, created_at: new Date() }).then();
            }

        }, err => alert("Erro GPS"), { enableHighAccuracy: true });
    },

    stopTracking: async () => {
        if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
        if(state.lastPos) app.addMarker(state.lastPos.lat, state.lastPos.lng, '#ef4444', 'Fim');
        
        await sbClient.from('routes').update({ status: 'finished', ended_at: new Date() }).eq('id', state.currentRouteId);
        
        document.getElementById('btnStart').classList.remove('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('btnNest').disabled = true;
        document.getElementById('statusBadge').innerText = "PARADO";
        document.getElementById('statusBadge').style.background = "#333";
        alert("Salvo!");
    },

    openNestModal: () => {
        if(!state.lastPos) return alert("Aguarde GPS");
        document.getElementById('nestModal').style.display = 'flex';
    },

    confirmNest: async () => {
        const btn = document.getElementById('btnConfirmNest');
        btn.innerText = "...";
        try {
            const note = document.getElementById('nestNote').value;
            const file = document.getElementById('nestPhoto').files[0];
            let url = null;

            if(file) {
                const name = `${state.user.id}/${Date.now()}.jpg`;
                const { data } = await sbClient.storage.from('ninhos-fotos').upload(name, file);
                if(data) {
                    const { data: pub } = sbClient.storage.from('ninhos-fotos').getPublicUrl(name);
                    url = pub.publicUrl;
                }
            }

            const { error } = await sbClient.from('nests').insert({
                user_id: state.user.id,
                route_id: state.currentRouteId,
                lat: state.lastPos.lat,
                lng: state.lastPos.lng,
                note, photo_url: url, status: 'CATALOGADO'
            });

            if(error) throw error;

            app.addMarker(state.lastPos.lat, state.lastPos.lng, '#fbbf24', 'Ninho');
            state.nestCount++;
            document.getElementById('nestCountText').innerText = state.nestCount;
            document.getElementById('nestModal').style.display = 'none';

        } catch (e) {
            alert("Erro: " + e.message);
        } finally {
            btn.innerText = "Salvar";
        }
    },

    // --- PERFIL ---
    loadProfile: async () => {
        let { data } = await sbClient.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
        if(!data) {
            // Cria se não existir (auto-recovery)
            await sbClient.from('profiles').insert({ id: state.user.id, full_name: 'Usuário' });
            data = { full_name: 'Usuário', phone: '' };
        }
        document.getElementById('profName').value = data.full_name || '';
        document.getElementById('profPhone').value = data.phone || '';
    },

    saveProfile: async () => {
        const name = document.getElementById('profName').value;
        const phone = document.getElementById('profPhone').value;
        await sbClient.from('profiles').update({ full_name: name, phone }).eq('id', state.user.id);
        alert("Salvo!");
    },

    // --- UTEIS ---
    addMarker: (lat, lng, color, msg) => {
        const icon = L.divIcon({ className: 'custom-pin', html: `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid white;"></div>` });
        L.marker([lat, lng], {icon}).addTo(state.map).bindPopup(msg);
    },

    calcDist: (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; const q1 = lat1 * Math.PI/180; const q2 = lat2 * Math.PI/180;
        const dq = (lat2-lat1) * Math.PI/180; const dl = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(dq/2) * Math.sin(dq/2) + Math.cos(q1) * Math.cos(q2) * Math.sin(dl/2) * Math.sin(dl/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    app.init();
    
    // Listeners
    document.getElementById('btnLogin').onclick = app.login;
    document.getElementById('btnSignup').onclick = app.signup;
    document.getElementById('btnGoogle').onclick = app.loginGoogle;
    
    document.getElementById('nestPhoto').onchange = (e) => {
        if(e.target.files[0]) e.target.parentElement.style.borderColor = '#10b981';
    };
});