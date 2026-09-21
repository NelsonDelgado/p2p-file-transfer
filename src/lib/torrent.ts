export const TRACKERS = [
	'wss://tracker.openwebtorrent.com',
	'wss://tracker.webtorrent.dev',
	'wss://tracker.files.fm:7073/announce'
];

export function constructMagnetURI(infoHash: string): string {
	return (
		`magnet:?xt=urn:btih:${infoHash}` +
		TRACKERS.map((tr) => `&tr=${encodeURIComponent(tr)}`).join('')
	);
}
