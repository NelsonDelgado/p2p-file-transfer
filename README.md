# P2P Secure File Transfer (Projeto MultiCadeiras)

Aplicação web estática para partilha segura de ficheiros **Peer-to-Peer (P2P)** com **encriptação ponta a ponta (E2EE)** diretamente no navegador, sem necessidade de servidores de backend ou armazenamento central de ficheiros.

##  Tecnologias

- **Frontend:** [Svelte 5](https://svelte.dev) + [SvelteKit 2](https://kit.svelte.dev) (SPA estática via `@sveltejs/adapter-static`)
- **P2P Swarm:** [WebTorrent](https://webtorrent.io) (WebRTC + WebSockets trackers públicos)
- **Criptografia E2EE:** Web Crypto API (RSA-OAEP 2048 bits para troca de chave + AES-GCM 256 bits para ficheiros)
- **Estilização:** Tailwind CSS v4 + Bits UI + Lucide Icons + Mode Watcher (Dark/Light mode)

---

##  Como Executar Localmente

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:5173`.

3. **Gerar build estático e testar pré-visualização:**
   ```bash
   npm run build
   npm run preview
   ```

---

##  Publicação no GitHub Pages

A aplicação está configurada para deploy automático através do **GitHub Actions**.

### Passos para publicar:

1. **Inicializar o repositório git e enviar para o GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: reformular para github pages com adapter-static e CI/CD"
   git branch -M main
   git remote add origin https://github.com/<SEU-UTILIZADOR>/<NOME-DO-REPOSITORIO>.git
   git push -u origin main
   ```

2. **Ativar o GitHub Pages no Repositório:**
   - No GitHub, aceda a **Settings** do repositório.
   - No menu lateral esquerdo, clique em **Pages**.
   - Na secção **Build and deployment > Source**, selecione:
     👉 **GitHub Actions**
   - O workflow `.github/workflows/deploy.yml` será acionado automaticamente a cada `git push` na branch `main` e o seu site ficará disponível em `https://<SEU-UTILIZADOR>.github.io/<NOME-DO-REPOSITORIO>/`.
