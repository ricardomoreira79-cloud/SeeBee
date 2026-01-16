// js/app.js - VERSÃO FÊNIX (LOGIN + MAPA + PERFIL)

// --- 1. CONFIGURAÇÃO (PREENCHA AQUI) ---
const SUPABASE_URL = 'SUA_URL_SUPABASE_AQUI'; 
const SUPABASE_KEY = 'SUA_ANON_KEY_AQUI';     

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
    login: async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        if(!email || !password) return alert("Preencha e-mail e senha");
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if(error) {
            document.getElementById('authMsg').innerText = "Erro: " + error.message;
        } else {
            window.location.reload();
        }
    },

    signup: async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        if(!email || !password) return alert("Preencha e-mail e senha");

        const { data, error } = await supabase.auth.signUp({ email, password });
        if(error) {
            document.getElementById('authMsg').innerText = "Erro: " + error.message;
        } else {
            alert("Conta criada! Verifique seu e-mail ou faça login.");
        }
    },

    loginGoogle: async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                queryParams: { access_type: 'offline', prompt: 'consent' }
            }
        });
        if(error) alert(error.message);
    },

    logout: async () => {
        await supabase.auth.signOut();
        window.location.reload();
    },

    // --- NAVEGAÇÃO ---
    nav: (viewId) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        document.getElementById('side-menu').classList.remove('open');
        
        if(viewId === 'view-traps' && state.map) {
            setTimeout(() => {
                state.map.invalidateSize();
                if(state.lastPos) state.map.setView([state.lastPos.lat, state.lastPos.lng], 18);
                else state.map.locate({ setView: true, maxZoom: 18 });
            }, 200);
        }
    },

    // --- MAPA ---
    initMap: () => {
        if(state.map) return;
        state.map = L.map('map', { zoomControl: false }).setView([-15.6, -56.1], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(state.map);
        
        // RISCO VERMELHO
        state.polyline = L.polyline([], { color: '#ef4444', weight: 5 }).addTo(state.map);
    },

    // --- GPS E GRAVAÇÃO ---
    startRecording: async () => {
        const name = prompt("Nome da trilha:", "Instalação " + new Date().toLocaleDateString());
        if(!name) return;

        // CONTAGEM REGRESSIVA
        const modal = document.getElementById('countdown-modal');
        const num = document.getElementById('countdown-number');
        modal.style.display = 'flex';
        let count = 3; num.innerText = count;

        const timer = setInterval(async () => {
            count--;
            if(count > 0) num.innerText = count;
            else {
                clearInterval(timer);
                modal.style.display = 'none';
                
                // INICIO REAL
                const { data, error } = await supabase.from('routes').insert({
                    user_id: state.user.id, name: name, status: 'active'
                }).select().single();

                if(error) return alert("Erro SQL: " + error.message);
                state.currentRouteId = data.id;

                // UI
                document.getElementById('btnStart').classList.add('hidden');
                document.getElementById('btnStop').classList.remove('hidden');
                document.getElementById('btnNest').disabled = false;
                document.getElementById('statusBadge').innerText = "GRAVANDO";
                document.getElementById('statusBadge').classList.add('active');
                
                // Reset
                state.routePoints = [];
                state.polyline.setLatLngs([]);
                state.map.eachLayer(l => { if(l instanceof L.Marker) state.map.removeLayer(l); });
                state.dist = 0; state.nestCount = 0;
                app.updateStats();

                app.gpsOn();
            }
        }, 1000);
    },

    gpsOn: () => {
        if(!navigator.geolocation) return alert("Sem GPS");
        
        state.watchId = navigator.geolocation.watchPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const p = { lat, lng };
            
            document.getElementById('gpsStatus').innerText = "GPS OK";
            
            if (state.routePoints.length === 0) {
                app.addMarker(lat, lng, '#10b981', 'Início');
                state.map.setView([lat, lng], 18);
            } else {
                const last = state.routePoints[state.routePoints.length-1];
                const d = app.calcDist(last.lat, last.lng, lat, lng);
                if(d > 2) { // Movimento real
                    state.dist += d;
                    app.updateStats();
                }
            }

            state.lastPos = p;
            state.routePoints.push(p);
            state.polyline.addLatLng([lat, lng]); // DESENHA O RISCO
            state.map.panTo([lat, lng]);

            if(navigator.onLine) {
                supabase.from('route_points').insert({ route_id: state.currentRouteId, lat, lng, created_at: new Date() }).then();
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

        document.getElementById('btnStart').classList.remove('hidden');
        document.getElementById('btnStop').classList.add('hidden');
        document.getElementById('btnNest').disabled = true;
        document.getElementById('statusBadge').innerText = "PARADO";
        document.getElementById('statusBadge').classList.remove('active');
        app.loadHomeHistory();
    },

    // --- NINHOS ---
    openNestModal: () => {
        if(!state.lastPos) return alert("Aguarde GPS...");
        document.getElementById('nestNote').value = "";
        document.getElementById('nestPhoto').value = "";
        document.getElementById('lblPhoto').style.borderColor = '#475569';
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

            // GRAVA DIRETO SEM CHECAR PLANO
            const { error } = await supabase.from('nests').insert({
                user_id: state.user.id,
                route_id: state.currentRouteId,
                lat: state.lastPos.lat,
                lng: state.lastPos.lng,
                note, photo_url: photoUrl, status: 'CATALOGADO'
            });

            if(error) throw error;

            app.addMarker(state.lastPos.lat, state.lastPos.lng, '#fbbf24', 'Ninho');
            state.nestCount++;
            app.updateStats();
            document.getElementById('nest-modal').style.display = 'none';
            app.toast("Ninho Registrado!");

        } catch (e) {
            alert("Erro: " + e.message);
        } finally {
            btn.innerText = "Salvar";
        }
    },

    // --- COLONIAS ---
    saveColony: async () => {
        const name = document.getElementById('colonyName').value;
        const specie = document.getElementById('colonySpecie').value;
        await supabase.from('colonies').insert({
            user_id: state.user.id, name, species_name: specie, status: 'ATIVA', installation_date: new Date()
        });
        document.getElementById('colony-modal').style.display='none';
        app.loadColonies();
    },

    // --- CARREGAMENTOS ---
    loadProfile: async () => {
        // Tenta buscar perfil. Se nao tiver, cria.
        let { data } = await supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
        
        if(!data) {
            // Cria perfil na hora se faltar
            await supabase.from('profiles').insert({ id: state.user.id, full_name: 'Usuário', user_type: 'ADM' });
            data = { full_name: 'Usuário', cpf: '', phone: '', user_type: 'ADM' };
        }

        document.getElementById('profName').value = data.full_name || '';
        document.getElementById('profCPF').value = data.cpf || '';
        document.getElementById('profPhone').value = data.phone || '';
        document.getElementById('profRole').value = data.user_type;
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
        const cpf = document.getElementById('profCPF').value;
        const phone = document.getElementById('profPhone').value;
        const file = document.getElementById('profileAvatarInput').files[0];
        let avatarUrl = null;

        if(file) {
            const fileName = `${state.user.id}/avatar_${Date.now()}.jpg`;
            await supabase.storage.from('avatars').upload(fileName, file);
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            avatarUrl = data.publicUrl;
        }

        const updates = { full_name: name, cpf, phone };
        if(avatarUrl) updates.avatar_url = avatarUrl;

        const { error } = await supabase.from('profiles').update(updates).eq('id', state.user.id);
        if(error) alert("Erro: " + error.message);
        else { app.toast("Perfil Salvo"); app.loadProfile(); }
    },

    loadHomeHistory: async () => {
        const { data } = await supabase.from('routes').select('*, nests(count)').eq('user_id', state.user.id).order('created_at', {ascending:false}).limit(3);
        const div = document.getElementById('homeRecentTrails');
        if(div && data) {
            div.innerHTML = data.map(t => `
                <div class="route-card" style="margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between;">
                        <strong>${t.name}</strong>
                        <span style="color:#10b981;">${t.nests[0].count} ninhos</span>
                    </div>
                    <div style="font-size:12px; color:#94a3b8;">${new Date(t.created_at).toLocaleDateString()}</div>
                </div>
            `).join('');
        }
    },

    loadColonies: async () => {
        const { data } = await supabase.from('colonies').select('*').eq('user_id', state.user.id);
        document.getElementById('coloniesList').innerHTML = data.map(c => `<div class="route-card"><strong>${c.name}</strong><br><small>${c.species_name}</small></div>`).join('');
    },

    // --- UTEIS ---
    addMarker: (lat, lng, color, title) => {
        const icon = L.divIcon({ className: 'custom-pin', html: `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.5)"></div>` });
        L.marker([lat, lng], {icon}).addTo(state.map).bindPopup(title);
    },
    calcDist: (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; const q1 = lat1 * Math.PI/180; const q2 = lat2 * Math.PI/180;
        const dq = (lat2-lat1) * Math.PI/180; const dl = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(dq/2) * Math.sin(dq/2) + Math.cos(q1) * Math.cos(q2) * Math.sin(dl/2) * Math.sin(dl/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },
    updateStats: () => {
        document.getElementById('distText').innerText = Math.round(state.dist) + " m";
        document.getElementById('nestCountText').innerText = state.nestCount;
    },
    toast: (msg, type='ok') => {
        const t = document.getElementById('toast');
        t.innerText = msg; t.style.borderColor = type==='error'?'red':'#10b981';
        t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000);
    }
};

// --- START ---
document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        state.user = session.user;
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        app.initMap();
        app.loadProfile();
        app.loadHomeHistory();
        app.loadColonies();
    }

    // Eventos de Botões (Login/Signup/Google)
    document.getElementById('btnLogin').onclick = app.login;
    document.getElementById('btnSignup').onclick = app.signup;
    document.getElementById('btnGoogle').onclick = app.loginGoogle;
    document.getElementById('btnLogout').onclick = app.logout;
    
    // Listeners Globais
    document.getElementById('open-menu').onclick = () => document.getElementById('side-menu').classList.add('open');
    document.getElementById('close-menu').onclick = () => document.getElementById('side-menu').classList.remove('open');
    document.getElementById('nestPhoto').onchange = (e) => { if(e.target.files[0]) document.getElementById('lblPhoto').style.borderColor = '#10b981'; };
    
    setupListeners(); // Mapa e outros
});