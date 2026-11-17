import type { GaariEvent } from './types';
import { isFreeEvent, isTouristFriendly, isStudentRelevant } from './utils';

/**
 * Hvem er du?-filtrene på forsiden. Én regel, brukt både av tallet på knappen
 * (EventDiscovery) og av selve filteret (forsiden).
 *
 * Før 17. nov 2026 sto regelen to steder og hadde glidd fra hverandre: knappen
 * «Familie» sa 88, klikket ga 122, fordi tallet bare talte `age_group` mens
 * filteret også tok kategori og tittel. 18+ og ungdom hadde samme slags avvik.
 */
export type AudienceEvent = Pick<
	GaariEvent,
	'title_no' | 'category' | 'age_group' | 'venue_name' | 'price'
> & { description_no?: string };

const familyTitleRe = /familie|barnelørdag|barnas\s|for\s+barn|barneforestilling/i;

const ungdomRe =
	/\bungdom|\btenåring|\bteenåring|\bfor\s+unge?\b|\bunge?\b|\bteen|\b1[0-5]\s*[-–]\s*1[5-9]\s*år|\bfra\s+1[0-5]\s+år/i;

const voksenCategories = new Set(['culture', 'music', 'theatre', 'tours', 'food', 'workshop', 'festival']);
const voksenClubRe = /\bklubb|\bdj\b|\bhouse\b|\btechno|\bafterparty|\bnattklubb|\brave\b/i;
const voksenChildRe =
	/junior|for\s+barn|\bbarnas\s|barnelørdag|barneforestilling|eventyrstund|eventyromvisning|prompepulver|babysang|babymassasje|babysvømming|knøttekor|knottekor|lillelørdag|lørdagsverksted|ronja\s+røverdatter|fabelrommet/i;
const voksenYouthRe = /\bungdom|\bfor\s+unge?\b|\bunge?\b|\btenåring|\bteen/i;
const indieVenues = ['hulen', 'garage', 'kvarteret', 'det akademiske kvarter', 'landmark', 'bergen kjøtt', 'fincken', 'røkeriet', 'østre'];

const adultVenueNames = [
	'hulen', 'garage', 'kvarteret', 'akademiske kvarter', 'landmark',
	'bergen kjøtt', 'fincken', 'røkeriet', 'østre', 'bodega',
	"o'connor", 'gåsa pub', 'biblioteket bar', 'bryggen nightclub', 'cinemateket',
	'victoria', 'kronbar', 'statsraaden',
	'7 fjell bryggeri', '7fjell bryggeri', 'kennel', 'steppeulven',
	'bakrommet', 'spissen', 'sardinen', "heidi's", 'shipyard'
];
const adultRe =
	/\bsingel\s*treff|\bspeed\s*dat|\bpub\s*quiz|\bquiz\b|\blive\s+på\s+pub|\bnattklubb|\bklubb(?:kveld|natt)|\bafterparty|\bbar\s+og\b|\bstand.?up\b|\bklubbkveld\b|\bklubb\b/i;
const adultChildRe =
	/\bjunior\b|\bfor\s+barn\b|\bbarnas\s|\bbarnelørdag|\bbarneforestilling|\beventyrstund|\beventyromvisning|\bprompepulver/i;

/** Tom eller ukjent målgruppe slipper alt gjennom. */
export function matchesAudience(e: AudienceEvent, audience: string): boolean {
	const venueLower = e.venue_name?.toLowerCase() || '';
	const desc = e.description_no || '';
	switch (audience) {
		case 'family':
			return e.age_group === 'family' || e.category === 'family' || familyTitleRe.test(e.title_no);
		case 'ungdom':
			if (e.age_group === '18+') return false;
			if (e.category === 'nightlife' || e.category === 'food') return false;
			if (e.age_group === 'family' || e.category === 'family') return true;
			if (e.age_group === 'youth') return true;
			return ungdomRe.test(e.title_no) || ungdomRe.test(desc);
		case 'student':
			return isStudentRelevant(e);
		case 'tourist':
			return isTouristFriendly(e);
		case 'voksen':
			if (e.age_group === 'family' || e.category === 'family') return false;
			if (e.age_group === 'students' || e.age_group === 'youth') return false;
			if (!voksenCategories.has(e.category)) return false;
			if (voksenClubRe.test(e.title_no) || voksenClubRe.test(desc)) return false;
			if (voksenChildRe.test(e.title_no + ' ' + (e.venue_name || ''))) return false;
			if (voksenYouthRe.test(e.title_no)) return false;
			if (indieVenues.some((v) => venueLower.includes(v))) return false;
			if (/\bhulen\b/i.test(e.title_no)) return false;
			return true;
		case 'adult':
			if (e.age_group === 'family' || e.category === 'family') return false;
			if (adultChildRe.test(e.title_no)) return false;
			if (e.age_group === '18+') return true;
			if (e.category === 'nightlife') return true;
			if (adultVenueNames.some((v) => venueLower.includes(v))) return true;
			return adultRe.test(e.title_no) || adultRe.test(desc);
		case 'free':
			return isFreeEvent(e.price);
		default:
			return true;
	}
}
