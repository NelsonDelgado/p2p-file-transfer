<script props lang="ts">
	import { onMount } from 'svelte';
	import type { WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		data,
		squareSize = 128,
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	} = $props();

	let qrcode;

	onMount(() => {
		console.log(data, squareSize);

		let script = document.createElement('script');
		script.src = 'https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@gh-pages/qrcode.min.js';
		document.head.append(script);

		script.onload = function () {
			qrcode = new QRCode('qrcode', {
				text: data,
				width: squareSize,
				height: squareSize,
				colorDark: '#000000',
				colorLight: '#ffffff',
				correctLevel: QRCode.CorrectLevel.H
			});
		};
	});
</script>

<div id="qrcode" {...restProps}></div>
