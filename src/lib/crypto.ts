// src/lib/crypto.ts

/**
 * Generates an RSA key pair using RSA-OAEP
 * @returns {Promise<CryptoKeyPair>} The generated RSA key pair
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
	const keyPair: CryptoKeyPair = await window.crypto.subtle.generateKey(
		{
			name: "RSA-OAEP",
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: "SHA-256"
		},
		true,
		["encrypt", "decrypt"]
	);
	return keyPair;
}

/**
 * Exports a private key to a base64 string
 * @param {CryptoKey} privateKey - The private key to export
 * @returns {Promise<string>} Base64 encoded private key
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
	const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
	const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
	return exportedAsBase64;
}

/**
 * Imports a private key from a base64 string
 * @param {string} base64Key - Base64 encoded private key
 * @returns {Promise<CryptoKey>} The imported private key
 */
export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
	const binaryString = atob(base64Key);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return await crypto.subtle.importKey(
		'pkcs8',
		bytes.buffer,
		{
			name: 'RSA-OAEP',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256'
		},
		true,
		['decrypt']
	);
}

/**
 * Exports a public key to a base64 string
 * @param {CryptoKey} publicKey - The public key to export
 * @returns {Promise<string>} Base64 encoded public key
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
	const exported = await crypto.subtle.exportKey('spki', publicKey);
	const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
	return exportedAsBase64;
}

/**
 * Imports a public key from a base64 string
 * @param {string} base64Key - Base64 encoded public key
 * @returns {Promise<CryptoKey>} The imported public key
 */
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
	const binaryString = atob(base64Key);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return await crypto.subtle.importKey(
		'spki',
		bytes.buffer,
		{
			name: 'RSA-OAEP',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256'
		},
		true,
		['encrypt']
	);
}

/**
 * Extracts private key from URL hash fragment
 * @returns {Promise<CryptoKey | null>} The private key if found in URL, null otherwise
 */
export async function extractPrivateKeyFromURL(): Promise<CryptoKey | null> {
	if (typeof window === 'undefined') return null;

	const hash = window.location.hash;
	if (hash.startsWith('#key=')) {
		const encodedKey = hash.substring(5);
		try {
			return await importPrivateKey(encodedKey);
		} catch (error) {
			console.error('Failed to import private key from URL:', error);
			return null;
		}
	}
	return null;
}

/**
 * Creates a share URL with embedded private key
 * @param {string} baseUrl - Base URL for sharing
 * @param {CryptoKey} privateKey - Private key to embed
 * @returns {Promise<string>} Share URL with embedded key
 */
export async function createShareUrlWithKey(baseUrl: string, privateKey: CryptoKey): Promise<string> {
	const encodedKey = await exportPrivateKey(privateKey);
	return `${baseUrl}#key=${encodedKey}`;
}

/**
 * Encrypts a file using AES-GCM and encrypts the AES key with the RSA public key.
 * Returns a Blob containing the encrypted AES key, IV, and encrypted file content.
 *
 * @param {File} file - The file to encrypt
 * @param {CryptoKey} publicKey - The RSA public key to encrypt the AES key
 * @returns {Promise<Blob>} The encrypted file as a Blob
 */
export async function encryptFile(file: File, publicKey: CryptoKey): Promise<Blob> {
	const aesKey: CryptoKey = await crypto.subtle.generateKey(
		{
			name: "AES-GCM",
			length: 256
		},
		true,
		["encrypt", "decrypt"]
	);

	const iv: Uint8Array = crypto.getRandomValues(new Uint8Array(12));

	const fileBuffer: ArrayBuffer = await file.arrayBuffer();

	const encryptedContent: ArrayBuffer = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv
		},
		aesKey,
		fileBuffer
	);

	const rawAesKey: ArrayBuffer = await crypto.subtle.exportKey("raw", aesKey);

	const encryptedAesKey: ArrayBuffer = await crypto.subtle.encrypt(
		{ name: "RSA-OAEP" },
		publicKey,
		rawAesKey
	);

	const blobParts: BlobPart[] = [
		new Uint8Array(encryptedAesKey),
		iv,
		new Uint8Array(encryptedContent)
	];

	return new Blob(blobParts);
}

/**
 * Decrypts an encrypted Blob containing an RSA-encrypted AES key, IV, and AES-encrypted data.
 * Returns a URL pointing to the decrypted file Blob.
 *
 * @param {Blob} blob - The encrypted file Blob to decrypt
 * @param {CryptoKey} privateKey - The RSA private key to decrypt the AES key
 * @returns {Promise<string>} A URL representing the decrypted file Blob
 */
export async function decryptFile(blob: Blob, privateKey: CryptoKey): Promise<string> {
	const buffer: ArrayBuffer = await blob.arrayBuffer();

	const encryptedAesKey: ArrayBuffer = buffer.slice(0, 256);
	const iv: Uint8Array = new Uint8Array(buffer.slice(256, 268));
	const encryptedContent: ArrayBuffer = buffer.slice(268);

	const rawAesKey: ArrayBuffer = await crypto.subtle.decrypt(
		{ name: "RSA-OAEP" },
		privateKey,
		encryptedAesKey
	);

	const aesKey: CryptoKey = await crypto.subtle.importKey(
		"raw",
		rawAesKey,
		{ name: "AES-GCM" },
		false,
		["decrypt"]
	);

	const decrypted: ArrayBuffer = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		aesKey,
		encryptedContent
	);

	const blobDecrypted: Blob = new Blob([decrypted]);
	return URL.createObjectURL(blobDecrypted);
}