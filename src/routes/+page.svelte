<!-- src/routes/send/+page.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { SunIcon, MoonIcon } from '@lucide/svelte';
	import { resetMode, setMode, toggleMode } from 'mode-watcher';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { constructMagnetURI, TRACKERS } from '$lib/torrent';
	import { QRCode } from '$lib/components/custom/qr-code';
	import { CopyInput } from '$lib/components/custom/copy-input/index.js';
	import open_boot_van from '$lib/assets/open_boot_van.png';
	import { generateKeyPair, encryptFile, createShareUrlWithKey } from '$lib/crypto';

	let client: any = null;
	let ready = false;
	let magnetURI = '';
	let shareLink = '';
	let secureShareLink = '';
	let peers = 0;
	let peerIntervalId: number;
	let announceIntervalId: number;

	// Crypto variables
	let publicKey: CryptoKey;
	let privateKey: CryptoKey;
	let isCreatingSecureLink = false;
	let encryptionError: string | null = null;

	onMount(async () => {
		if (!browser) return;

		if (typeof window.WebTorrent === 'undefined') {
			console.error('WebTorrent not found on window. Did you include the CDN <script>?');
			return;
		}

		// Initialize WebTorrent client
		client = new window.WebTorrent({
			tracker: {
				rtcConfig: {
					iceServers: [
						{ urls: 'stun:stun.l.google.com:19302' },
						{ urls: 'stun:stun1.l.google.com:19302' },
						{ urls: 'stun:stun2.l.google.com:19302' }
					]
				}
			}
		});

		client.on('error', (err: Error) => {
			console.error('WebTorrent error:', err);
		});

		// Generate RSA key pair for encryption
		try {
			const keyPair = await generateKeyPair();
			publicKey = keyPair.publicKey;
			privateKey = keyPair.privateKey;
			console.log('🔐 Encryption keys generated');
		} catch (error) {
			console.error('Failed to generate key pair:', error);
			encryptionError = 'Failed to initialize encryption';
		}

		ready = true;
	});

	async function onFileChange(event: Event) {
		if (!client) {
			console.warn('WebTorrent client not initialized yet.');
			return;
		}

		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files?.length) return;

		try {
			// Encrypt the files before seeding
			const filesToSeed = [];
			for (const f of Array.from(files)) {
				const encrypted = await encryptFile(f, publicKey);
				// Create a new File object with the encrypted blob
				const encryptedFileObj = new File([encrypted], `${f.name}.encrypted`, {
					type: 'application/octet-stream'
				});
				filesToSeed.push(encryptedFileObj);
			}

			client.seed(filesToSeed, { announce: TRACKERS }, async (torrent: any) => {
				const infoHash = torrent.infoHash;

				magnetURI = constructMagnetURI(infoHash);
				shareLink = `${window.location.origin}${base}/receive?torrent=${encodeURIComponent(infoHash)}`;

				// Create secure share link with embedded private key
				isCreatingSecureLink = true;
				encryptionError = null;

				try {
					secureShareLink = await createShareUrlWithKey(shareLink, privateKey);
					console.log('🔐 Secure sharing link created with embedded key');
				} catch (error) {
					console.error('Failed to create secure share link:', error);
					encryptionError = 'Failed to create secure sharing link';
					// Fallback to basic sharing without encryption
					secureShareLink = shareLink;
				} finally {
					isCreatingSecureLink = false;
				}

				peerIntervalId = window.setInterval(() => {
					peers = torrent.numPeers;
				}, 500);
			});
		} catch (error) {
			console.error('Failed to encrypt and seed files:', error);
			encryptionError = 'Failed to encrypt files';
		}
	}

	onDestroy(() => {
		if (peerIntervalId) clearInterval(peerIntervalId);
		if (announceIntervalId) clearInterval(announceIntervalId);
	});
</script>

<main class="flex h-screen w-screen flex-row items-center justify-center p-4">
	<Card.Root class="lg:w-1/3 max-w-md">
		<Card.Header class="text-center flex flex-col items-center ">
			<img class="h-36" src={open_boot_van} alt="Van with open boot"/>
			<Card.Title class="text-2xl">Send Files Securely</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if !ready}
				<div class="grid w-full items-center gap-4">
					<div class="grid w-full max-w-sm items-center gap-1.5">
						<Skeleton class="size-12 h-4 w-[65px]" />
						<Skeleton class="size-12 h-12 w-full" />
					</div>
				</div>
			{:else}
				<form>
					<div class="grid w-full items-center gap-4">
						<div class="grid w-full max-w-sm items-center gap-1.5">
							<Label for="ficheiros">Files</Label>
							<Input
								id="ficheiros"
								type="file"
								multiple
								onchange={onFileChange}
								disabled={!ready}
							/>
						</div>
					</div>
				</form>
			{/if}

			{#if encryptionError}
				<div class="mt-4 bg-red-100 dark:bg-red-900 p-3 rounded-lg text-sm">
					<p>⚠️ {encryptionError}</p>
				</div>
			{/if}

			{#if isCreatingSecureLink}
				<div class="mt-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-lg text-center">
					<p>🔐 Creating secure sharing link...</p>
				</div>
			{/if}

			{#if secureShareLink && !isCreatingSecureLink}
				<div class="mt-4 flex flex-col gap-4">
					<div class="flex flex-col space-y-4 w-full items-center">
						<QRCode data={secureShareLink}></QRCode>
						<CopyInput value={secureShareLink} title="Secure Share Link"></CopyInput>
					</div>

					<div class="bg-green-100 dark:bg-green-900 p-3 rounded-lg text-sm">
						<p class="font-semibold">🔒 Secure Link Created</p>
					</div>
				</div>

				<div class="mt-4 bg-orange-100 dark:bg-orange-400 p-3 rounded-lg text-sm">
					<p class="font-semibold">⚠️ Important Security Notes:</p>
					<ul class="text-xs mt-2 space-y-1 list-disc list-inside">
						<li>Keep this tab open until files are delivered</li>
						<li>Private key is embedded in the URL fragment</li>
						<li>Share the complete URL (including the #key= part)</li>
						<li>Files are encrypted end-to-end</li>
						<li>URL contains sensitive key material</li>
					</ul>
				</div>
			{/if}

			{#if peers > 0}
				<div class="mt-4 text-center bg-muted p-4 rounded-lg">
					<p>Connected Peers: {peers}</p>
				</div>
			{/if}

			{#if ready && publicKey && !encryptionError && !secureShareLink}
				<div class="mt-4 text-center bg-green-100 dark:bg-green-900 p-2 rounded-lg text-sm">
					<p>🔒 End-to-end encrypted</p>
				</div>
			{/if}

			<div class="mt-6 text-center">
				<a href="{base}/receive" class="text-xs text-muted-foreground hover:underline">
					Want to receive files? Go to Receive →
				</a>
			</div>
		</Card.Content>
	</Card.Root>

	<Button onclick={toggleMode} variant="outline" size="icon" class="fixed top-4 right-4">
		<SunIcon
			class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
		/>
		<MoonIcon
			class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
		/>
		<span class="sr-only">Toggle theme</span>
	</Button>
</main>