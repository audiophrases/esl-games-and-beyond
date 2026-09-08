# ESL Games and Beyond

A student-facing index of the language games, practice tools, and class resources published by [audiophrases](https://github.com/audiophrases).

One page, one grid, one card per activity: a picture, a name, and a single line saying what you do. There are no filters, tags, levels, or status badges to work through first — if something needs a microphone, a class code, or a school account, that line says so.

## The catalog

Every card lives in [`projects.json`](projects.json) and has exactly six fields:

| Field | What it is |
| --- | --- |
| `id` | Short slug, also the name of the cover image |
| `title` | The name shown on the card |
| `blurb` | One sentence, 160 characters at most |
| `url` | Where the card opens |
| `image` | Cover image, normally `assets/covers/<id>.webp` |
| `hidden` | `true` keeps it off the public page |

WordMine and Go2Town ship hidden: they are local desktop prototypes with nothing to open yet. Unhide them from admin mode when they are ready.

The longer notes about what each activity needs before you start live in [`docs/project-inventory.md`](docs/project-inventory.md) rather than on the cards.

## Admin mode

Three Google accounts can edit the catalog from the site itself — `eugenimonfort@iecomaruga.cat`, `eugenime@gmail.com`, and `emonfor3@xtec.cat`. This works the same way as English Hub: [`auth.js`](auth.js) checks the account, [`admin.js`](admin.js) commits the change.

1. Click **Admin** in the footer and sign in with Google.
2. Hidden activities appear alongside the rest, dimmed and outlined.
3. Each card gains **Edit**, **Hide** / **Show**, and arrows to move it. The bar adds **Add activity**.
4. **Publish to GitHub** commits `projects.json`. GitHub Pages redeploys within a minute or so.

Nothing is saved until you publish, and leaving the page with unpublished changes asks first.

### The GitHub token

The first publish asks for a token and keeps it in `sessionStorage` for that tab only — it is never written into the page or the repo. Create a fine-grained token at [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):

- Repository access → Only select repositories → `esl-games-and-beyond`
- Permissions → Repository permissions → Contents → Read and write
- A short expiry; mint another when it lapses.

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
npm run test:browser
```

`npm run validate` checks the schema of every card, the URLs, the local cover files, and the landmarks the page needs. The unit tests check size, uniqueness, blurb length, the admin allow-list, and that no token was ever committed. The browser test uses the installed Microsoft Edge to check desktop and phone layouts, confirms hidden activities never reach the markup a visitor receives, and confirms the admin door opens but stays shut.

## Refresh the preview images

```bash
npm run screenshots
```

The capture script opens each public app in Microsoft Edge at 1280×800 and saves PNGs under `assets/screens/`. The optimized covers live in `assets/covers/`; refresh those from the captures when an app changes substantially.

WordMine and Go2Town use representative images from their local project folders because they have no public web build. Do not copy the Go2Town Street View fixture dataset into this repository.

## Deployment

A plain static site: GitHub Pages serves the repository root from `main` with no workflow. Before deploying, run `npm run validate && npm test` and open the site at desktop and phone widths.
