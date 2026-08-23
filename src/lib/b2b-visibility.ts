/**
 * Er B2B-sidene offentlige? Gjelder /[lang]/for-arrangorer og
 * /[lang]/for-organizers.
 *
 * Sidene ble skjult mens NTB-saken pågikk, og blir stående skjult fordi
 * abonnementsstrategien ikke er aktiv. De skal opp igjen senere, så koden
 * blir liggende.
 *
 * Grunnen til at dette er én konstant og ikke fire kommentarer: skjulingen
 * var tidligere uttrykt hvert sted for seg, og stedet som ble glemt var
 * skjemahandlingen. SvelteKit kjører actions før load, så redirecten i load
 * stoppet ingenting — en POST til ?/contact skrev fortsatt til
 * organizer_inquiries og sendte varsel-e-post. Samme felle som beskrevet i
 * admin-auth.ts.
 *
 * Slå på igjen: sett denne til true. Da kommer footer-lenken tilbake av seg
 * selv, og både sidene og skjemaet svarer normalt. Sitemap-oppføringen må
 * gjenopprettes for hånd — se kommentaren i sitemap.xml/+server.ts.
 */
export const B2B_PAGES_PUBLIC = false;
