# ESL Games and Beyond

A student-facing visual index for the language games, practice tools, and class resources published by [audiophrases](https://github.com/audiophrases).

The site is intentionally a curated catalog rather than an automatic repository list. Every card explains what the learner will do, what the activity practices, and whether it needs a class code, microphone, shared device, school account, or local installation.

## What is included

- Search across titles, descriptions, levels, and access notes.
- Filters for language skills and working format (solo, group, or class).
- Sixteen verified catalog entries with local WebP preview images.
- Clear states for public activities, class links, school access, and desktop prototypes.
- A detail dialog with “how it helps,” level, format, and access information.
- Responsive keyboard-accessible layouts with reduced-motion support.
- A source inventory explaining launch choices and holdbacks: [`docs/project-inventory.md`](docs/project-inventory.md).

## Run locally

```bash
npm install
npm run serve
```

Open <http://127.0.0.1:8080>.

The website itself has no runtime dependencies or build step. `playwright-core` is used only for local screenshot capture and browser checks.

## Verify

```bash
npm run validate
npm test
npm run test:browser
```

`npm run validate` checks the catalog schema, URLs, filter tags, required HTML landmarks, and every local cover asset. The unit tests check catalog size, uniqueness, student-facing copy, filter coverage, and honest prototype links. The browser test uses the installed Microsoft Edge browser to verify desktop and phone layouts, search/filter combinations, the details dialog, visible actions, and a clean console.

## Refresh the preview images

```bash
npm run screenshots
```

The capture script opens each public app in the installed Microsoft Edge browser at 1280×800 and saves PNG captures under `assets/screens/`. The optimized catalog images live in `assets/covers/`; refresh those from the captures before publishing if an app changes substantially.

WordMine and Go2Town use representative images from their local project folders because they do not have public web builds. Do not copy the Go2Town Street View fixture dataset into this repository.

## Edit the catalog

Project records live in [`data.js`](data.js). Each entry includes:

- student-facing title, summary, detail, and learning purpose;
- focus and format tags used by the filters;
- level and access requirements;
- public, class, school, or prototype status;
- activity URL, source URL, and local cover image.

After editing `data.js`, run the full verification commands above.

## Deployment

This is a plain static site. GitHub Pages can serve the repository root from `main` with no build workflow. Before deployment:

1. Run `npm run validate && npm test`.
2. Open the site at desktop and phone widths.
3. Test every “open” link that will be visible to students.
4. Confirm prototype cards still point to source pages rather than pretending to be public games.

## Repository scope

All implementation files for this project live in `C:/Users/Admin/esl-games-and-beyond`. The existing projects were inspected for content and screenshots but were not modified.
