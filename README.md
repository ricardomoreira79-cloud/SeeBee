# SeeBee (modular)
Projeto modular (HTML/CSS/JS) com Supabase Auth + Leaflet + PWA.

## Rodar local
- Via VS Code Live Server (recomendado) OU:
  npx serve .

## Publicar no Vercel
- Envie estes arquivos para o repositório conectado ao Vercel.
- Framework preset: **Other**
- Build Command: (vazio)
- Output Directory: (vazio)

## Requisitos no Supabase
- Tabela `routes` com colunas: id (uuid), name (text), path (jsonb), traps (jsonb), created_at (timestamptz default now())
- Bucket Storage `ninhos-fotos` público (ou com policy permitindo leitura pública)
- Policies (RLS) permitindo que o usuário leia/insira seus próprios dados (recomendado).
