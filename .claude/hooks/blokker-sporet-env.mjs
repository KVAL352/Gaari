#!/usr/bin/env node
/**
 * PreToolUse-hook: stopp skriving til env-filer som ligger i git.
 *
 * HVORFOR AKKURAT DE SPOREDE
 *
 * Repoet er offentlig. `.env` og `scripts/.env` er gitignorert, og en verdi
 * der er ikke en lekkasje. `.env.example` og `.env.ci` er derimot sporet med
 * vilje, og en ekte noekkel skrevet inn der havner rett i det offentlige
 * repoet og i historikken for alltid. En noekkel som har vaert innom en commit
 * er brent, og maa roteres.
 *
 * Sperra staar derfor paa de sporede filene, ikke paa de hemmelige. Det er
 * motsatt av foerstereaksjonen, og det er med vilje.
 *
 * Kjersti kan fortsatt redigere dem selv. Sperra gjelder Claude.
 */
import { readFileSync } from 'node:fs';

const SPORET = ['.env.example', '.env.ci'];

let inn;
try {
	inn = JSON.parse(readFileSync(0, 'utf8'));
} catch {
	process.exit(0);
}

const sti = (inn?.tool_input?.file_path ?? '').replace(/\\/g, '/');
if (!sti) process.exit(0);

const fil = sti.split('/').pop();
if (!SPORET.includes(fil)) process.exit(0);

console.log(
	JSON.stringify({
		hookSpecificOutput: {
			hookEventName: 'PreToolUse',
			permissionDecision: 'deny',
			permissionDecisionReason:
				`${fil} ligger i git, og repoet er offentlig. En ekte noekkel skrevet hit havner i ` +
				`historikken for alltid og maa roteres. Be Kjersti gjoere endringen selv, eller ` +
				`forklar hva som skal inn slik at hun kan vurdere det.`,
		},
	})
);
process.exit(2);
