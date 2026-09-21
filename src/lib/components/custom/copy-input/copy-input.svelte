<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { ClipboardCheck, ClipboardCopy } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';

	let text: string = $state('');
	let copied: boolean = $state(false);

	let { value, title = 'Copyable' } = $props();

	onMount(() => {
		if (!browser) return;
		text = value;
	});

	async function handleCopy() {
		if (!browser) return;
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (e) {
			// Optionally handle error
		}
	}
</script>

<div class="w-full">
	<Label for="copyable">{title}</Label>
	<div class="flex items-center space-x-2">
		<Input class="copyable" type="text" value={text} disabled />
		<Button onclick={handleCopy} aria-label="Copy to clipboard">
			{#if copied}
				<ClipboardCheck />
			{:else}
				<ClipboardCopy />
			{/if}
		</Button>
	</div>
</div>
