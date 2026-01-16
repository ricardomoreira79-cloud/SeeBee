// js/app.js - ARQUIVO UNICO

const SUPABASE_URL = 'SUA_URL_AQUI'; // <--- COLOQUE AQUI
const SUPABASE_KEY = 'SUA_KEY_AQUI'; // <--- COLOQUE AQUI

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
        // OUVINTE DE AUTH (Isso conserta o login do Google)
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                state.user = session.user;
                app.showApp();
            } else if (event === 'SIGNED_OUT') {
                state.user = null;
                app.showLogin();
            }
        });

        // Check inicial
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            state.user = session.user;
            app.showApp();
        } else {
            app.showLogin();
        }
    },

    login: async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        if(!email || !password) return alert("Preencha tudo");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Erro: " + error.message);
    },

    signup: async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        if(!email || !password) return alert("Preencha tudo");
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert("Erro: " + error.message);
        else alert("Conta criada! Verifique seu email.");
    },

    loginGoogle: async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    },

    logout: async () => {
        await supabase.auth.signOut();
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
        state.map = L.map('map', { zoomControl: false }).setView([-15.6, -56.1], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(state.map);
        state.polyline = L.polyline([], { color: '#ef4444', weight: 5 }).addTo(state.map); // VERMELHO
        state.map.locate({ setView: true, maxZoom: 18 });
    },

    // --- GPS ---
    startRecording: async () => {
        const name = prompt("Nome da Trilha:", "Instalação " + new Date().toLocaleDateString());
        if(!name) return;

        // Limpeza
        state.routePoints = [];
        state.dist = 0; state.nestCount = 0;
        state.polyline.setLatLngs([]);
        state.map.eachLayer(l => { if(l instanceof L.Marker) state.map.removeLayer(l); });
        
        document.getElementById('distText').innerText = "0 m";
        document.getElementById('nestCountText').innerText = "0";

        // Banco
        const { data, error } = await supabase.from('routes').insert({
            user_id: state.user.id, name, status: 'active'
        }).select().single();

        if(error) return alert("Erro ao criar rota: " + error.message);
        state.currentRouteId = data.id;

        // UI
        document.getElementById('btnStart').classList.add('hidden');
        document.getElementById('btnStop').classList.remove('hidden');
        document.getElementById('btnNest').disabled = false;
        document.getElementById('statusBadge').innerText = "GRAVANDO";
        document.getElementById('statusBadge').style.background = "#10b981";

        if(!navigator.geolocation) return alert("Sem GPS");

        state.watchId = navigator.geolocation.watchPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const p = { lat, lng };

            document.getElementById('gpsStatus').innerText = "GPS OK";

            // Se for o primeiro ponto
            if(state.routePoints.length === 0) {
                state.map.setView([lat, lng], 18);
                app.addMarker(lat, lng, '#10b981', 'Início');
            } else {
                const last = state.routePoints[state.routePoints.length-1];
                // Calcula distancia simples
                const d = app.calcDist(last.lat, last.lng, lat, lng);
                state.dist += d;
                document.getElementById('distText').innerText = Math.round(state.dist) + " m";
            }

            state.lastPos = p;
            state.routePoints.push(p);
            
            // DESENHA O RISCO
            state.polyline.addLatLng([lat, lng]);
            state.map.panTo([lat, lng]);

            // Salva
            supabase.from('route_points').insert({ route_id: state.currentRouteId, lat, lng, created_at: new Date() }).then();

        }, err => alert("Erro GPS"), { enableHighAccuracy: true });
    },

    stopRecording: async () => {
        if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
        
        if(state.lastPos) app.addMarker(state.lastPos.lat, state.lastPos.lng, '#ef4444', 'Fim');
        
        await supabase.from('routes').update({ status: 'finished', ended_at: new Date() }).eq('id', state.currentRouteId);
        
        document.getElementById('btnStart').classList.remove('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('btnNest').disabled = true;
        document.getElementById('statusBadge').innerText = "PARADO";
        document.getElementById('statusBadge').style.background = "#334155";
        
        alert("Trilha Finalizada!");
    },

    openNestModal: () => {
        if(!state.lastPos) return alert("Aguarde GPS");
        document.getElementById('nestNote').value = "";
        document.getElementById('nestPhoto').value = "";
        document.getElementById('nest-modal').style.display = 'flex';
    },

    confirmNest: async () => {
        document.getElementById('btnConfirmNest').innerText = "...";
        try {
            const note = document.getElementById('nestNote').value;
            const file = document.getElementById('nestPhoto').files[0];
            let url = null;

            if(file) {
                const name = `${state.user.id}/${Date.now()}.jpg`;
                await supabase.storage.from('ninhos-fotos').upload(name, file);
                const { data } = supabase.storage.from('ninhos-fotos').getPublicUrl(name);
                url = data.publicUrl;
            }

            // GRAVA SEM RESTRIÇÃO
            const { error } = await supabase.from('nests').insert({
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
            document.getElementById('nest-modal').style.display = 'none';

        } catch (e) {
            alert("Erro: " + e.message);
        } finally {
            document.getElementById('btnConfirmNest').innerText = "Salvar";
        }
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
    },

    nav: (id) => {
        document.querySelectorAll('.view-section').forEach(e => e.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        document.getElementById('side-menu').classList.remove('open');
        if(id === 'view-traps' && state.map) setTimeout(() => state.map.invalidateSize(), 200);
    },

    loadProfile: async () => {
        let { data } = await supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
        if(!data) {
            // Cria perfil se não existir
            await supabase.from('profiles').insert({ id: state.user.id, full_name: 'Usuário' });
            data = { full_name: 'Usuário' };
        }
        document.getElementById('profName').value = data.full_name || '';
        document.getElementById('profPhone').value = data.phone || '';
    },

    saveProfile: async () => {
        const name = document.getElementById('profName').value;
        const phone = document.getElementById('profPhone').value;
        await supabase.from('profiles').update({ full_name: name, phone }).eq('id', state.user.id);
        alert("Salvo!");
    }
};

// LISTENERS DO DOM
document.addEventListener('DOMContentLoaded', () => {
    app.init();
    
    // Auth BTNs
    document.getElementById('btnLogin').onclick = app.login;
    document.getElementById('btnSignup').onclick = app.signup;
    document.getElementById('btnGoogle').onclick = app.loginGoogle;
    
    // Menu
    document.getElementById('open-menu').onclick = () => document.getElementById('side-menu').classList.add('open');
    document.getElementById('close-menu').onclick = () => document.getElementById('side-menu').classList.remove('open');
    document.getElementById('nestPhoto').onchange = (e) => { if(e.target.files[0]) document.getElementById('lblPhoto').style.borderColor = '#10b981'; };
});