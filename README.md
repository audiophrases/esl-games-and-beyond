# ESL Games and Beyond

A student-facing index of the language games, practice tools, and class resources published by [audiophrases](https://github.com/audiophrases).

One page, one grid, one card per activity: a picture, a name, and a single line saying what you do. No headline, no filters, tags, levels, or status badges to work through first — the activities start straight away. If something needs a microphone, a class code, or a school account, that single line says so.

## The catalog

Every card lives in [`projects.json`](projects.json) and has exactly six fields:

| Field | What it is |
| --- | --- |
| `id` | Short slug, also the name of the cover image |
| `title` | The name shown on the card |
| `blurb` | One sentence, 160 characters at most |
| `url` | Where the card opens |
| `image` | Cover image, normally `assets/covers/<id>.webp`. A hidden card may go without one; a visible card may not |
| `hidden` | `true` keeps it off the public page |

Which activities are hidden changes as you work — admin mode decides it, and the `hidden` flags in `projects.json` are the record. Don't look for the list here, it will be out of date. WordMine and Go2Town started hidden because they are local desktop prototypes with nothing to open yet.

The longer notes about what each activity needs before you start live in [`docs/project-inventory.md`](docs/project-inventory.md) rather than on the cards.

## Diary

Every other card points at its own repository. [`diary/`](diary/) is the exception: a small app that lives here and is served from the same site at `/esl-games-and-beyond/diary/`. It is self-contained — three files, no build, no dependencies — so it can be lifted into its own repository later by moving the folder and changing one URL in `projects.json`.

It is a journal shaped like a messenger: the familiar chat layout, because it is a pleasant thing to write into. Entries can be typed, spoken as a voice note, or photographed, and the diary opens each day with a prompt so there is something to answer. Everything is held in the browser (IndexedDB) and never uploaded, which is why an invite can only carry a diary's name and prompt — enough for a class to keep the same journal, never anyone's entries.

The look borrows the conventions of a chat app; it carries no one else's name, logo or branding.

## Admin mode

Three Google accounts can edit the catalog from the site itself — `eugenimonfort@iecomaruga.cat`, `eugenime@gmail.com`, and `emonfor3@xtec.cat`. This works the same way as English Hub: [`auth.js`](auth.js) checks the account, [`admin.js`](admin.js) commits the change.

1. Click **Admin** in the footer and sign in with Google.
2. Hidden activities appear alongside the rest, dimmed and outlined.
3. Each card gains **Edit**, **Hide** / **Show**, and arrows to move it. The bar adds **Add activity**.
4. **Publish to GitHub** commits `projects.json`. GitHub Pages redeploys within a minute or so.
5. **Done** returns to the visitor's view while staying signed in, so the footer **Admin** link comes straight back without another trip through Google. It reloads the published catalog, so anything unpublished is dropped — it asks first. **Sign out** ends the session and forgets the token.

Nothing is saved until you publish, and leaving the page with unpublished changes asks first. A new card that you cancel out of is dropped again rather than left behind untitled, and its `id` follows the title you type unless you set one yourself.

Publishing refuses to commit a card with no title or link, or a *visible* card with no image — that file is what the whole site reads, so a broken card must not reach it.

### The GitHub token

The first publish asks for a token and keeps it in `sessionStorage` for that tab only — it is never written into the page or the repo. Create a fine-grained token at [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):

- Repository access → Only select repositories → `esl-games-and-beyond`
- Permissions → Repository permissions → Contents → Read and write
- A short expiry; mint another when it lapses.

If GitHub refuses the token — expired, wrong scope, wrong repository — it is forgotten straight away and the next publish asks for a new one, so a bad paste never locks you out of the tab.

### Google origins

The sign-in reuses the OAuth client shared with PinPlay and English Hub, and `https://audiophrases.github.io` is already an authorised JavaScript origin on it, so the live site needs no console work.

To use admin mode on `npm run serve`, add `http://127.0.0.1:8080` under **Authorised JavaScript origins** for the web client ending `...8aacskg99idu0uqnbr181id33gf8fet4` in the [Google Cloud console](https://console.cloud.google.com/apis/credentials). Add — do not replace — the origins already there, or you will break PinPlay and English Hub.

The sign-in check runs in the browser, so it is a courtesy lock that keeps admin controls away from students, not real security. The catalog is public anyway; the GitHub token is what actually gates publishing.

## Run locally

```bash
npm install
npm run serve
```

Open <http://127.0.0.1:8080>. The site has no build step and no runtime dependencies; `playwright-core` is only used for the local screenshot and browser checks.

## Verify

```bash
npm run validate
npm test
npm run serve          # the browser checks need the site running
npm run test:browser
npm run test:admin
npm run test:diary
```

`npm run validate` checks the schema of every card, the URLs, the local cover files, and the landmarks the page needs. The unit tests check size, uniqueness, blurb length, the admin allow-list, and that no token was ever committed.

`npm run test:browser` drives the visitor's page in Microsoft Edge: desktop and phone layouts, and that hidden activities never reach the markup a visitor receives.

`npm run test:admin` drives admin mode against a **mocked** GitHub API — it never reaches github.com and needs no token. It covers editing, hiding, showing, reordering, adding, cancelling an add, the refusal to publish a broken card, the contents of the commit itself, and leaving admin mode and coming back without signing out. It also walks the three ways publishing fails: a token GitHub rejects, a token for the wrong repository (which fails before any commit is attempted), and a conflict with someone else's publish — the one refusal that keeps your token rather than forgetting it.

`npm run test:diary` drives Diary, the one app that lives in this repository rather than its own (see above), through all four of its input methods, plus reactions, search, an invite link and surviving a reload.

## Refresh the preview images

```bash
npm run screenshots
```

The capture script reads `projects.json` and opens each web app in Microsoft Edge at 1280×800, saving PNGs under `assets/screens/`. Repository links are skipped — there is no app to photograph. Because it follows the catalog, an activity you add through admin mode gets a capture without anyone editing the script. The optimized covers live in `assets/covers/`; refresh those from the captures when an app changes substantially.

WordMine and Go2Town use representative images from their local project folders because they have no public web build. Do not copy the Go2Town Street View fixture dataset into this repository.

## Deployment

A plain static site: GitHub Pages serves the repository root from `main` with no workflow. Before deploying, run `npm run validate && npm test` and open the site at desktop and phone widths.
