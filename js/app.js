// js/app.js - VERSÃO FINAL (CHAVES OK + GPS OK + LAYOUT OK)

// 1. CHAVES REAIS DO SEU PROJETO
const SB_URL = 'https://sgrtyotwnlwpwfecnoze.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncnR5b3R3bmx3cHdmZWNub3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjgxMjcsImV4cCI6MjA4MzM0NDEyN30.QZvTN3mHUwqBwvXeL6q89qNW_4s1Cvopa40nt4TFa9w';

// Inicializa o cliente (usando nome diferente para não conflitar)
const sb = window.supabase.createClient(SB_URL, SB_KEY);

// 2. ESTADO
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

// 3. APP
window.app = {
    
    // --- AUTH ---
    init: async () => {
        // Escuta Login/Logout
        sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                state.user = session.user;
                app.showApp();
            } else if (event === 'SIGNED_OUT') {
                app.showLogin();
            }
        });

        // Check inicial
        const { data } = await sb.auth.getSession();
        if (data.session) {
            state.user = data.session.user;
            app.showApp();
        }
    },

    login: async () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if(error) alert(error.message);
    },

    signup: async () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const { error } = await sb.auth.signUp({ email, password: pass });
        if(error) alert(error.message);
        else alert("Conta criada! Verifique seu email.");
    },

    loginGoogle: async () => {
        await sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
    },

    logout: async () => {
        await sb.auth.signOut();
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

    nav: (view) => {
        document.querySelectorAll('section').forEach(e => e.classList.add('hidden'));
        document.getElementById('view-' + view).classList.remove('hidden');
        document.getElementById('side-menu').classList.remove('open');
        if(view === 'map' && state.map) setTimeout(() => state.map.invalidateSize(), 300);
    },

    // --- MAPA ---
    initMap: () => {
        if(state.map) return;
        state.map = L.map('map', { zoomControl: false }).setView([-15.6, -56.1], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(state.map);
        
        // LINHA VERMELHA DO RISCO
        state.polyline = L.polyline([], { color: '#ef4444', weight: 5 }).addTo(state.map);
        
        state.map.locate({ setView: true, maxZoom: 18 });
    },

    // --- GPS ---
    startRecording: async () => {
        const name = prompt("Nome da Trilha:", "Instalação " + new Date().toLocaleDateString());
        if(!name) return;

        // Reset
        state.routePoints = []; state.dist = 0; state.nestCount = 0;
        state.polyline.setLatLngs([]);
        state.map.eachLayer(l => { if(l instanceof L.Marker) state.map.removeLayer(l); });
        
        document.getElementById('distText').innerText = "0 m";
        document.getElementById('nestCountText').innerText = "0";

        // Cria Rota
        const { data, error } = await sb.from('routes').insert({
            user_id: state.user.id, name, status: 'active'
        }).select().single();

        if(error) return alert("Erro BD: " + error.message);
        state.currentRouteId = data.id;

        // UI
        document.getElementById('btnStart').style.display = 'none';
        document.getElementById('btnStop').style.display = 'block';
        document.getElementById('btnNest').disabled = false;
        document.getElementById('statusBadge').innerText = "GRAVANDO";
        document.getElementById('statusBadge').style.borderColor = "#10b981";
        document.getElementById('statusBadge').style.color = "#10b981";

        app.gpsOn();
    },

    gpsOn: () => {
        if(!navigator.geolocation) return alert("Sem GPS");
        
        state.watchId = navigator.geolocation.watchPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const p = { lat, lng };

            document.getElementById('gpsStatus').innerText = "OK";

            // Se for o primeiro ponto
            if(state.routePoints.length === 0) {
                state.map.setView([lat, lng], 18);
                app.addMarker(lat, lng, '#10b981', 'Início');
            } else {
                // Calcula distancia
                const last = state.routePoints[state.routePoints.length-1];
                const d = app.calcDist(last.lat, last.lng, lat, lng);
                if(d > 2) {
                    state.dist += d;
                    document.getElementById('distText').innerText = Math.round(state.dist) + " m";
                }
            }

            state.lastPos = p;
            state.routePoints.push(p);
            
            // DESENHA O RISCO
            state.polyline.addLatLng([lat, lng]);
            state.map.panTo([lat, lng]);

            // Salva ponto
            if(navigator.onLine) {
                sb.from('route_points').insert({ route_id: state.currentRouteId, lat, lng, created_at: new Date() }).then();
            }

        }, err => alert("Erro GPS"), { enableHighAccuracy: true, maximumAge: 0 });
    },

    stopRecording: async () => {
        if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
        
        if(state.lastPos) app.addMarker(state.lastPos.lat, state.lastPos.lng, '#ef4444', 'Fim');
        
        await sb.from('routes').update({ status: 'finished', ended_at: new Date() }).eq('id', state.currentRouteId);
        
        document.getElementById('btnStart').style.display = 'block';
        document.getElementById('btnStop').style.display = 'none';
        document.getElementById('btnNest').disabled = true;
        document.getElementById('statusBadge').innerText = "PARADO";
        document.getElementById('statusBadge').style.color = "#aaa";
        alert("Salvo!");
    },

    openNestModal: () => {
        if(!state.lastPos) return alert("Aguarde GPS");
        document.getElementById('nestNote').value = "";
        document.getElementById('nestPhoto').value = "";
        document.getElementById('lblPhoto').style.borderColor = '#334155';
        document.getElementById('nestModal').style.display = 'flex';
    },

    photoCheck: (input) => {
        if(input.files[0]) {
            document.getElementById('lblPhoto').style.borderColor = '#10b981';
            document.getElementById('lblPhoto').innerText = "✅ Foto OK";
        }
    },

    confirmNest: async () => {
        const btn = document.getElementById('btnConfirm');
        btn.innerText = "...";
        try {
            const note = document.getElementById('nestNote').value;
            const file = document.getElementById('nestPhoto').files[0];
            let url = null;

            if(file) {
                const name = `${state.user.id}/${Date.now()}.jpg`;
                const { data } = await sb.storage.from('ninhos-fotos').upload(name, file);
                if(data) {
                    const { data: pub } = sb.storage.from('ninhos-fotos').getPublicUrl(name);
                    url = pub.publicUrl;
                }
            }

            const { error } = await sb.from('nests').insert({
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
        let { data } = await sb.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
        
        // Auto-Criação de Perfil se não existir
        if(!data) {
            await sb.from('profiles').insert({ id: state.user.id, full_name: 'Usuário', user_type: 'ADM' });
            data = { full_name: 'Usuário', phone: '', cpf: '' };
        }

        document.getElementById('menuUser').innerText = data.full_name;
        document.getElementById('profName').value = data.full_name || '';
        document.getElementById('profPhone').value = data.phone || '';
        document.getElementById('profCPF').value = data.cpf || '';
        
        if(data.avatar_url) document.getElementById('profileImg').src = data.avatar_url;
    },

    saveProfile: async () => {
        const name = document.getElementById('profName').value;
        const phone = document.getElementById('profPhone').value;
        const cpf = document.getElementById('profCPF').value;
        const file = document.getElementById('profileFile').files[0];
        let avatarUrl = null;

        if(file) {
            const fileName = `${state.user.id}/avatar_${Date.now()}.jpg`;
            await sb.storage.from('avatars').upload(fileName, file);
            const { data } = sb.storage.from('avatars').getPublicUrl(fileName);
            avatarUrl = data.publicUrl;
        }

        const updates = { full_name: name, phone, cpf };
        if(avatarUrl) updates.avatar_url = avatarUrl;

        await sb.from('profiles').update(updates).eq('id', state.user.id);
        alert("Salvo!");
    },

    previewProfile: (input) => {
        if(input.files[0]) document.getElementById('profileImg').src = URL.createObjectURL(input.files[0]);
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
    
    document.getElementById('btnLogin').onclick = app.login;
    document.getElementById('btnSignup').onclick = app.signup;
    document.getElementById('btnGoogle').onclick = app.loginGoogle;
    
    document.getElementById('open-menu').onclick = () => document.getElementById('side-menu').classList.add('open');
    document.getElementById('close-menu').onclick = () => document.getElementById('side-menu').classList.remove('open');
});