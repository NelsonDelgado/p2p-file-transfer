# P2P Secure File Transfer

A decentralized, browser-based Peer-to-Peer (P2P) file transfer application featuring client-side End-to-End Encryption (E2EE). Designed and implemented for academic research in distributed systems, network security, and cryptography.

Live Application: https://nelsondelgado.github.io/p2p-file-transfer/

---

## Overview

Traditional file transfer services rely on centralized cloud storage servers that temporarily or permanently retain user files, introducing data privacy risks and single points of failure.

This project addresses those concerns by facilitating direct browser-to-browser file transfers through WebRTC data channels, reinforced with application-layer hybrid encryption. Neither the hosting server (GitHub Pages) nor the torrent trackers have access to plaintext files or decryption keys.

---

## Security Architecture and Cryptography

The application implements a hybrid cryptosystem using the native browser Web Crypto API (window.crypto.subtle):

### Cryptographic Workflow
[Sender] [Receiver] | | +-- 1. Generate RSA-OAEP key pair (2048-bit) | +-- 2. Generate random symmetric AES-GCM key (256-bit) + 12-byte IV | +-- 3. Encrypt file contents with AES-GCM | +-- 4. Encrypt AES key using RSA Public Key | +-- 5. Seed encrypted file via WebTorrent swarm (.encrypted) | | | +------ Share URL: /receive?torrent=#key= --------+ | | | 6. Extract Private Key from URL fragment (#) | 7. Download file chunks via WebRTC | 8. Decrypt AES key with RSA Private Key | 9. Decrypt payload using AES-GCM


### Security Properties

- Zero-Knowledge Hosting: The private key is embedded strictly in the URL fragment (#key=...). According to RFC 3986, URL fragments are processed client-side and are never transmitted to web servers or network intermediaries via HTTP requests.
- Confidentiality and Integrity: AES-GCM (Galois/Counter Mode) provides authenticated encryption, guaranteeing both confidentiality and cryptographic integrity verification against payload tampering.
- Asymmetric Key Encapsulation: RSA-OAEP (Optimal Asymmetric Encryption Padding) with SHA-256 prevents chosen-ciphertext attacks during key exchange.

---

## Network Layer

- P2P Transport: Built on the WebTorrent protocol utilizing WebRTC DataChannels for peer-to-peer data interchange directly between client browsers.
- Peer Discovery: Uses public WebSocket trackers (wss://tracker.openwebtorrent.com, wss://tracker.webtorrent.dev, and wss://tracker.files.fm:7073/announce) for initial WebRTC signaling and peer exchange.
- NAT Traversal: Configured with Google STUN servers (stun:stun.l.google.com:19302) to handle NAT and firewall traversal across heterogeneous networks.

---

## Technology Stack

- Frontend: Svelte 5 and SvelteKit 2 (configured as a static Single Page Application via @sveltejs/adapter-static)
- P2P Protocol: WebTorrent (WebRTC and WebSockets)
- Cryptography: Web Crypto API (RSA-OAEP 2048-bit, AES-GCM 256-bit)
- Styling: Tailwind CSS v4, Bits UI, Lucide Icons, Mode Watcher (Theme management)
- Deployment and CI/CD: GitHub Actions and GitHub Pages

---

## Local Development

### Prerequisites

- Node.js (version 20 or higher)
- npm (version 10 or higher)

### Setup Instructions

1. Install dependencies:
   npm install

2. Start the local development server:
   npm run dev

   The application will be accessible at http://localhost:5173.

3. Create a production static build:
   npm run build

4. Preview the production build locally:
   npm run preview

---

## Deployment

The project includes an automated deployment workflow using GitHub Actions (.github/workflows/deploy.yml). Any push to the main branch triggers an automated build and publishes the static artifacts directly to GitHub Pages.
