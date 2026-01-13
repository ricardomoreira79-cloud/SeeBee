# SeeBee — App Web (Supabase + Leaflet)

## Como rodar local
Abra o `index.html` com Live Server (VS Code) ou publique direto (GitHub Pages/Vercel).

## Requisitos
- Supabase URL e ANON KEY em `src/config.js`
- Tabelas no schema public: routes, nests, photos (se photos não existir, app não trava)
- Bucket no Storage: `ninhos-fotos`
- Policies do Storage exigem caminho começando com `<auth.uid()>`

# SeeBee – Meliponicultura (Vercel + Supabase)

Estrutura estática (HTML/CSS/JS) com:
- Supabase Auth (email/senha + Google)
- Leaflet (mapa)
- Gravação de trilha (watchPosition)
- Marcação de ninhos (com foto opcional no Storage)
- Menu hamburguer (Minhas Trilhas / Meus Ninhos / Meus Dados / Sair)
