# Project inventory and launch choices

This inventory separates a useful student catalog from a raw list of repositories. A repository is not automatically a good card: students need to know what an activity does, whether it opens now, and what they need before starting.

## Included in the catalog

The cards themselves carry only a picture, a name, and one line. The access notes below are the background record of why each project was included, not the live state of the site: which cards are visible is decided in admin mode and recorded by the `hidden` flags in `projects.json`.

| Project | Place in the catalog | Access note |
| --- | --- | --- |
| PinPlay | Teacher-led quiz room and assignments | A PIN or assignment link is normally required |
| Dictation Time | Listening and writing practice | Public free-practice mode |
| Read · Listen · Speak (`speechtoipa`) | Pronunciation and reading aloud | Public; microphone recommended |
| Watchword | One-word-clue team game | Public; one shared device |
| Impostor | Secret-word speaking game | Public; one shared device |
| Snakes & Ladders | Classroom revision board game | Public; best on a large screen |
| ESL Grammar Studio | Searchable grammar map and exercises | Public; live lesson data |
| Irregular Verb Coach | Audio study sets, flashcards, and tracked practice | Public; progress is local to the device |
| Prepositions Practice | Guide plus three practice formats | Public |
| General American Phonetics | Interactive sound chart | Public; some recordings may be unavailable |
| Babble Bazaar | Audio-first shopkeeper game | Public; keyboard recommended |
| Number Mania | Adaptive arithmetic with spoken or typed answers | Public; included under “Beyond” |
| Password: Alphabet Race | Audio-first A–Z vocabulary game for individuals or teams | Public; speech recognition works best in Chrome or Edge |
| English Hub | Private 3rd/4th ESO course portal | Authorized school Google account required |
| WordMine | Peaceful 3D listening and action game | Local desktop prototype; source link only |
| Go2Town | 360-degree spoken walking missions in Coma-ruga | Local prototype; source link only |

## Strong candidates for a later section

| Project | Why it could fit | Why it is not in the first catalog |
| --- | --- | --- |
| Speak Up | Illustrated practical phrasebook with Catalan meaning checks and pronunciation links | Publication-ready local HTML/PDF resource, but no public URL or configured remote was found; its package metadata also trails the current release version |
| Vocab | Opens several English and Catalan dictionaries from one search | The live page currently reports a JavaScript parse error (`Unexpected token ':'`); repair and retest before sending students there |
| PDF Gallery | Visual gallery of class career-project PDFs | Privacy hold: the public manifest exposes identifiable student names in PDF filenames; review consent and filenames before promoting it |
| Classroom Screen | Keeps lesson material in view and lets a teacher monitor class focus | M0 scaffold and teacher workflow rather than a stand-alone student activity |
| Symbl | Eight adaptive literacy and numeracy mini-games with offline speech | Android app, not a web app; it needs an install/download route and representative screenshots |
| Ressources EOI B1 | Existing B1 resource collection | Needs a content audit and clearer relationship to the current ESO audience |
| Interactive Arabic Alphabet | Interactive keyboard and text-to-speech alphabet practice | Good “other languages” candidate once the site has a dedicated languages shelf |
| La question | Visual French question-formation map | Good “other languages” candidate; outside the initial ESL focus |
| Décrire une personne | French description practice | Good “other languages” candidate; several overlapping versions need consolidation |
| Conjugaisons / être au présent | French conjugation references | Useful only after overlapping and older pages are grouped into one French collection |
| YourLines chess suite | Strong browser-based chess study tools | Not currently connected to language learning or classroom materials |

## Holdbacks and duplicates

- Watchword and Password are separate games: Watchword uses one-word clues for secret answers, while Password races around an A–Z circle using spoken definitions. Both belong in the catalog.
- The standalone chess repositories are represented by YourLines when a future “Beyond” shelf is expanded; listing every sub-app would overwhelm the language collection.
- Older one-page French activities should become a collection rather than many nearly identical cards.
- Private/admin repositories, setup bridges, deployment tools, banking experiments, and infrastructure repositories are not student resources.
- Repository names with an `index.html` file but no clear learner purpose are not included automatically.

## Content principles

1. Write to the learner, not to a developer.
2. Say what happens in the first minute of use.
3. Mark class codes, school sign-in, microphones, shared devices, and desktop-only builds before the learner opens a link.
4. Never label a local prototype “Play now.”
5. Prefer one strong entry for a family of overlapping tools.
6. Retest public links before publishing the catalog.
