export const projects = [
  {
    id: 'pinplay', title: 'PinPlay', kicker: 'Quiz room',
    summary: 'Join a teacher’s live quiz or complete an assignment with audio, speech, images, matching, and more.',
    detail: 'PinPlay turns one teacher-made quiz into a live class game or a self-paced assignment. Your teacher gives you the link or six-digit PIN.',
    helps: 'Practice any mix of listening, speaking, reading, and writing with clear feedback.',
    focus: ['Games', 'Listening', 'Speaking'], modes: ['Class', 'Solo'], level: 'Teacher chooses',
    access: 'Class code or assignment link', status: 'class', action: 'Join with a PIN',
    url: 'https://audiophrases.github.io/pinplay/', source: 'https://github.com/audiophrases/pinplay', image: 'assets/covers/pinplay.webp', featured: true
  },
  {
    id: 'dictation-time', title: 'Dictation Time', kicker: 'Listen closely',
    summary: 'Listen to a sentence, type what you hear, and compare your answer word by word.',
    detail: 'Choose a language, use a lesson or fetch a short passage, then work through it one sentence at a time. Teachers can also share assignments.',
    helps: 'Train careful listening, spelling, punctuation, and the small words that are easy to miss.',
    focus: ['Listening', 'Writing'], modes: ['Solo', 'Class'], level: 'A1–B1+',
    access: 'Free practice; some voices may need a short wake-up', status: 'public', action: 'Practice dictation',
    url: 'https://audiophrases.github.io/DictationApp/', source: 'https://github.com/audiophrases/DictationApp', image: 'assets/covers/dictation-time.webp'
  },
  {
    id: 'read-listen-speak', title: 'Read · Listen · Speak', kicker: 'Pronunciation lab',
    summary: 'Hear short sentences, read them aloud, and see which words your browser recognized.',
    detail: 'Practice prepared lessons or paste your own text. The app pairs natural voices with speech recognition and includes teacher assignments.',
    helps: 'Build pronunciation, reading fluency, and confidence through repeatable short takes.',
    focus: ['Speaking', 'Listening', 'Pronunciation'], modes: ['Solo', 'Class'], level: 'A1–B1+',
    access: 'Microphone recommended', status: 'public', action: 'Start speaking',
    url: 'https://audiophrases.github.io/speechtoipa/', source: 'https://github.com/audiophrases/speechtoipa', image: 'assets/covers/read-listen-speak.webp'
  },
  {
    id: 'watchword', title: 'Watchword', kicker: 'One clue. One word.',
    summary: 'Give your team a one-word clue and race to guess as many secret words as you can.',
    detail: 'Set up teams, choose levels and categories, then pass one device to each clue-giver. Every team gets its own timed turn.',
    helps: 'Recall vocabulary quickly, make connections between words, and explain without translating.',
    focus: ['Games', 'Speaking', 'Vocabulary'], modes: ['Group'], level: 'A0–C2',
    access: 'One shared phone, tablet, or computer', status: 'public', action: 'Play Watchword',
    url: 'https://audiophrases.github.io/Watchword/', source: 'https://github.com/audiophrases/Watchword', image: 'assets/covers/watchword.webp', featured: true
  },
  {
    id: 'impostor', title: 'Impostor', kicker: 'Secret-word game',
    summary: 'Most players see the same secret word. The impostor gets a related clue and must blend in.',
    detail: 'Enter the players, choose a level and category, and pass the device for private reveals. Then talk, question, and work out who is bluffing.',
    helps: 'Practice descriptions, follow-up questions, and precise vocabulary in a social game.',
    focus: ['Games', 'Speaking', 'Vocabulary'], modes: ['Group'], level: 'A0–C2',
    access: 'One shared device', status: 'public', action: 'Find the impostor',
    url: 'https://audiophrases.github.io/impostor/', source: 'https://github.com/audiophrases/impostor', image: 'assets/covers/impostor.webp'
  },
  {
    id: 'snakes-ladders', title: 'Snakes & Ladders', kicker: 'Classroom board game',
    summary: 'Roll, move, and complete speaking, translation, or error-correction challenges.',
    detail: 'A familiar board game with live classroom tasks. It supports several players and mixes speaking, Catalan–English translation, and grammar repair.',
    helps: 'Turn revision questions into a shared game with lots of short speaking turns.',
    focus: ['Games', 'Speaking', 'Grammar'], modes: ['Group', 'Class'], level: 'Teacher chooses',
    access: 'Best on a projector or large screen', status: 'public', action: 'Start the board game',
    url: 'https://audiophrases.github.io/snakesandladders/', source: 'https://github.com/audiophrases/snakesandladders', image: 'assets/covers/snakes-ladders.webp'
  },
  {
    id: 'grammar-studio', title: 'ESL Grammar Studio', kicker: 'Grammar map',
    summary: 'Browse grammar points by level, read a plain explanation, and try focused practice.',
    detail: 'Search by title or tag, filter the syllabus by CEFR level, and open a grammar point for examples and exercises. English and Catalan views are available.',
    helps: 'Connect individual rules to a larger grammar map and practice one point at a time.',
    focus: ['Grammar', 'Reading'], modes: ['Solo'], level: 'A1–B2',
    access: 'Loads lesson data from Google Sheets', status: 'public', action: 'Explore grammar',
    url: 'https://audiophrases.github.io/grammar/', source: 'https://github.com/audiophrases/grammar', image: 'assets/covers/grammar-studio.webp'
  },
  {
    id: 'irregular-verbs', title: 'Irregular Verb Coach', kicker: 'Study and review',
    summary: 'Filter, hear, study, and quiz yourself on English irregular verb forms.',
    detail: 'Build a study set by frequency, theme, or pattern. Use flashcards for a quick review or a tracked quiz that remembers your difficult verbs.',
    helps: 'Move from recognizing forms to recalling them, with Catalan meanings and audio support.',
    focus: ['Grammar', 'Vocabulary', 'Listening'], modes: ['Solo'], level: 'A1–B2',
    access: 'Progress stays on this device', status: 'public', action: 'Practice verbs',
    url: 'https://audiophrases.github.io/irregularverbs/', source: 'https://github.com/audiophrases/irregularverbs', image: 'assets/covers/irregular-verbs.webp'
  },
  {
    id: 'prepositions', title: 'Prepositions Practice', kicker: 'Small words, clear patterns',
    summary: 'Review common uses of English prepositions, then try three kinds of exercise.',
    detail: 'The guide groups prepositions by time, place, movement, and other common uses. Practice with multiple choice, fill-in-the-blank, and drag-and-drop tasks.',
    helps: 'Notice useful patterns and get immediate feedback without a long grammar lecture.',
    focus: ['Grammar', 'Writing'], modes: ['Solo'], level: 'A1–B1',
    access: 'Works in any modern browser', status: 'public', action: 'Practice prepositions',
    url: 'https://audiophrases.github.io/prepositions/', source: 'https://github.com/audiophrases/prepositions', image: 'assets/covers/prepositions.webp'
  },
  {
    id: 'ga-phonetics', title: 'General American Phonetics', kicker: 'Sound chart',
    summary: 'Tap through the vowel and consonant charts and hear sounds in example words.',
    detail: 'An interactive reference for General American English. Explore where each sound sits, open examples, and listen to the available recordings.',
    helps: 'Compare similar sounds and connect IPA symbols with words you already know.',
    focus: ['Pronunciation', 'Listening'], modes: ['Solo'], level: 'All levels',
    access: 'Some audio buttons depend on available recordings', status: 'public', action: 'Open the sound chart',
    url: 'https://audiophrases.github.io/GAPhonetics/', source: 'https://github.com/audiophrases/GAPhonetics', image: 'assets/covers/ga-phonetics.webp'
  },
  {
    id: 'babble-bazaar', title: 'Babble Bazaar', kicker: 'Audio-first shop',
    summary: 'Listen to a customer’s order, find or prepare the items, and hand them over.',
    detail: 'A pixel-art shopkeeper game with spoken requests and almost no written language during play. Orders grow from single objects to quantities, descriptions, placement, and kitchen actions.',
    helps: 'Turn everyday English into actions: find, carry, wash, cut, heat, and serve.',
    focus: ['Games', 'Listening', 'Vocabulary'], modes: ['Solo'], level: 'A1–B1 bridge',
    access: 'Keyboard recommended', status: 'public', action: 'Open the shop',
    url: 'https://audiophrases.github.io/babblebazaar/', source: 'https://github.com/audiophrases/babblebazaar', image: 'assets/covers/babble-bazaar.webp'
  },
  {
    id: 'number-mania', title: 'Number Mania', kicker: 'Beyond English',
    summary: 'Climb an adaptive arithmetic ladder by answering aloud or with the keypad.',
    detail: 'Practice addition, subtraction, multiplication, and division. The game remembers difficult facts and adjusts the challenge. The interface supports English, Catalan, and French.',
    helps: 'Practice number language while strengthening arithmetic fluency.',
    focus: ['Beyond', 'Speaking', 'Games'], modes: ['Solo'], level: 'Adaptive',
    access: 'Microphone optional', status: 'public', action: 'Start a number climb',
    url: 'https://audiophrases.github.io/Multiplication-Game/', source: 'https://github.com/audiophrases/Multiplication-Game', image: 'assets/covers/number-mania.webp'
  },
  {
    id: 'pdf-library', title: 'Class PDF Library', kicker: 'Handouts and reading',
    summary: 'Browse classroom PDF collections as a visual shelf instead of a list of filenames.',
    detail: 'Each collection shows first-page thumbnails, so it is easier to recognize the worksheet, reading, or reference you need.',
    helps: 'Keep useful class materials in one place and reopen them on any device.',
    focus: ['Reading', 'Beyond'], modes: ['Solo', 'Class'], level: 'Mixed',
    access: 'Available collections depend on the shared link', status: 'public', action: 'Browse PDFs',
    url: 'https://audiophrases.github.io/pdfgallery/', source: 'https://github.com/audiophrases/pdfgallery', image: 'assets/covers/pdf-library.webp'
  },
  {
    id: 'english-hub', title: 'English Hub', kicker: 'School portal',
    summary: 'Open your 3rd or 4th ESO syllabus, unit materials, vocabulary tools, and final tasks.',
    detail: 'A private course portal for IE Coma-ruga. It organizes the year by class and unit, with direct routes to the material used in lessons.',
    helps: 'Find the right class resource without searching through old messages or folders.',
    focus: ['Reading', 'Grammar', 'Vocabulary'], modes: ['Class', 'Solo'], level: '3rd–4th ESO',
    access: 'Authorized school Google account required', status: 'school', action: 'Sign in to English Hub',
    url: 'https://audiophrases.github.io/English-Hub/', source: 'https://github.com/audiophrases/English-Hub', image: 'assets/covers/english-hub.webp'
  },
  {
    id: 'wordmine', title: 'WordMine', kicker: 'Desktop preview',
    summary: 'Hear a short instruction, look around a peaceful 3D room, and act on what you understood.',
    detail: 'A no-pressure desktop prototype built around Listen, Aim, Act. Learners touch, place, take, drop, and give objects across seven-level courses in six languages.',
    helps: 'Build comprehension through physical actions instead of translating or reading prompts.',
    focus: ['Listening', 'Games', 'Beyond'], modes: ['Solo'], level: 'A1–A2',
    access: 'Local Windows prototype; not yet playable on the web', status: 'prototype', action: 'View the source',
    url: 'https://github.com/audiophrases/wordmine', source: 'https://github.com/audiophrases/wordmine', image: 'assets/covers/wordmine.webp'
  },
  {
    id: 'go2town', title: 'Go2Town', kicker: 'Desktop preview',
    summary: 'Follow Coco the seagull through Coma-ruga and complete short spoken walking missions.',
    detail: 'An immersive 360-degree ESL prototype. Coco gives natural spoken prompts while the learner walks a vetted route through a real beach town.',
    helps: 'Connect listening with movement, place, direction, and simple real-world missions.',
    focus: ['Listening', 'Games', 'Beyond'], modes: ['Solo'], level: 'A1–A2',
    access: 'Local prototype; Google Street View setup required', status: 'prototype', action: 'View the source',
    url: 'https://github.com/audiophrases/go2town', source: 'https://github.com/audiophrases/go2town', image: 'assets/covers/go2town.webp'
  }
];

export const focusOptions = ['All', 'Games', 'Listening', 'Speaking', 'Pronunciation', 'Grammar', 'Vocabulary', 'Reading', 'Writing', 'Beyond'];
export const modeOptions = ['All', 'Solo', 'Group', 'Class'];
