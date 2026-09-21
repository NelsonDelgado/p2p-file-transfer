<!-- src/routes/receive/+page.svelte -->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toggleMode } from 'mode-watcher';
	import { MoonIcon, SunIcon } from '@lucide/svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { constructMagnetURI } from '$lib/torrent';
	import * as Card from '$lib/components/ui/card/index.js';
	import open_boot_van from '$lib/assets/open_boot_van.png';
	import { truncateFilename } from '$lib/utils';
	import { generateKeyPair, decryptFile, extractPrivateKeyFromURL } from '$lib/crypto';

	let client: any = null;
	let torrent: any = null;
	let progress = 0;
	let downloadSpeed = 0;
	let fileLinks: Array<{ name: string; url: string }> = [];
	let intervalId: number;
	let announceIntervalId: number;
	let error: string | null = null;
	let files: any[] = [];

	let manualMagnet = '';
	let torrentStarted = false;

	let publicKey: CryptoKey;
	let privateKey: CryptoKey;
	let isDecrypting = false;
	let decryptionError: string | null = null;
	let keySource: 'url' | 'generated' | null = null;

	onMount(async () => {
		if (!browser) return;

		if (typeof window.WebTorrent === 'undefined') {
			error = 'WebTorrent not found on window. Did you include the CDN <script>?';
			console.error(error);
			return;
		}

		try {
			const urlPrivateKey = await extractPrivateKeyFromURL();
			if (urlPrivateKey) {
				privateKey = urlPrivateKey;
				keySource = 'url';

				if (window.history?.replaceState) {
					const cleanUrl = window.location.href.split('#')[0];
					window.history.replaceState({}, document.title, cleanUrl);
				}
			} else {
				const keyPair = await generateKeyPair();
				publicKey = keyPair.publicKey;
				privateKey = keyPair.privateKey;
				keySource = 'generated';
			}
		} catch (err) {
			console.error('Failed to initialize decryption keys:', err);
			decryptionError = 'Failed to initialize decryption keys';

			try {
				const keyPair = await generateKeyPair();
				publicKey = keyPair.publicKey;
				privateKey = keyPair.privateKey;
				keySource = 'generated';
			} catch (fallbackErr) {
				console.error('Failed to generate fallback keys:', fallbackErr);
				decryptionError = 'Critical: Unable to initialize any decryption keys';
				return;
			}
		}

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
			error = err.message;
		});

		const searchParams = new URLSearchParams(window.location.search);
		const initialTorrent = searchParams.get('torrent') || searchParams.get('magnet');
		if (initialTorrent) {
			startDownload(initialTorrent);
		}
	});

	function startDownload(torrentParam: string) {
		if (!client) return;
		torrentStarted = true;
		error = null;

		let magnetURI: string;
		if (torrentParam.startsWith('magnet:')) {
			magnetURI = decodeURIComponent(torrentParam);
		} else {
			magnetURI = constructMagnetURI(torrentParam.trim());
		}

		try {
			torrent = client.add(magnetURI);

			intervalId = window.setInterval(() => {
				if (torrent) {
					progress = Math.round(torrent.progress * 100);
					downloadSpeed = Math.round(torrent.downloadSpeed / 1024);
					files = torrent.files || [];
				}
			}, 500);

			torrent.on('done', async () => {
				isDecrypting = true;

				for (const file of torrent.files) {
					try {
						const blob = await new Promise<Blob>((resolve, reject) => {
							file.getBlob((err: any, blob: Blob) => {
								if (err) reject(err);
								else resolve(blob);
							});
						});

						if (file.name.endsWith('.encrypted')) {
							try {
								const decryptedUrl = await decryptFile(blob, privateKey);
								const originalName = file.name.replace('.encrypted', '');
								fileLinks = [...fileLinks, { name: originalName, url: decryptedUrl }];
							} catch (decryptErr) {
								console.error('Failed to decrypt file:', file.name, decryptErr);
								const url = URL.createObjectURL(blob);
								fileLinks = [...fileLinks, {
									name: file.name + ' (decryption failed)',
									url
								}];
							}
						} else {
							const url = URL.createObjectURL(blob);
							fileLinks = [...fileLinks, { name: file.name, url }];
						}
					} catch (err) {
						console.error('Error processing file:', file.name, err);
						file.getBlobURL((err: any, url: string) => {
							if (err) {
								console.error(err);
								return;
							}
							fileLinks = [...fileLinks, {
								name: file.name + ' (processing failed)',
								url
							}];
						});
					}
				}

				isDecrypting = false;
			});

			torrent.on('error', (err: any) => {
				console.error('Torrent error:', err);
				error = err?.message || 'Error downloading torrent';
			});
		} catch (err: any) {
			console.error('Failed to add torrent:', err);
			error = err?.message || 'Failed to add torrent';
		}
	}

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
		if (announceIntervalId) clearInterval(announceIntervalId);

		fileLinks.forEach(link => {
			if (link.url.startsWith('blob:')) {
				URL.revokeObjectURL(link.url);
			}
		});

		if (client) {
			client.destroy();
		}
	});
</script>

<main class="flex h-screen w-screen flex-row items-center justify-center p-4">
	<Card.Root class="md:w-1/4 min-w-96">
		<Card.Header class="text-center flex flex-col items-center">
			<img class="h-36" src={open_boot_van} alt="Van with open boot"/>
			<Card.Title class="text-2xl">Receive Files</Card.Title>
			{#if error}
				<p class="bg-red-100 dark:bg-red-900 p-4 rounded text-red-800 dark:text-red-200 text-sm mt-2">{error}</p>
			{/if}
			{#if decryptionError}
				<p class="bg-yellow-100 dark:bg-yellow-900 p-2 rounded text-sm text-yellow-800 dark:text-yellow-200 mt-2">{decryptionError}</p>
			{/if}
		</Card.Header>
		<Card.Content>
			{#if !client}
				<div class="flex flex-col space-y-4 items-center">
					<div class="flex-row">
						<Skeleton class="h-20 w-20"></Skeleton>
					</div>
					<div class="flex flex-row w-full space-x-4">
						<div class="w-1/2">
							<Skeleton class="h-20 w-full"></Skeleton>
						</div>
						<div class="w-1/2">
							<Skeleton class="h-20 w-full"></Skeleton>
						</div>
					</div>
				</div>
			{:else if !torrentStarted}
				<div class="flex flex-col space-y-4">
					<p class="text-sm text-muted-foreground text-center">
						Paste a Torrent Hash or Magnet URI below to download files:
					</p>
					<Input
						placeholder="infoHash or magnet:?..."
						bind:value={manualMagnet}
					/>
					<Button
						disabled={!manualMagnet.trim()}
						onclick={() => startDownload(manualMagnet)}
					>
						Start Download
					</Button>
				</div>
			{:else}
				<div class="flex flex-col space-y-4 items-center">
					<div class="font-mono space-y-0 flex-row">
						<span class="text-8xl">{progress}</span>
						<span class="text-2xl">%</span>
					</div>
					<div class="flex flex-row w-full space-x-4">
						<div class="bg-muted p-4 rounded-lg w-1/2 text-center">
							<p class="text-xs text-muted-foreground">Delivering at</p>
							<p class="text-lg font-semibold">{downloadSpeed} kB/s</p>
						</div>
						<div class="bg-muted p-4 rounded-lg w-1/2 text-center">
							<p class="text-xs text-muted-foreground">File(s)</p>
							<p class="text-lg font-semibold">{files.length}</p>
						</div>
					</div>

					{#if keySource}
						<div class="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg w-full text-center text-sm">
							{#if keySource === 'url'}
								<p>🔐 End-to-end decryption enabled</p>
							{:else}
								<p>🔑 Generated new decryption keys</p>
								<p class="text-xs opacity-75 mt-1">Will probably not decrypt sender's files</p>
							{/if}
						</div>
					{/if}

					{#if isDecrypting}
						<div class="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg w-full text-center">
							<p>🔓 Decrypting downloaded files...</p>
						</div>
					{/if}

					{#if fileLinks.length > 0}
						<div class="bg-muted p-4 rounded-lg w-full">
							<h3 class="text-center mb-2 font-semibold">Downloaded Files</h3>
							{#each fileLinks as f}
								<div class="mb-2">
									<Button variant="link" class="w-full">
										<a href={f.url} download={f.name} class="block w-full text-left">
											{truncateFilename(f.name)}
											{#if f.name.includes('(decryption failed)')}
												<span class="text-red-500 text-xs ml-2" title="Decryption failed">⚠️</span>
											{:else if f.name.includes('(processing failed)')}
												<span class="text-orange-500 text-xs ml-2" title="Processing failed">⚠️</span>
											{:else if !f.name.endsWith('.encrypted')}
												<span class="text-green-500 text-xs ml-2" title="Successfully decrypted">🔓</span>
											{/if}
										</a>
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<div class="mt-6 text-center">
				<a href="{base}/" class="text-xs text-muted-foreground hover:underline">
					← Back to Send Files
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
