// js/app.js - VERSÃO DEFINITIVA (CHAVE CORRIGIDA)

// 1. CONFIGURAÇÃO (CHAVE CORRIGIDA)
const SUPABASE_URL = 'https://sgrtyotwnlwpwfecnoze.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncnR5b3R3bmx3cHdmZWNub3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjgxMjcsImV4cCI6MjA4MzM0NDEyN30.QZvTN3mHUwqBwvXeL6q89qNW_4s1Cvopa40nt4TFa9w';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    // --- AUTH ---
    init: async () => {
        // Escuta login
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                state.user = session.user;
                app.showApp();
            } else if (event === 'SIGNED_OUT') {
                app.showLogin();
            }
        });

        // Check inicial
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            state.user = data.session.user;
            app.showApp();
        }
    },

    login: async () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if(error) alert(error.message);
    },

    signup: async () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const { error } = await supabase.auth.signUp({ email, password: pass });
        if(error) alert(error.message);
        else alert("Conta criada! Verifique email.");
    },

    loginGoogle: async () => {
        await supabase.auth.signInWithOAuth({ 
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
    },

    logout: async () => {
        await supabase.auth.signOut();
        window.location.reload();
    },

    // --- UI ---
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

    toggleMenu: () => {
        document.getElementById('drawer').classList.toggle('open');
    },

    nav: (page) => {
        // Esconde todas as sections
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        // Mostra a certa
        document.getElementById('view-' + page).classList.remove('hidden');
        // Fecha menu
        document.getElementById('drawer').classList.remove('open');
        
        // Se for mapa, força resize
        if(page === 'map' && state.map) {
            setTimeout(() => {
                state.map.invalidateSize();
                if(state.lastPos) state.map.setView([state.lastPos.lat, state.lastPos.lng], 18);
            }, 200);
        }
    },

    // --- MAPA ---
    initMap: () => {
        if(state.map) return;
        state.map = L.map('map', { zoomControl: false }).setView([-15.6, -56.1], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(state.map);
        state.polyline = L.polyline([], { color: '#ef4444', weight: 5 }).addTo(state.map);
    },

    // --- GPS ---
    startTracking: async () => {
        const name = prompt("Nome da trilha:", "Instalação " + new Date().toLocaleDateString());
        if(!name) return;

        // Limpa
        state.routePoints = [];
        state.dist = 0; state.nestCount = 0;
        state.polyline.setLatLngs([]);
        state.map.eachLayer(l => { if(l instanceof L.Marker) state.map.removeLayer(l); });
        
        document.getElementById('distVal').innerText = "0";
        document.getElementById('nestVal').innerText = "0";

        // Cria rota
        const { data, error } = await supabase.from('routes').insert({
            user_id: state.user.id, name, status: 'active'
        }).select().single();

        if(error) return alert("Erro BD: " + error.message);
        state.currentRouteId = data.id;

        // UI
        document.getElementById('btnStart').style.display = 'none';
        document.getElementById('btnStop').style.display = 'block';
        document.getElementById('btnNest').disabled = false;
        document.getElementById('statusBadge').innerText = "GRAVANDO";
        document.getElementById('statusBadge').style.background = "#10b981";

        // GPS
        if(!navigator.geolocation) return alert("Sem GPS");
        
        state.watchId = navigator.geolocation.watchPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const p = { lat, lng };

            document.getElementById('gpsVal').innerText = "OK";

            if(state.routePoints.length === 0) {
                // Início
                state.map.setView([lat, lng], 18);
                app.addMarker(lat, lng, '#10b981', 'Início');
            } else {
                // Distância
                const last = state.routePoints[state.routePoints.length-1];
                const d = app.calcDist(last.lat, last.lng, lat, lng);
                if(d > 2) {
                    state.dist += d;
                    document.getElementById('distVal').innerText = Math.round(state.dist);
                }
            }

            state.lastPos = p;
            state.routePoints.push(p);
            
            // Risco Vermelho
            state.polyline.addLatLng([lat, lng]);
            state.map.panTo([lat, lng]);

            // Salva ponto
            supabase.from('route_points').insert({ 
                route_id: state.currentRouteId, lat, lng, created_at: new Date() 
            }).then();

        }, err => alert("Erro GPS"), { enableHighAccuracy: true });
    },

    stopTracking: async () => {
        if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
        
        if(state.lastPos) app.addMarker(state.lastPos.lat, state.lastPos.lng, '#ef4444', 'Fim');
        
        await supabase.from('routes').update({ status: 'finished', ended_at: new Date() }).eq('id', state.currentRouteId);
        
        document.getElementById('btnStart').style.display = 'block';
        document.getElementById('btnStop').style.display = 'none';
        document.getElementById('btnNest').disabled = true;
        document.getElementById('statusBadge').innerText = "PARADO";
        document.getElementById('statusBadge').style.background = "#333";
        
        alert("Salvo!");
    },

    openNestModal: () => {
        if(!state.lastPos) return alert("Aguarde GPS");
        document.getElementById('nestObs').value = "";
        document.getElementById('nestPhoto').value = "";
        document.getElementById('nestModal').style.display = 'flex';
    },

    photoChanged: (input) => {
        if(input.files[0]) {
            document.getElementById('lblPhoto').style.borderColor = '#10b981';
            document.getElementById('lblPhoto').innerText = "✅ Foto OK";
        }
    },

    confirmNest: async () => {
        const obs = document.getElementById('nestObs').value;
        const file = document.getElementById('nestPhoto').files[0];
        let url = null;

        if(file) {
            const name = `${state.user.id}/${Date.now()}.jpg`;
            const { data } = await supabase.storage.from('ninhos-fotos').upload(name, file);
            if(data) {
                const { data: pub } = supabase.storage.from('ninhos-fotos').getPublicUrl(name);
                url = pub.publicUrl;
            }
        }

        const { error } = await supabase.from('nests').insert({
            user_id: state.user.id,
            route_id: state.currentRouteId,
            lat: state.lastPos.lat,
            lng: state.lastPos.lng,
            note: obs,
            photo_url: url,
            status: 'CATALOGADO'
        });

        if(error) alert(error.message);
        else {
            app.addMarker(state.lastPos.lat, state.lastPos.lng, '#fbbf24', 'Ninho');
            state.nestCount++;
            document.getElementById('nestVal').innerText = state.nestCount;
            document.getElementById('nestModal').style.display = 'none';
        }
    },

    // --- PERFIL ---
    loadProfile: async () => {
        let { data } = await supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
        if(!data) {
            await supabase.from('profiles').insert({ id: state.user.id, full_name: 'Usuário' });
            data = { full_name: 'Usuário', phone: '' };
        }
        document.getElementById('menuUser').innerText = data.full_name;
        document.getElementById('profName').value = data.full_name || '';
        document.getElementById('profPhone').value = data.phone || '';
    },

    saveProfile: async () => {
        const name = document.getElementById('profName').value;
        const phone = document.getElementById('profPhone').value;
        await supabase.from('profiles').update({ full_name: name, phone }).eq('id', state.user.id);
        alert("Salvo!");
        app.loadProfile();
    },

    // --- UTEIS ---
    addMarker: (lat, lng, color, title) => {
        const icon = L.divIcon({ className: 'custom-pin', html: `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid white;"></div>` });
        L.marker([lat, lng], {icon}).addTo(state.map).bindPopup(title);
    },

    calcDist: (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const q1 = lat1 * Math.PI/180; const q2 = lat2 * Math.PI/180;
        const dq = (lat2-lat1) * Math.PI/180; const dl = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(dq/2) * Math.sin(dq/2) + Math.cos(q1) * Math.cos(q2) * Math.sin(dl/2) * Math.sin(dl/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
};

app.init();