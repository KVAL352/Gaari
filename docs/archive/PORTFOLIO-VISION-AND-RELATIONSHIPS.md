# Gåri — the vision, and how the two sides meet

**The argument behind the product, in Kjersti's own framing.**
Written 2026-08-18, from her own account of the thinking, checked against the code.

Third of three documents for the portfolio build:

- **`PORTFOLIO-HANDOVER.md`** — what Gåri is: the product, how it looks, why.
- **`PORTFOLIO-SKILLS-INVENTORY.md`** — the roles she fills, the tasks inside each, and the tools.
- **This one** — the vision, and the relationship the product creates between the people who organise things and the people looking for something to do.

This is the *why* underneath the other two. It is also the part that is hardest to reverse-engineer from the repository, which is why it is written down here.

---

## 1. The vision: a digital town square

Everything that is happening in the city, in one place, easy to find.

The important part is who that "everything" includes. A neighbourhood market run by four friends. A school doing something for the people who live around it. A pop-up shop open for one afternoon. And, in the same listing, a sold-out concert in the biggest hall in town.

The argument is that these are not competitors for attention. They benefit from each other. The person who came looking for the concert discovers the market three streets away. The market gets an audience it could never have reached alone. The concert gets to sit inside a picture of a city that is alive rather than a picture of one venue. Density is the product.

**And that only works if the space is free to enter.**

This is the load-bearing idea, and it is not a pricing decision — it is a structural requirement. The moment there is a gate, the people who cannot pay stop showing up. The four friends with the market are exactly the ones a gate removes first. Remove enough of them and what is left is not a town square, it is a listings page for organisations with a marketing budget — which is precisely what already exists in Bergen and precisely what Gåri was built because of.

So: free to be listed, free to be in the newsletter, free to be posted on social media. Not as generosity. As the condition for the thing working at all.

> **Kjersti's own line, worth keeping close to verbatim:** *the space itself has to be free to enter in order for the space to work.*

---

## 2. The organiser side — three doors in

The relationship with organisers is designed around one principle: **meet them where they already are.**

### Door one — send in a single event

For the small and the local. The pop-up shop, the neighbourhood market, the school event, the one-off.

You fill in one short form. I read it myself, and if it belongs on the site I approve it. An automatic confirmation goes out telling you it is live. Nothing more is asked of you.

*Verified:* the submission form and the moderation queue exist, and the confirmation is sent automatically once an event is approved. The job is written to reconcile a state rather than fire on an action — it looks for events that are approved, have a submitter address, and have not yet been told. That means approval can happen anywhere, nobody gets told twice, and nobody is forgotten. `src/routes/[lang]/submit/`, `src/routes/admin/submissions/`, `scripts/notify-submitters.ts`.

### Door two — send in your programme page

For anyone who already keeps their own calendar: a venue, a theatre, a library, a festival, a club.

You send me the address of the page where your programme already lives, and ask for it to be collected. From then on it happens every day, automatically, and you do nothing.

This is the part worth explaining slowly in the case study, because the design principle is the interesting bit:

> **I am not asking them to change their habits. I am asking them to tell me where their workflow already is, so I can meet it there.**

Every aggregator that fails does so by asking organisers to do double work — log into another system, re-enter what they already published, keep two calendars in sync. They will not, and they should not have to. So the burden sits on my side: I write the integration against their page, and I maintain it when they redesign it. Their side of the arrangement is a single email.

*Verified:* the submission page offers this as an explicit second path, and it lands in a separate organiser inquiries table rather than in the event queue. `src/routes/[lang]/submit/+page.svelte`, `organizer_inquiries` table.

### Door three — the open door

Whatever happens after that, there is a way to reach me and a way to change things.

- Something is wrong on your listing — there is a correction form on every single event.
- You want something added, or presented differently — ask.
- You want your image used differently, or not at all — ask.
- You want out entirely — there is an opt-out, and it works at the level of your whole domain, not one event at a time.
- You just have a question — the door is open.

And it is all visible from the outside: a public page explains exactly what is collected, how, how often, and how to stop it. Nobody has to guess, and nobody has to ask me to find out.

*Verified:* correction flow on event pages, `opt_out_requests` and `edit_suggestions` tables, the public data-collection page at `/[lang]/datainnsamling/`, and the opt-out list applied on every pipeline run before anything is written.

### All three channels, free

Being on the site is free. Being in the newsletter is free. Being posted on social media is free.

*One nuance the portfolio agent must not flatten:* social posting is free, but it is not automatic or unlimited. There is a fairness rule so no single venue dominates the feed, and active promotion of a venue's own photographs requires their written permission. Free of charge is not the same as free of rules, and the rules exist to protect the organisers, not to ration the service. Say it accurately.

---

## 3. The visitor side

### What you get before you do anything

The page opens with what is happening next, in chronological order. Not an algorithm, not a ranking, not what someone paid to put there. The next thing happening in Bergen, then the one after that.

That is the honest default, and it is the one that serves someone standing on a street corner at six in the evening.

*Verified:* the listing is ordered by start date ascending on the server, with ongoing multi-day events handled separately so a three-week exhibition does not sit permanently at the top. `src/routes/[lang]/+page.server.ts`.

### Then you shape it to yourself

If that is not what you are looking for, you tell the page who you are today: family, young people, students, adults, someone out for the nightlife, a visitor to the city. Then when, then what kind of thing, then where in the city.

**The design premise underneath it:** people are not personas. The same person is a parent on Saturday morning, a student on Tuesday, and out with friends on Friday night. The interface asks *who is this for, right now* — a question about the occasion — rather than assuming a fixed identity and remembering it.

### Each audience is hand-built

This is a detail worth showing, because it looks like a simple filter and is not.

There is no field in the data that says "this is for students". Each audience is a classifier written by hand: it combines the age group where a source provided one, the category, the venue, and pattern matching against the Norwegian title and description — including the exclusions, so an event marked 18+ can never surface under family, and a family event never surfaces under adults.

The youth classifier alone matches a dozen ways Norwegian sources write "for young people", including age ranges written as text. That is not a filter. That is a taxonomy she built because the source data does not contain one.

*Verified:* `src/lib/components/EventDiscovery.svelte` and `src/lib/utils.ts` — the audience counting logic, with its per-audience rules and exclusions.

### The landing pages serve people and search at the same time

Curated pages for the things people actually want: what is on this weekend, family weekend, free things to do, a rainy day, each district of the city, and each point in the year — midsummer, Christmas markets, Easter, the winter break, New Year's Eve.

These do two jobs at once, and both are real:

- **For a person**, they are a shortcut. Someone who wants "something to do with the kids this weekend" gets a page that answers exactly that, with editorial copy, rather than a filter they have to construct themselves.
- **For search**, they are the answer to a query someone is typing right now. Including AI assistants, which are increasingly where the question gets asked.

The seasonal ones have real filter logic behind them, not a hardcoded list — the Easter page calculates Easter, the midsummer page knows the celebration is held the weekend before the actual date, the winter-break page resolves the correct school week. They work every year without being rebuilt.

*Verified:* `src/lib/collections.ts` — the seasonal filters compute their own date windows.

---

## 4. Why the two sides need each other

The clean summary for the case study:

The visitors are only served if the listing is complete. The listing is only complete if organisers of every size are in it. Organisers of every size will only be in it if being in it costs nothing and demands nothing. So the free, open, low-friction relationship with organisers is not a nice gesture on the side of the product — it *is* the product, seen from the other end.

That is the sentence the whole thing hangs on, and it is worth landing properly.

---

## 5. Accuracy — read before writing

**The commercial layer.** No promoted placement is currently running and there are no paying customers. There is a subscription model designed and built, and a referral model under consideration, but neither is live. Say nothing about either. See the accuracy note in `PORTFOLIO-SKILLS-INVENTORY.md` §2A.

**The organiser marketing page is not reachable.** Both language routes redirect to the homepage, the footer link is commented out, and the page is absent from the sitemap — hidden since April 2026. A monthly price still exists in that page's source, but nothing renders it, so there is no contradiction visible to a reader. Do not describe the page as part of the live product, and do not quote its prices.

**"Free" needs one qualifier.** Free to be listed, free in the newsletter, free on social. But social posting has fairness limits and a permission requirement for photographs. State it accurately; it makes the ethics section stronger rather than weaker.

**The town-square argument is Kjersti's, not received wisdom.** Write it as her position — "I think", "the premise I built on" — rather than as an established principle of platform design. It is more persuasive as a conviction she can defend than as a claim borrowed from somewhere.

---

## 6. Phrases worth keeping

These came out of her own account and are better than anything a rewrite would produce. Keep them close to verbatim:

- *A digital town square.*
- *The space itself has to be free to enter in order for the space to work.*
- *I am not asking them to change their habits — I am asking them to tell me where their workflow already is.*
- *Everything in one place, and easy to find.*
- *All of them benefit from each other.*
