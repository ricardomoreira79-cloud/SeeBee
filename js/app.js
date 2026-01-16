// js/app.js - CÓDIGO COMPLETO (Copie e Cole)

// --- 1. CONEXÃO SUPABASE (PREENCHA AQUI) ---
const SUPABASE_URL = 'SUA_URL_SUPABASE_AQUI'; // <--- COLE SUA URL AQUI
const SUPABASE_KEY = 'SUA_ANON_KEY_AQUI';     // <--- COLE SUA KEY AQUI

// Inicializa o cliente
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. ESTADO GLOBAL ---
const state = {
    user: null,
    map: null,
    polyline: null,
    isRecording: false,
    routePoints: [],
    dist: 0,
    nestCount: 0,
    watchId: null,
    currentRouteId: null,
    lastPos: null
};

// --- 3. SISTEMA PRINCIPAL (app) ---
window.app = {
    
    // Navegação entre telas
    nav: (viewId) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        document.getElementById('side-menu').classList.remove('open');
        
        // Se for para o mapa, força atualização visual
        if(viewId === 'view-traps' && state.map) {
            setTimeout(() => {
                state.map.invalidateSize();
                if(state.lastPos) state.map.setView([state.lastPos.lat, state.lastPos.lng], 18);
            }, 200);
        }
    },

    // Inicia o Mapa
    initMap: () => {
        if(state.map) return;
        state.map = L.map('map', { zoomControl: false }).setView([-15.6, -56.1], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(state.map);
        
        // CRIA A CAMADA DO RISCO (LINHA VERMELHA)
        state.polyline = L.polyline([], { color: '#ef4444', weight: 5 }).addTo(state.map);
        
        // Tenta localizar de imediato
        state.map.locate({ setView: true, maxZoom: 18 });
    },

    // --- LÓGICA DE GRAVAÇÃO (GPS) ---
    startRecording: async () => {
        const name = prompt("Nome da trilha:", "Instalação " + new Date().toLocaleDateString());
        if(!name) return;

        try {
            // Cria a rota no banco
            const { data, error } = await supabase.from('routes').insert({
                user_id: state.user.id,
                name: name,
                status: 'active'
            }).select().single();

            if(error) throw error;
            state.currentRouteId = data.id;

            // Atualiza Interface
            document.getElementById('btnStart').classList.add('hidden');
            document.getElementById('btnStop').classList.remove('hidden');
            document.getElementById('btnNest').disabled = false;
            document.getElementById('statusBadge').innerText = "GRAVANDO";
            document.getElementById('statusBadge').classList.add('active');
            
            // Reseta Variáveis
            state.routePoints = [];
            state.polyline.setLatLngs([]); // Limpa o mapa visual
            
            // Remove marcadores antigos (limpeza profunda)
            state.map.eachLayer(layer => {
                if(layer instanceof L.Marker) state.map.removeLayer(layer);
            });

            state.dist = 0;
            state.nestCount = 0;
            app.updateStats();

            // LIGA O GPS
            app.gpsOn();

        } catch (e) {
            alert("Erro ao iniciar: " + e.message);
        }
    },

    gpsOn: () => {
        if(!navigator.geolocation) return alert("Sem GPS");
        
        state.watchId = navigator.geolocation.watchPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const p = { lat, lng };
            
            // Atualiza status visual
            document.getElementById('gpsStatus').innerText = "GPS OK";
            
            // Lógica de primeiro ponto vs movimento
            if (state.routePoints.length === 0) {
                // PRIMEIRO PONTO: Centraliza e marca início
                app.addMarker(lat, lng, '#10b981', 'Início');
                state.map.setView([lat, lng], 18);
            } else {
                // MOVIMENTO: Calcula distância
                const last = state.routePoints[state.routePoints.length-1];
                const d = app.calcDist(last.lat, last.lng, lat, lng);
                state.dist += d;
                app.updateStats();
            }

            // GUARDA O PONTO E DESENHA A LINHA
            state.lastPos = p;
            state.routePoints.push(p);
            state.polyline.addLatLng([lat, lng]); // <--- ISSO FAZ O RISCO
            state.map.panTo([lat, lng]); // Segue o usuário

            // Salva no banco (Fire and forget)
            supabase.from('route_points').insert({ 
                route_id: state.currentRouteId, lat, lng, created_at: new Date()
            }).then();

        }, err => {
            console.error(err);
            document.getElementById('gpsStatus').innerText = "ERRO GPS";
        }, { enableHighAccuracy: true, maximumAge: 0 });
    },

    stopRecording: async () => {
        if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
        
        if(state.nestCount === 0) {
            if(!confirm("Sem ninhos. Descartar?")) {
                app.gpsOn(); // Retoma
                return;
            }
            await supabase.from('routes').delete().eq('id', state.currentRouteId);
            alert("Descartado.");
        } else {
            // Marca Fim
            if(state.lastPos) app.addMarker(state.lastPos.lat, state.lastPos.lng, '#ef4444', 'Fim');
            await supabase.from('routes').update({ status: 'finished', ended_at: new Date() }).eq('id', state.currentRouteId);
            alert("Salvo com sucesso!");
        }

        // Reset UI
        document.getElementById('btnStart').classList.remove('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('btnNest').disabled = true;
        document.getElementById('statusBadge').innerText = "PARADO";
        document.getElementById('statusBadge').classList.remove('active');
        app.loadHistory();
    },

    // --- NINHOS ---
    openNestModal: () => {
        if(!state.lastPos) return alert("Aguarde o sinal de GPS...");
        document.getElementById('nestNote').value = "";
        document.getElementById('nestPhoto').value = "";
        document.getElementById('nest-modal').style.display = 'flex';
    },

    confirmNest: async () => {
        const btn = document.querySelector('#nest-modal .btn-solid');
        btn.innerText = "...";
        
        try {
            const note = document.getElementById('nestNote').value;
            const file = document.getElementById('nestPhoto').files[0];
            let photoUrl = null;

            if(file) {
                const fileName = `${state.user.id}/${Date.now()}.jpg`;
                const { error: upErr } = await supabase.storage.from('ninhos-fotos').upload(fileName, file);
                if(!upErr) {
                    const { data } = supabase.storage.from('ninhos-fotos').getPublicUrl(fileName);
                    photoUrl = data.publicUrl;
                }
            }

            // GRAVAÇÃO DO NINHO (SEM CHECAGEM DE PLANO)
            const { error } = await supabase.from('nests').insert({
                user_id: state.user.id,
                route_id: state.currentRouteId,
                lat: state.lastPos.lat,
                lng: state.lastPos.lng,
                note: note,
                photo_url: photoUrl,
                status: 'CATALOGADO'
            });

            if(error) throw error;

            // Marcador visual no mapa
            app.addMarker(state.lastPos.lat, state.lastPos.lng, '#fbbf24', 'Ninho');
            
            state.nestCount++;
            app.updateStats();
            document.getElementById('nest-modal').style.display = 'none';
            alert("Ninho Registrado!");

        } catch (e) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            btn.innerText = "Salvar";
        }
    },

    // --- AUXILIARES ---
    addMarker: (lat, lng, color, title) => {
        const icon = L.divIcon({
            className: 'custom-pin',
            html: `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.5)"></div>`
        });
        L.marker([lat, lng], {icon}).addTo(state.map).bindPopup(title);
    },

    calcDist: (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; 
        const q1 = lat1 * Math.PI/180; const q2 = lat2 * Math.PI/180;
        const dq = (lat2-lat1) * Math.PI/180; const dl = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(dq/2) * Math.sin(dq/2) + Math.cos(q1) * Math.cos(q2) * Math.sin(dl/2) * Math.sin(dl/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    updateStats: () => {
        document.getElementById('distText').innerText = Math.round(state.dist) + " m";
        document.getElementById('nestCountText').innerText = state.nestCount;
    },

    loadHistory: async () => {
        // Carrega histórico simples
        const { data } = await supabase.from('routes').select('*').eq('user_id', state.user.id).order('created_at', {ascending: false}).limit(3);
        /* Lógica de renderizar lista aqui se precisar */
    },
    
    // --- PERFIL ---
    loadProfile: async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
        if(data) {
            document.getElementById('profName').value = data.full_name || '';
            document.getElementById('profPhone').value = data.phone || '';
            document.getElementById('menu-name-display').innerText = data.full_name || 'Usuário';
        }
    },

    saveProfile: async () => {
        const name = document.getElementById('profName').value;
        const phone = document.getElementById('profPhone').value;
        const { error } = await supabase.from('profiles').update({ full_name: name, phone: phone }).eq('id', state.user.id);
        if(error) alert("Erro: " + error.message);
        else alert("Perfil Salvo!");
    }
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        state.user = session.user;
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        app.initMap();
        app.loadProfile();
        
        // Logout handler
        document.getElementById('btnLogout').onclick = async () => {
            await supabase.auth.signOut();
            window.location.reload();
        };
    }

    // Login Handler
    document.getElementById('btnLogin').onclick = async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else window.location.reload();
    };
    
    // Feedback de foto
    document.getElementById('nestPhoto').onchange = (e) => {
        if(e.target.files[0]) document.getElementById('lblPhoto').style.borderColor = 'var(--primary)';
    };
});