// js/app.js - VERSÃO FINAL (CONECTADO)

// --- 1. CONFIGURAÇÃO (SUAS CHAVES REAIS) ---
const SUPABASE_URL = 'https://sgrtyotwnlwpwfecnoze.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncnR5b3R3bmx3cHdmZWNub3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjgxMjcsImV4cCI6MjA4MzM0NDEyN30.QZvTN3mHUwqBwvXeL6q89qNW_4s1Cvopa40nt4T4TFa9w';

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

// --- 3. APLICAÇÃO ---
window.app = {
    
    // --- AUTENTICAÇÃO ---
    init: async () => {
        // OUVINTE DE AUTH (Corrige login Google/Email)
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
        await supabase.auth.signInWithOAuth({ 
            provider: 'google',
            options: {
                redirectTo: window.location.href // Garante retorno para a mesma página
            }
        });
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
        app.loadHomeHistory();
        app.loadColonies();
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
        
        // RISCO VERMELHO
        state.polyline = L.polyline([], { color: '#ef4444', weight: 5 }).addTo(state.map);
    },

    // --- GPS ---
    startRecording: async () => {
        const name = prompt("Nome da Trilha:", "Instalação " + new Date().toLocaleDateString());
        if(!name) return;

        // Limpeza
        state.routePoints = [];
        state.dist = 0; state.nestCount = 0;
        state.polyline.setLatLngs([]);
        
        // Remove marcadores antigos (mas mantém tile e polyline)
        state.map.eachLayer(l => { 
            if(l instanceof L.Marker) state.map.removeLayer(l); 
        });
        
        document.getElementById('distText').innerText = "0 m";
        document.getElementById('nestCountText').innerText = "0";

        // Banco (Cria rota)
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

        app.gpsOn();
    },

    gpsOn: () => {
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
                const d = app.calcDist(last.lat, last.lng, lat, lng);
                
                // Filtro mínimo de movimento (2m)
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

            // Salva no banco (Fire-and-forget para performance)
            if(navigator.onLine) {
                supabase.from('route_points').insert({ 
                    route_id: state.currentRouteId, lat, lng, created_at: new Date() 
                }).then();
            }

        }, err => {
            console.error(err);
            document.getElementById('gpsStatus').innerText = "ERRO GPS";
        }, { enableHighAccuracy: true, maximumAge: 0 });
    },

    stopRecording: async () => {
        if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
        
        if(state.nestCount === 0) {
            if(!confirm("Sem ninhos. Descartar?")) { app.gpsOn(); return; }
            await supabase.from('routes').delete().eq('id', state.currentRouteId);
            app.toast("Descartado");
        } else {
            if(state.lastPos) app.addMarker(state.lastPos.lat, state.lastPos.lng, '#ef4444', 'Fim');
            await supabase.from('routes').update({ status: 'finished', ended_at: new Date() }).eq('id', state.currentRouteId);
            app.toast("Salvo com sucesso!");
        }
        
        // Reset UI
        document.getElementById('btnStart').classList.remove('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('btnNest').disabled = true;
        document.getElementById('statusBadge').innerText = "PARADO";
        document.getElementById('statusBadge').style.background = "#334155";
        
        app.loadHomeHistory();
    },

    openNestModal: () => {
        if(!state.lastPos) return alert("Aguarde GPS");
        document.getElementById('nestNote').value = "";
        document.getElementById('nestPhoto').value = "";
        // Reset do estilo do botão de foto
        const lbl = document.getElementById('lblPhoto');
        if(lbl) { lbl.style.borderColor = ''; lbl.innerText = '📷 Foto'; lbl.appendChild(document.getElementById('nestPhoto')); }
        
        document.getElementById('nest-modal').style.display = 'flex';
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
                const { error: upErr } = await supabase.storage.from('ninhos-fotos').upload(name, file);
                if(!upErr) {
                    const { data } = supabase.storage.from('ninhos-fotos').getPublicUrl(name);
                    url = data.publicUrl;
                }
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
            app.toast("Ninho Registrado!");

        } catch (e) {
            alert("Erro: " + e.message);
        } finally {
            btn.innerText = "Salvar";
        }
    },

    // --- PERFIL ---
    loadProfile: async () => {
        // Tenta buscar perfil
        let { data } = await supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
        
        // Se não existir, cria um novo (Resiliência)
        if(!data) {
            await supabase.from('profiles').insert({ id: state.user.id, full_name: 'Usuário', user_type: 'ADM' });
            data = { full_name: 'Usuário', user_type: 'ADM' };
        }

        document.getElementById('profName').value = data.full_name || '';
        document.getElementById('profPhone').value = data.phone || '';
        document.getElementById('profCPF').value = data.cpf || '';
        document.getElementById('profRole').value = data.user_type || 'ADM';
        
        // Menu Lateral
        document.getElementById('menu-name-display').innerText = (data.full_name || 'Usuário').split(' ')[0];
        document.getElementById('menu-role-display').innerText = data.user_type;
        
        if(data.avatar_url) {
            document.getElementById('profileImageDisplay').src = data.avatar_url;
            document.getElementById('menu-avatar-img').src = data.avatar_url;
            document.getElementById('menu-avatar-img').classList.remove('hidden');
            document.getElementById('menu-avatar-char').classList.add('hidden');
        }
    },

    saveProfile: async () => {
        const name = document.getElementById('profName').value;
        const phone = document.getElementById('profPhone').value;
        const cpf = document.getElementById('profCPF').value;
        const file = document.getElementById('profileAvatarInput').files[0];
        let avatarUrl = null;

        if(file) {
            const fileName = `${state.user.id}/avatar_${Date.now()}.jpg`;
            await supabase.storage.from('avatars').upload(fileName, file);
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            avatarUrl = data.publicUrl;
        }

        const updates = { full_name: name, phone, cpf };
        if(avatarUrl) updates.avatar_url = avatarUrl;

        const { error } = await supabase.from('profiles').update(updates).eq('id', state.user.id);
        
        if(error) alert("Erro ao salvar: " + error.message);
        else { 
            app.toast("Perfil Atualizado!"); 
            app.loadProfile(); 
        }
    },

    // --- UTEIS ---
    addMarker: (lat, lng, color, msg) => {
        const icon = L.divIcon({ className: 'custom-pin', html: `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.5)"></div>` });
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
    
    toast: (msg, type='ok') => {
        const t = document.getElementById('toast');
        t.innerText = msg; 
        t.style.borderColor = type==='error'?'red':'#10b981';
        t.classList.remove('hidden'); 
        setTimeout(() => t.classList.add('hidden'), 3000);
    },

    // Carregamentos Secundários (Mantidos simples)
    loadHomeHistory: async () => {
        const { data } = await supabase.from('routes').select('*, nests(count)').eq('user_id', state.user.id).order('created_at', {ascending:false}).limit(3);
        const div = document.getElementById('homeRecentTrails');
        if(div && data) {
            div.innerHTML = data.map(t => `<div class="route-card" style="margin-bottom:10px;"><div style="display:flex; justify-content:space-between;"><strong>${t.name}</strong><span style="color:#10b981;">${t.nests[0].count} ninhos</span></div><div style="font-size:12px; color:#94a3b8;">${new Date(t.created_at).toLocaleDateString()}</div></div>`).join('');
        }
    },
    
    saveColony: async () => {
        const name = document.getElementById('colonyName').value;
        const specie = document.getElementById('colonySpecie').value;
        await supabase.from('colonies').insert({ user_id: state.user.id, name, species_name: specie, status: 'ATIVA', installation_date: new Date() });
        document.getElementById('colony-modal').style.display='none';
        app.loadColonies();
    },
    
    loadColonies: async () => {
        const { data } = await supabase.from('colonies').select('*').eq('user_id', state.user.id);
        const list = document.getElementById('coloniesList');
        if(list && data) list.innerHTML = data.map(c => `<div class="route-card"><strong>${c.name}</strong><br><small>${c.species_name}</small></div>`).join('');
    },
    
    loadCaptures: async () => {
        const { data } = await supabase.from('nests').select('*').eq('user_id', state.user.id).eq('status', 'CAPTURADO');
        const list = document.getElementById('capturesList');
        if(list && data) list.innerHTML = data.map(c => `<div class="capture-card"><div class="capture-info">Ninho Capturado<br><small>${new Date(c.created_at).toLocaleDateString()}</small></div></div>`).join('');
    }
};

// --- START ---
document.addEventListener('DOMContentLoaded', () => {
    app.init(); // Inicia Verificação de Auth
    
    // Eventos
    document.getElementById('btnLogin').onclick = app.login;
    document.getElementById('btnSignup').onclick = app.signup;
    document.getElementById('btnGoogle').onclick = app.loginGoogle;
    document.getElementById('btnLogout').onclick = app.logout;
    
    document.getElementById('open-menu').onclick = () => document.getElementById('side-menu').classList.add('open');
    document.getElementById('close-menu').onclick = () => document.getElementById('side-menu').classList.remove('open');
    
    // Feedback visual do botão de foto
    document.getElementById('nestPhoto').onchange = (e) => {
        if(e.target.files[0]) {
            const l = document.getElementById('lblPhoto');
            l.style.borderColor = '#10b981';
            l.innerText = '✅ Foto Selecionada';
            l.appendChild(e.target); // Reanexa input
        }
    };
    
    // Preview foto perfil
    document.getElementById('profileAvatarInput').onchange = (e) => {
        if(e.target.files[0]) document.getElementById('profileImageDisplay').src = URL.createObjectURL(e.target.files[0]);
    };
});