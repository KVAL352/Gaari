<script lang="ts">
	import { t } from '$lib/i18n';
</script>

<h1 class="sr-only">
	{$t('heroSubtitle')}
</h1>
<section class="hidden border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 pb-2 pt-3 md:block">
	<div class="mx-auto max-w-7xl text-center">
		<p class="text-[clamp(1.5rem,3vw,2.25rem)] font-bold uppercase leading-[1.05] tracking-[-0.03em]" style="font-family: var(--font-display)" aria-hidden="true">
			{$t('tagline')}
		</p>
		<p class="mt-0.5 text-sm text-[var(--color-text-muted)]">
			{$t('heroSubtitle')}
		</p>
	</div>
</section>
