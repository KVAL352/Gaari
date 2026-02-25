<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>Admin — Gåri</title>
</svelte:head>

<main style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; font-family: Inter, system-ui, sans-serif;">
	<div style="width: 100%; max-width: 360px; padding: 0 16px;">
		<div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 16px; padding: 40px 32px;">
			<h1 style="font-family: 'Barlow Condensed', sans-serif; font-size: 32px; color: #141414; margin: 0 0 4px;">
				Gåri Admin
			</h1>
			<p style="color: #737373; font-size: 14px; margin: 0 0 28px;">Skriv inn passordet for å fortsette.</p>

			<form method="POST" use:enhance>
				<div style="margin-bottom: 16px;">
					<label for="password" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
						Passord
					</label>
					<!-- svelte-ignore a11y_autofocus -->
				<input
						id="password"
						name="password"
						type="password"
						required
						autofocus
						style="width: 100%; padding: 10px 12px; border: 1px solid {form?.error ? '#C82D2D' : '#d0d0d0'}; border-radius: 8px; font-size: 15px; outline: none; box-sizing: border-box;"
					/>
					{#if form?.error}
						<p style="margin: 6px 0 0; font-size: 13px; color: #C82D2D;">{form.error}</p>
					{/if}
				</div>
				<button
					type="submit"
					style="width: 100%; padding: 11px; border-radius: 8px; border: none; background: #C82D2D; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; min-height: 44px;"
				>
					Logg inn
				</button>
			</form>
		</div>
	</div>
</main>
