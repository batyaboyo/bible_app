// ========================================
// Global State & Configuration
// ========================================

const API_BASE = 'https://bible.helloao.org/api';

const APP_STATE = {
    currentPage: 'home',
    currentBook: null,
    currentChapter: null,
    currentVersion: 'BSB',
    currentCommentary: '',
    bookmarks: [],
    darkMode: false,
    dailyVerse: null,
    searchTimeout: null,
    toastTimeout: null,
    highlights: {},        // { "John 3:16": { color: "yellow", note: "..." } }
    readingProgress: {},   // { "GEN": [1,2,3], "MAT": [1,5] }
    collections: ['Favorites', 'Promises', 'Comfort'],  // default collections
    activeCollection: 'all'
};

// Dynamically loaded data
let TRANSLATIONS = [];
let BIBLE_BOOKS = { oldTestament: [], newTestament: [] };
let COMMENTARIES = [];

// Maps old bible-api.com version IDs → HelloAO IDs for migration
const VERSION_MIGRATION = {
    'kjv': 'BSB',
    'web': 'eng_web',
    'webbe': 'eng_webc',
    'bbe': 'eng_bbe',
    'oeb-us': 'BSB',
    'oeb-cw': 'BSB',
    'clementine': 'BSB',
    'almeida': 'BSB',
    'rpierce': 'BSB'
};

// Fallback translations if API is unreachable
const FALLBACK_TRANSLATIONS = [
    { id: 'BSB', name: 'Berean Standard Bible', shortName: 'BSB', language: 'eng' },
    { id: 'ENGWEBP', name: 'World English Bible', shortName: 'WEB', language: 'eng' },
    { id: 'eng_bbe', name: 'Bible in Basic English', shortName: 'BBE', language: 'eng' },
    { id: 'eng_web', name: 'World English Bible Classic', shortName: 'WEB-C', language: 'eng' }
];

// Book name → HelloAO ID mapping for verse reference parsing
const BOOK_NAME_TO_ID = {
    'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM',
    'Deuteronomy': 'DEU', 'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT',
    '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI',
    '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH',
    'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Psalm': 'PSA',
    'Proverbs': 'PRO', 'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG',
    'Isaiah': 'ISA', 'Jeremiah': 'JER', 'Lamentations': 'LAM',
    'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS', 'Joel': 'JOL',
    'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON', 'Micah': 'MIC',
    'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG',
    'Zechariah': 'ZEC', 'Malachi': 'MAL',
    'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN',
    'Acts': 'ACT', 'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO',
    'Galatians': 'GAL', 'Ephesians': 'EPH', 'Philippians': 'PHP',
    'Colossians': 'COL', '1 Thessalonians': '1TH', '2 Thessalonians': '2TH',
    '1 Timothy': '1TI', '2 Timothy': '2TI', 'Titus': 'TIT', 'Philemon': 'PHM',
    'Hebrews': 'HEB', 'James': 'JAS', '1 Peter': '1PE', '2 Peter': '2PE',
    '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', 'Jude': 'JUD',
    'Revelation': 'REV'
};

// Popular verses for daily rotation
const POPULAR_VERSES = [
    { ref: 'John 3:16', bookId: 'JHN', chapter: 3, verse: 16 },
    { ref: 'Philippians 4:13', bookId: 'PHP', chapter: 4, verse: 13 },
    { ref: 'Jeremiah 29:11', bookId: 'JER', chapter: 29, verse: 11 },
    { ref: 'Proverbs 3:5-6', bookId: 'PRO', chapter: 3, startVerse: 5, endVerse: 6 },
    { ref: 'Romans 8:28', bookId: 'ROM', chapter: 8, verse: 28 },
    { ref: 'Psalm 23:1', bookId: 'PSA', chapter: 23, verse: 1 },
    { ref: 'Isaiah 41:10', bookId: 'ISA', chapter: 41, verse: 10 },
    { ref: 'Matthew 6:33', bookId: 'MAT', chapter: 6, verse: 33 },
    { ref: 'Joshua 1:9', bookId: 'JOS', chapter: 1, verse: 9 },
    { ref: 'Psalm 46:1', bookId: 'PSA', chapter: 46, verse: 1 },
    { ref: 'Romans 12:2', bookId: 'ROM', chapter: 12, verse: 2 },
    { ref: 'Proverbs 16:3', bookId: 'PRO', chapter: 16, verse: 3 },
    { ref: '1 Corinthians 10:13', bookId: '1CO', chapter: 10, verse: 13 },
    { ref: 'Galatians 5:22-23', bookId: 'GAL', chapter: 5, startVerse: 22, endVerse: 23 },
    { ref: 'Matthew 5:14-16', bookId: 'MAT', chapter: 5, startVerse: 14, endVerse: 16 }
];

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Load saved state first
    loadState();

    // Initialize UI components that don't depend on API data
    initializeNavigation();
    initializeThemeToggle();
    initializeMobileMenu();
    initializeSearch();
    initializeKeyboardShortcuts();

    // Apply initial theme
    applyTheme();

    // Set dynamic copyright year
    const yearEl = document.getElementById('copyright-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Load API data
    await loadTranslations();
    await loadBooks();
    await loadCommentariesList();

    // Initialize selectors (depends on loaded data)
    initializeVersionSelector();
    initializeCommentarySelector();

    // Initialize bible books sidebar (depends on loaded books)
    initializeBibleBooks();

    // Load content
    loadDailyVerse();
    renderBookmarks();

    // Initialize new features
    initializeHighlightModal();
    initializeCompareModal();
    initializeCollections();
}

// ========================================
// API Functions
// ========================================

async function fetchTranslationsAPI() {
    const url = `${API_BASE}/available_translations.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

async function fetchCommentariesAPI() {
    const url = `${API_BASE}/available_commentaries.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

async function fetchBooksAPI(translationId) {
    const url = `${API_BASE}/${encodeURIComponent(translationId)}/books.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

async function fetchChapterAPI(translationId, bookId, chapter) {
    const url = `${API_BASE}/${encodeURIComponent(translationId)}/${encodeURIComponent(bookId)}/${chapter}.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

async function fetchCommentaryChapterAPI(commentaryId, bookId, chapter) {
    const url = `${API_BASE}/c/${encodeURIComponent(commentaryId)}/${encodeURIComponent(bookId)}/${chapter}.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

// ========================================
// Data Loading
// ========================================

async function loadTranslations() {
    try {
        const data = await fetchTranslationsAPI();
        const all = Array.isArray(data) ? data : (data.translations || []);

        // Filter to English translations and sort (popular first)
        TRANSLATIONS = all
            .filter(t => t.language === 'eng' || t.languageEnglishName === 'English')
            .sort((a, b) => {
                const priority = ['BSB', 'ENGWEBP', 'eng_web', 'eng_bbe', 'eng_wbs', 'eng_webc'];
                const aIdx = priority.indexOf(a.id);
                const bIdx = priority.indexOf(b.id);
                const aP = aIdx >= 0 ? aIdx : 100;
                const bP = bIdx >= 0 ? bIdx : 100;
                if (aP !== bP) return aP - bP;
                return (a.name || '').localeCompare(b.name || '');
            });
    } catch (error) {
        console.error('Error loading translations:', error);
        TRANSLATIONS = FALLBACK_TRANSLATIONS;
    }

    // Validate current version exists
    if (!TRANSLATIONS.some(t => t.id === APP_STATE.currentVersion)) {
        APP_STATE.currentVersion = TRANSLATIONS.length > 0 ? TRANSLATIONS[0].id : 'BSB';
    }
}

async function loadBooks() {
    try {
        const data = await fetchBooksAPI(APP_STATE.currentVersion);
        const books = data.books || [];

        BIBLE_BOOKS = {
            oldTestament: books
                .filter(b => b.order <= 39)
                .map(b => ({ id: b.id, name: b.name || b.commonName, chapters: b.numberOfChapters, order: b.order })),
            newTestament: books
                .filter(b => b.order > 39)
                .map(b => ({ id: b.id, name: b.name || b.commonName, chapters: b.numberOfChapters, order: b.order }))
        };
    } catch (error) {
        console.error('Error loading books:', error);
        // Provide a minimal fallback using BOOK_NAME_TO_ID
        BIBLE_BOOKS = buildFallbackBooks();
    }
}

function buildFallbackBooks() {
    const otNames = [
        ['Genesis',50],['Exodus',40],['Leviticus',27],['Numbers',36],['Deuteronomy',34],
        ['Joshua',24],['Judges',21],['Ruth',4],['1 Samuel',31],['2 Samuel',24],
        ['1 Kings',22],['2 Kings',25],['1 Chronicles',29],['2 Chronicles',36],
        ['Ezra',10],['Nehemiah',13],['Esther',10],['Job',42],['Psalms',150],
        ['Proverbs',31],['Ecclesiastes',12],['Song of Solomon',8],['Isaiah',66],
        ['Jeremiah',52],['Lamentations',5],['Ezekiel',48],['Daniel',12],
        ['Hosea',14],['Joel',3],['Amos',9],['Obadiah',1],['Jonah',4],
        ['Micah',7],['Nahum',3],['Habakkuk',3],['Zephaniah',3],['Haggai',2],
        ['Zechariah',14],['Malachi',4]
    ];
    const ntNames = [
        ['Matthew',28],['Mark',16],['Luke',24],['John',21],['Acts',28],
        ['Romans',16],['1 Corinthians',16],['2 Corinthians',13],['Galatians',6],
        ['Ephesians',6],['Philippians',4],['Colossians',4],['1 Thessalonians',5],
        ['2 Thessalonians',3],['1 Timothy',6],['2 Timothy',4],['Titus',3],
        ['Philemon',1],['Hebrews',13],['James',5],['1 Peter',5],['2 Peter',3],
        ['1 John',5],['2 John',1],['3 John',1],['Jude',1],['Revelation',22]
    ];
    return {
        oldTestament: otNames.map(([name, chapters], i) => ({
            id: BOOK_NAME_TO_ID[name] || name, name, chapters, order: i + 1
        })),
        newTestament: ntNames.map(([name, chapters], i) => ({
            id: BOOK_NAME_TO_ID[name] || name, name, chapters, order: 40 + i
        }))
    };
}

async function loadCommentariesList() {
    try {
        const data = await fetchCommentariesAPI();
        COMMENTARIES = Array.isArray(data) ? data : (data.commentaries || []);
    } catch (error) {
        console.error('Error loading commentaries:', error);
        COMMENTARIES = [];
    }
}

// ========================================
// Local Storage Management
// ========================================

function loadState() {
    try {
        const savedBookmarks = localStorage.getItem('bibleBookmarks');
        if (savedBookmarks) {
            APP_STATE.bookmarks = JSON.parse(savedBookmarks);
        }

        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme) {
            APP_STATE.darkMode = savedTheme === 'true';
        }

        const savedVersion = localStorage.getItem('bibleVersion');
        if (savedVersion) {
            // Migrate old bible-api.com version IDs to HelloAO
            if (VERSION_MIGRATION[savedVersion]) {
                APP_STATE.currentVersion = VERSION_MIGRATION[savedVersion];
                localStorage.setItem('bibleVersion', APP_STATE.currentVersion);
            } else {
                APP_STATE.currentVersion = savedVersion;
            }
        }

        const savedCommentary = localStorage.getItem('bibleCommentary');
        if (savedCommentary) {
            APP_STATE.currentCommentary = savedCommentary;
        }

        const savedDailyVerse = localStorage.getItem('dailyVerse');
        const savedDate = localStorage.getItem('dailyVerseDate');
        const savedVerseVersion = localStorage.getItem('dailyVerseVersion');
        const today = new Date().toDateString();

        if (savedDailyVerse && savedDate === today && savedVerseVersion === APP_STATE.currentVersion) {
            APP_STATE.dailyVerse = JSON.parse(savedDailyVerse);
        }

        // Load highlights & notes
        const savedHighlights = localStorage.getItem('verseHighlights');
        if (savedHighlights) {
            APP_STATE.highlights = JSON.parse(savedHighlights);
        }

        // Load reading progress
        const savedProgress = localStorage.getItem('readingProgress');
        if (savedProgress) {
            APP_STATE.readingProgress = JSON.parse(savedProgress);
        }

        // Load bookmark collections
        const savedCollections = localStorage.getItem('bookmarkCollections');
        if (savedCollections) {
            APP_STATE.collections = JSON.parse(savedCollections);
        }
    } catch (error) {
        console.error('Error loading saved state:', error);
    }
}

function saveBookmarks() {
    try {
        localStorage.setItem('bibleBookmarks', JSON.stringify(APP_STATE.bookmarks));
    } catch (error) {
        console.error('Error saving bookmarks:', error);
        showToast('Failed to save bookmark', 'error');
    }
}

function saveTheme() {
    try {
        localStorage.setItem('darkMode', APP_STATE.darkMode.toString());
    } catch (error) {
        console.error('Error saving theme:', error);
    }
}

function saveDailyVerse(verse) {
    try {
        const today = new Date().toDateString();
        localStorage.setItem('dailyVerse', JSON.stringify(verse));
        localStorage.setItem('dailyVerseDate', today);
        localStorage.setItem('dailyVerseVersion', APP_STATE.currentVersion);
    } catch (error) {
        console.error('Error saving daily verse:', error);
    }
}

function saveVersion() {
    try {
        localStorage.setItem('bibleVersion', APP_STATE.currentVersion);
    } catch (error) {
        console.error('Error saving version:', error);
    }
}

function saveCommentary() {
    try {
        localStorage.setItem('bibleCommentary', APP_STATE.currentCommentary);
    } catch (error) {
        console.error('Error saving commentary:', error);
    }
}

// ========================================
// Navigation
// ========================================

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    APP_STATE.currentPage = page;

    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Close mobile menu if open
    const nav = document.querySelector('.nav');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    nav.classList.remove('mobile-active');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Initialize quiz when navigating to it
    if (page === 'quiz') {
        initializeQuiz();
    }

    // Initialize stories when navigating to it
    if (page === 'stories') {
        initializeStories();
    }

    // Initialize prayer when navigating to it
    if (page === 'prayer') {
        initializePrayer();
    }

    // Initialize progress when navigating to it
    if (page === 'progress') {
        renderReadingProgress();
    }

    // Render bookmarks with collections when navigating
    if (page === 'bookmarks') {
        renderCollectionTabs();
        renderBookmarks();
    }
}

// ========================================
// Theme Toggle
// ========================================

function initializeThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    APP_STATE.darkMode = !APP_STATE.darkMode;
    applyTheme();
    saveTheme();
}

function applyTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-icon');

    if (APP_STATE.darkMode) {
        body.classList.add('dark-mode');
        themeIcon.textContent = '☀️';
    } else {
        body.classList.remove('dark-mode');
        themeIcon.textContent = '🌙';
    }
}

// ========================================
// Mobile Menu
// ========================================

function initializeMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav');

    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('mobile-active');
        const isExpanded = nav.classList.contains('mobile-active');
        menuToggle.setAttribute('aria-expanded', isExpanded);
    });
}

// ========================================
// Daily Verse
// ========================================

async function loadDailyVerse() {
    const dailyVerseContent = document.querySelector('.daily-verse-content');
    const loader = dailyVerseContent.querySelector('.verse-loader');
    const verseText = dailyVerseContent.querySelector('.verse-text');

    // Show cached verse if available
    if (APP_STATE.dailyVerse) {
        displayDailyVerse(APP_STATE.dailyVerse);
        return;
    }

    try {
        loader.innerHTML = '<div class="spinner"></div><p>Loading today\'s verse...</p>';
        loader.style.display = 'flex';
        verseText.classList.add('hidden');

        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
        const verseIndex = dayOfYear % POPULAR_VERSES.length;
        const verseInfo = POPULAR_VERSES[verseIndex];

        const data = await fetchChapterAPI(APP_STATE.currentVersion, verseInfo.bookId, verseInfo.chapter);

        if (data && data.chapter && data.chapter.content) {
            let text = '';
            if (verseInfo.startVerse && verseInfo.endVerse) {
                const texts = [];
                for (let v = verseInfo.startVerse; v <= verseInfo.endVerse; v++) {
                    const t = extractVerseText(data.chapter.content, v);
                    if (t) texts.push(t);
                }
                text = texts.join(' ');
            } else {
                text = extractVerseText(data.chapter.content, verseInfo.verse) || '';
            }

            if (text) {
                const verse = { reference: verseInfo.ref, text: text.trim() };
                APP_STATE.dailyVerse = verse;
                saveDailyVerse(verse);
                displayDailyVerse(verse);
            } else {
                throw new Error('Verse not found in chapter data');
            }
        } else {
            throw new Error('Invalid response from API');
        }
    } catch (error) {
        console.error('Error loading daily verse:', error);
        loader.innerHTML = '<p>Unable to load daily verse. Please check your connection.</p><button class="btn btn-secondary" onclick="retryDailyVerse()">Retry</button>';
    }
}

function retryDailyVerse() {
    APP_STATE.dailyVerse = null;
    loadDailyVerse();
}

function displayDailyVerse(verse) {
    const dailyVerseContent = document.querySelector('.daily-verse-content');
    const loader = dailyVerseContent.querySelector('.verse-loader');
    const verseText = dailyVerseContent.querySelector('.verse-text');
    const quote = verseText.querySelector('.verse-quote');
    const reference = verseText.querySelector('.verse-reference');

    quote.textContent = verse.text;
    reference.textContent = verse.reference;

    loader.style.display = 'none';
    verseText.classList.remove('hidden');
}

/**
 * Extract plain text from a verse in the chapter content array.
 */
function extractVerseText(content, verseNumber) {
    for (const item of content) {
        if (item.type === 'verse' && item.number === verseNumber) {
            return (item.content || [])
                .map(part => {
                    if (typeof part === 'string') return part;
                    if (part && typeof part === 'object' && part.text) return part.text;
                    return '';
                })
                .join('')
                .trim();
        }
    }
    return null;
}

// ========================================
// Bible Books Initialization
// ========================================

function initializeBibleBooks() {
    const oldTestamentContainer = document.getElementById('old-testament-books');
    const newTestamentContainer = document.getElementById('new-testament-books');

    oldTestamentContainer.innerHTML = '';
    newTestamentContainer.innerHTML = '';

    BIBLE_BOOKS.oldTestament.forEach(book => {
        const btn = createBookButton(book);
        oldTestamentContainer.appendChild(btn);
    });

    BIBLE_BOOKS.newTestament.forEach(book => {
        const btn = createBookButton(book);
        newTestamentContainer.appendChild(btn);
    });
}

function createBookButton(book) {
    const btn = document.createElement('button');
    btn.className = 'book-btn';
    btn.textContent = book.name;
    btn.setAttribute('aria-label', `Select ${book.name}`);
    btn.onclick = () => selectBook(book);
    return btn;
}

function selectBook(book) {
    APP_STATE.currentBook = book;

    const bookButtons = document.querySelectorAll('.book-btn');
    bookButtons.forEach(btn => {
        if (btn.textContent === book.name) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    showChapterSelection(book);
}

function showChapterSelection(book) {
    const welcome = document.getElementById('bible-welcome');
    const chapterSelection = document.getElementById('chapter-selection');
    const verseDisplay = document.getElementById('verse-display');

    welcome.style.display = 'none';
    verseDisplay.hidden = true;
    chapterSelection.hidden = false;

    const title = chapterSelection.querySelector('.selected-book-title');
    title.textContent = book.name;

    const chapterGrid = chapterSelection.querySelector('.chapter-grid');
    chapterGrid.innerHTML = '';

    for (let i = 1; i <= book.chapters; i++) {
        const btn = document.createElement('button');
        btn.className = 'chapter-btn';
        btn.textContent = i;
        btn.setAttribute('aria-label', `Chapter ${i}`);
        btn.onclick = () => loadChapter(book, i);
        chapterGrid.appendChild(btn);
    }
}

// ========================================
// Bible Chapter Loading
// ========================================

async function loadChapter(book, chapter) {
    APP_STATE.currentChapter = chapter;

    const chapterSelection = document.getElementById('chapter-selection');
    const verseDisplay = document.getElementById('verse-display');

    chapterSelection.hidden = true;
    verseDisplay.hidden = false;

    const chapterTitle = verseDisplay.querySelector('.chapter-title');
    chapterTitle.textContent = `${book.name} ${chapter}`;

    const backBtn = verseDisplay.querySelector('.btn-back');
    backBtn.onclick = () => {
        verseDisplay.hidden = true;
        chapterSelection.hidden = false;
    };

    setupChapterNavigation(book, chapter);

    // Reset & show loader
    const loader = verseDisplay.querySelector('.verse-loader');
    const versesContainer = verseDisplay.querySelector('.verses-container');
    loader.innerHTML = '<div class="spinner"></div><p>Loading chapter...</p>';
    loader.style.display = 'flex';
    versesContainer.innerHTML = '';

    // Hide commentary panel
    const commentaryPanel = document.getElementById('commentary-panel');
    if (commentaryPanel) commentaryPanel.hidden = true;

    try {
        const data = await fetchChapterAPI(APP_STATE.currentVersion, book.id, chapter);

        if (data && data.chapter && data.chapter.content) {
            renderChapterContent(data.chapter.content, data.chapter.footnotes || [], book.name, chapter);
        } else {
            throw new Error('Invalid chapter data');
        }

        loader.style.display = 'none';

        // Track reading progress
        markChapterRead(book.id, chapter);

        // Load commentary if selected
        if (APP_STATE.currentCommentary) {
            loadCommentaryForChapter(book.id, chapter);
        }
    } catch (error) {
        console.error('Error loading chapter:', error);
        loader.innerHTML = `<p>Failed to load chapter. Please try again.</p>
            <button class="btn btn-secondary" onclick="retryChapter()">Retry</button>`;
    }
}

function retryChapter() {
    if (APP_STATE.currentBook && APP_STATE.currentChapter) {
        loadChapter(APP_STATE.currentBook, APP_STATE.currentChapter);
    }
}

function setupChapterNavigation(book, chapter) {
    const prevBtn = document.getElementById('prev-chapter');
    const nextBtn = document.getElementById('next-chapter');

    if (chapter > 1) {
        prevBtn.disabled = false;
        prevBtn.onclick = () => loadChapter(book, chapter - 1);
    } else {
        prevBtn.disabled = true;
        prevBtn.onclick = null;
    }

    if (chapter < book.chapters) {
        nextBtn.disabled = false;
        nextBtn.onclick = () => loadChapter(book, chapter + 1);
    } else {
        nextBtn.disabled = true;
        nextBtn.onclick = null;
    }
}

// ========================================
// Chapter Content Rendering
// ========================================

function renderChapterContent(content, footnotes, bookName, chapter) {
    const versesContainer = document.querySelector('.verses-container');
    versesContainer.innerHTML = '';

    // Build footnotes lookup
    const footnotesMap = {};
    footnotes.forEach(fn => { footnotesMap[fn.noteId] = fn; });

    content.forEach(item => {
        if (item.type === 'heading') {
            const heading = document.createElement('h4');
            heading.className = 'section-heading';
            heading.textContent = Array.isArray(item.content)
                ? item.content.join('')
                : (item.content || '');
            versesContainer.appendChild(heading);

        } else if (item.type === 'line_break') {
            const br = document.createElement('div');
            br.className = 'verse-line-break';
            versesContainer.appendChild(br);

        } else if (item.type === 'hebrew_subtitle') {
            const subtitle = document.createElement('div');
            subtitle.className = 'hebrew-subtitle';
            subtitle.textContent = Array.isArray(item.content)
                ? item.content.join('')
                : (item.content || '');
            versesContainer.appendChild(subtitle);

        } else if (item.type === 'verse' && item.number) {
            const verseItem = document.createElement('div');
            verseItem.className = 'verse-item';
            verseItem.dataset.verse = item.number;
            verseItem.id = `verse-${chapter}-${item.number}`;

            const verseNumber = document.createElement('span');
            verseNumber.className = 'verse-number';
            verseNumber.textContent = item.number;

            const verseText = document.createElement('span');
            verseText.className = 'verse-text';

            // Parse content with footnote markers
            if (Array.isArray(item.content)) {
                item.content.forEach(part => {
                    if (typeof part === 'string') {
                        verseText.appendChild(document.createTextNode(part));
                    } else if (part && part.noteId !== undefined) {
                        const fn = footnotesMap[part.noteId];
                        if (fn) {
                            const sup = document.createElement('sup');
                            sup.className = 'footnote-ref';
                            sup.textContent = fn.caller || '*';
                            sup.title = fn.text || '';
                            sup.setAttribute('aria-label', `Footnote: ${fn.text || ''}`);
                            verseText.appendChild(sup);
                        }
                    } else if (part && typeof part === 'object' && part.text) {
                        const span = document.createElement('span');
                        if (part.poem) span.className = `poem-indent-${part.poem}`;
                        span.textContent = part.text;
                        verseText.appendChild(span);
                    }
                });
            }

            // Verse action buttons
            const verseActions = document.createElement('div');
            verseActions.className = 'verse-actions';

            const plainText = extractVerseText(content, item.number) || '';
            const reference = `${bookName} ${chapter}:${item.number}`;
            const isBookmarked = APP_STATE.bookmarks.some(b => b.reference === reference);

            const highlightBtn = document.createElement('button');
            highlightBtn.className = 'verse-action-btn';
            highlightBtn.innerHTML = '🎨';
            highlightBtn.setAttribute('aria-label', 'Highlight & note');
            highlightBtn.onclick = () => openHighlightModal(reference, plainText);

            const compareBtn = document.createElement('button');
            compareBtn.className = 'verse-action-btn';
            compareBtn.innerHTML = '⚖️';
            compareBtn.setAttribute('aria-label', 'Compare translations');
            compareBtn.onclick = () => openCompareModal(bookName, chapter, item.number);

            const bookmarkBtn = document.createElement('button');
            bookmarkBtn.className = `verse-action-btn ${isBookmarked ? 'bookmarked' : ''}`;
            bookmarkBtn.innerHTML = isBookmarked ? '★' : '☆';
            bookmarkBtn.setAttribute('aria-label', isBookmarked ? 'Remove bookmark' : 'Add bookmark');
            bookmarkBtn.onclick = () => toggleBookmark(reference, plainText, bookmarkBtn);

            const copyBtn = document.createElement('button');
            copyBtn.className = 'verse-action-btn';
            copyBtn.innerHTML = '📋';
            copyBtn.setAttribute('aria-label', 'Copy verse');
            copyBtn.onclick = () => copyToClipboard(`${plainText} - ${reference}`);

            const shareBtn = document.createElement('button');
            shareBtn.className = 'verse-action-btn';
            shareBtn.innerHTML = '🔗';
            shareBtn.setAttribute('aria-label', 'Share verse');
            shareBtn.onclick = () => shareVerse(reference, plainText);

            verseActions.appendChild(highlightBtn);
            verseActions.appendChild(compareBtn);
            verseActions.appendChild(bookmarkBtn);
            verseActions.appendChild(copyBtn);
            verseActions.appendChild(shareBtn);

            verseItem.appendChild(verseNumber);
            verseItem.appendChild(verseText);
            verseItem.appendChild(verseActions);

            // Apply saved highlight and note
            applyVerseHighlight(verseItem, reference, verseText);

            versesContainer.appendChild(verseItem);
        }
    });
}

// ========================================
// Commentary
// ========================================

function initializeCommentarySelector() {
    const selector = document.getElementById('commentary-selector');
    if (!selector) return;

    selector.innerHTML = '<option value="">No Commentary</option>';
    COMMENTARIES.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name || c.englishName || c.id;
        if (c.id === APP_STATE.currentCommentary) {
            option.selected = true;
        }
        selector.appendChild(option);
    });

    selector.addEventListener('change', (e) => {
        APP_STATE.currentCommentary = e.target.value;
        saveCommentary();

        if (APP_STATE.currentBook && APP_STATE.currentChapter) {
            if (APP_STATE.currentCommentary) {
                loadCommentaryForChapter(APP_STATE.currentBook.id, APP_STATE.currentChapter);
            } else {
                const panel = document.getElementById('commentary-panel');
                if (panel) panel.hidden = true;
            }
        }
    });
}

async function loadCommentaryForChapter(bookId, chapter) {
    const panel = document.getElementById('commentary-panel');
    if (!panel) return;

    panel.hidden = false;
    panel.innerHTML = '<div class="verse-loader"><div class="spinner"></div><p>Loading commentary...</p></div>';

    try {
        const data = await fetchCommentaryChapterAPI(APP_STATE.currentCommentary, bookId, chapter);

        if (data && data.chapter && data.chapter.content) {
            renderCommentary(data, panel);
        } else {
            panel.innerHTML = '<p class="commentary-empty">No commentary available for this chapter.</p>';
        }
    } catch (error) {
        console.error('Error loading commentary:', error);
        panel.innerHTML = '<p class="commentary-empty">Failed to load commentary.</p>';
    }
}

function renderCommentary(data, panel) {
    panel.innerHTML = '';

    const header = document.createElement('h4');
    header.className = 'commentary-header';
    const commentaryName = data.commentary?.name || 'Commentary';
    const bookName = data.book?.name || '';
    const chapterNum = data.chapter?.number || '';
    header.textContent = `${commentaryName} — ${bookName} ${chapterNum}`;
    panel.appendChild(header);

    // Chapter introduction
    if (data.chapter?.introduction) {
        const toggle = document.createElement('button');
        toggle.className = 'btn btn-secondary commentary-toggle';
        toggle.textContent = 'Show Introduction';
        toggle.onclick = () => {
            intro.hidden = !intro.hidden;
            toggle.textContent = intro.hidden ? 'Show Introduction' : 'Hide Introduction';
        };
        panel.appendChild(toggle);

        const intro = document.createElement('div');
        intro.className = 'commentary-intro';
        intro.hidden = true;
        intro.innerHTML = escapeHTML(data.chapter.introduction).replace(/\n/g, '<br>');
        panel.appendChild(intro);
    }

    // Content sections
    if (data.chapter?.content) {
        data.chapter.content.forEach(item => {
            if (item.type === 'verse' && item.content) {
                const section = document.createElement('details');
                section.className = 'commentary-section';

                const summary = document.createElement('summary');
                summary.className = 'commentary-section-header';
                summary.textContent = item.number ? `Verses ${item.number}+` : 'Commentary';
                section.appendChild(summary);

                const text = document.createElement('div');
                text.className = 'commentary-text';
                const rawText = Array.isArray(item.content) ? item.content.join('') : item.content;
                text.innerHTML = escapeHTML(rawText).replace(/\n/g, '<br>');
                section.appendChild(text);

                panel.appendChild(section);
            }
        });
    }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========================================
// Version Selector
// ========================================

function initializeVersionSelector() {
    const selector = document.getElementById('version-selector');
    if (!selector) return;

    selector.innerHTML = '';
    TRANSLATIONS.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = `${t.shortName || t.id} — ${t.name || t.englishName || t.id}`;
        if (t.id === APP_STATE.currentVersion) {
            option.selected = true;
        }
        selector.appendChild(option);
    });

    selector.addEventListener('change', (e) => {
        changeVersion(e.target.value);
    });

    updateVersionBadge();
}

async function changeVersion(versionId) {
    const translation = TRANSLATIONS.find(t => t.id === versionId);
    if (!translation) return;

    APP_STATE.currentVersion = versionId;
    saveVersion();
    updateVersionBadge();

    // Reload books for the new translation
    await loadBooks();
    initializeBibleBooks();

    // Clear cached daily verse so it reloads in new version
    APP_STATE.dailyVerse = null;
    loadDailyVerse();

    // Reload current chapter if one is being displayed
    if (APP_STATE.currentBook && APP_STATE.currentChapter) {
        const allBooks = [...BIBLE_BOOKS.oldTestament, ...BIBLE_BOOKS.newTestament];
        const book = allBooks.find(b => b.id === APP_STATE.currentBook.id);
        if (book) {
            APP_STATE.currentBook = book;
            loadChapter(book, APP_STATE.currentChapter);
        }
    }

    showToast(`Switched to ${translation.shortName || translation.id}`, 'success');
}

function updateVersionBadge() {
    const badge = document.getElementById('current-version-badge');
    if (badge) {
        const t = TRANSLATIONS.find(t => t.id === APP_STATE.currentVersion);
        badge.textContent = t ? (t.shortName || t.id) : APP_STATE.currentVersion;
    }
}

// ========================================
// Search Functionality
// ========================================

function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', handleSearchFocus);

    document.addEventListener('click', (e) => {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer.contains(e.target)) {
            hideSearchResults();
        }
    });
}

function handleSearchInput(e) {
    const query = e.target.value.trim();

    if (APP_STATE.searchTimeout) {
        clearTimeout(APP_STATE.searchTimeout);
    }

    if (query.length === 0) {
        hideSearchResults();
        return;
    }

    APP_STATE.searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 300);
}

function handleSearchFocus(e) {
    const query = e.target.value.trim();
    if (query.length > 0) {
        performSearch(query);
    }
}

async function performSearch(query) {
    const searchResults = document.querySelector('.search-results');

    // Check if query looks like a verse reference
    const referencePattern = /^(\d?\s?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+):?(\d+)?(-\d+)?$/;
    const match = query.match(referencePattern);

    if (match) {
        const bookName = match[1].trim();
        const chapter = parseInt(match[2]);
        const verseNum = match[3] ? parseInt(match[3]) : null;

        // Find book ID
        const bookId = BOOK_NAME_TO_ID[bookName] || findBookIdByName(bookName);

        if (!bookId) {
            searchResults.innerHTML = '<div class="search-no-results">Book not found. Please check the name.</div>';
            searchResults.style.display = 'block';
            searchResults.classList.remove('hidden');
            return;
        }

        try {
            searchResults.innerHTML = '<div class="verse-loader"><div class="spinner"></div></div>';
            searchResults.style.display = 'block';
            searchResults.classList.remove('hidden');

            const data = await fetchChapterAPI(APP_STATE.currentVersion, bookId, chapter);

            if (data && data.chapter && data.chapter.content) {
                let text = '';
                let reference = '';

                if (verseNum) {
                    text = extractVerseText(data.chapter.content, verseNum) || '';
                    // Find the actual book name from loaded books
                    const actualBookName = findBookNameById(bookId) || bookName;
                    reference = `${actualBookName} ${chapter}:${verseNum}`;
                } else {
                    const verses = data.chapter.content.filter(c => c.type === 'verse').slice(0, 3);
                    text = verses.map(v => extractVerseText(data.chapter.content, v.number)).filter(Boolean).join(' ');
                    const actualBookName = findBookNameById(bookId) || bookName;
                    reference = `${actualBookName} ${chapter}`;
                }

                displaySearchResults([{ reference, text }]);
            }
        } catch (error) {
            searchResults.innerHTML = '<div class="search-no-results">Verse not found. Please check the reference.</div>';
        }
    } else {
        searchResults.innerHTML = '<div class="search-no-results">Enter a verse reference (e.g., "John 3:16") to search.</div>';
        searchResults.style.display = 'block';
    }
}

function findBookIdByName(name) {
    const lower = name.toLowerCase();
    const allBooks = [...BIBLE_BOOKS.oldTestament, ...BIBLE_BOOKS.newTestament];
    const book = allBooks.find(b =>
        b.name.toLowerCase() === lower ||
        b.name.toLowerCase().startsWith(lower)
    );
    return book ? book.id : null;
}

function findBookNameById(bookId) {
    const allBooks = [...BIBLE_BOOKS.oldTestament, ...BIBLE_BOOKS.newTestament];
    const book = allBooks.find(b => b.id === bookId);
    return book ? book.name : null;
}

function displaySearchResults(results) {
    const searchResults = document.querySelector('.search-results');

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">No results found.</div>';
        return;
    }

    searchResults.innerHTML = '';
    searchResults.style.display = 'block';

    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.onclick = () => navigateToVerse(result);

        const reference = document.createElement('div');
        reference.className = 'search-result-reference';
        reference.textContent = result.reference;

        const text = document.createElement('div');
        text.className = 'search-result-text';
        const displayText = result.text || '';
        text.textContent = displayText.substring(0, 150) + (displayText.length > 150 ? '...' : '');

        item.appendChild(reference);
        item.appendChild(text);
        searchResults.appendChild(item);
    });
}

function hideSearchResults() {
    const searchResults = document.querySelector('.search-results');
    searchResults.style.display = 'none';
    searchResults.classList.add('hidden');
}

function navigateToVerse(result) {
    navigateTo('bible');

    const allBooks = [...BIBLE_BOOKS.oldTestament, ...BIBLE_BOOKS.newTestament];
    const sortedBooks = [...allBooks].sort((a, b) => b.name.length - a.name.length);
    const book = sortedBooks.find(b =>
        result.reference.toLowerCase().startsWith(b.name.toLowerCase())
    );

    if (book) {
        selectBook(book);

        const afterBookName = result.reference.substring(book.name.length).trim();
        const chapterMatch = afterBookName.match(/^(\d+)/);
        if (chapterMatch) {
            const chapter = parseInt(chapterMatch[1]);
            setTimeout(() => {
                loadChapter(book, chapter);

                const verseMatch = result.reference.match(/:(\d+)/);
                if (verseMatch) {
                    const verseNum = parseInt(verseMatch[1]);
                    setTimeout(() => {
                        const verseElement = document.getElementById(`verse-${chapter}-${verseNum}`);
                        if (verseElement) {
                            verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            verseElement.classList.add('highlighted');
                            setTimeout(() => verseElement.classList.remove('highlighted'), 3000);
                        }
                    }, 500);
                }
            }, 100);
        }
    }

    hideSearchResults();
}

// ========================================
// Bookmarks
// ========================================

function toggleBookmark(reference, text, button) {
    const existingIndex = APP_STATE.bookmarks.findIndex(b => b.reference === reference);

    if (existingIndex >= 0) {
        APP_STATE.bookmarks.splice(existingIndex, 1);
        button.innerHTML = '☆';
        button.classList.remove('bookmarked');
        button.setAttribute('aria-label', 'Add bookmark');
        showToast('Bookmark removed', 'success');
    } else {
        APP_STATE.bookmarks.push({
            reference,
            text,
            bookmarkedAt: new Date().toISOString()
        });
        button.innerHTML = '★';
        button.classList.add('bookmarked');
        button.setAttribute('aria-label', 'Remove bookmark');
        showToast('Bookmark added', 'success');
    }

    saveBookmarks();
    renderBookmarks();
}

function renderBookmarks() {
    const bookmarksList = document.getElementById('bookmarks-list');
    const emptyState = document.getElementById('bookmarks-empty');

    if (APP_STATE.bookmarks.length === 0) {
        emptyState.style.display = 'block';
        bookmarksList.innerHTML = '';
        return;
    }

    // Filter by active collection
    let filtered = APP_STATE.bookmarks;
    if (APP_STATE.activeCollection !== 'all') {
        filtered = filtered.filter(b => (b.collection || '') === APP_STATE.activeCollection);
    }

    if (filtered.length === 0 && APP_STATE.activeCollection !== 'all') {
        emptyState.style.display = 'none';
        bookmarksList.innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div><h3>No Bookmarks in this Collection</h3><p>Move bookmarks here using the collection selector on each card.</p></div>';
        return;
    }

    emptyState.style.display = filtered.length === 0 ? 'block' : 'none';
    bookmarksList.innerHTML = '';

    const sortedBookmarks = [...filtered].sort((a, b) =>
        new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt)
    );

    sortedBookmarks.forEach(bookmark => {
        const card = createBookmarkCard(bookmark);
        bookmarksList.appendChild(card);
    });
}

function createBookmarkCard(bookmark) {
    const card = document.createElement('article');
    card.className = 'bookmark-card';

    const header = document.createElement('div');
    header.className = 'bookmark-header';

    const reference = document.createElement('h3');
    reference.className = 'bookmark-reference';
    reference.textContent = bookmark.reference;

    // Show collection badge if assigned
    if (bookmark.collection) {
        const badge = document.createElement('span');
        badge.className = 'bookmark-collection-badge';
        badge.textContent = bookmark.collection;
        reference.appendChild(badge);
    }

    const date = document.createElement('span');
    date.className = 'bookmark-date';
    date.textContent = formatDate(bookmark.bookmarkedAt);

    header.appendChild(reference);
    header.appendChild(date);

    const text = document.createElement('p');
    text.className = 'bookmark-text';
    text.textContent = bookmark.text;

    const actions = document.createElement('div');
    actions.className = 'bookmark-actions';

    // Collection selector
    const collectionSelect = document.createElement('select');
    collectionSelect.className = 'bookmark-move-select';
    collectionSelect.title = 'Move to collection';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = 'No collection';
    collectionSelect.appendChild(noneOpt);
    APP_STATE.collections.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        if (bookmark.collection === c) opt.selected = true;
        collectionSelect.appendChild(opt);
    });
    collectionSelect.onchange = () => {
        moveBookmarkToCollection(bookmark.reference, collectionSelect.value);
    };

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-secondary';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => copyToClipboard(`${bookmark.text} - ${bookmark.reference}`);

    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn btn-secondary';
    shareBtn.textContent = 'Share';
    shareBtn.onclick = () => shareVerse(bookmark.reference, bookmark.text);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => removeBookmark(bookmark.reference);

    actions.appendChild(collectionSelect);
    actions.appendChild(copyBtn);
    actions.appendChild(shareBtn);
    actions.appendChild(removeBtn);

    card.appendChild(header);
    card.appendChild(text);
    card.appendChild(actions);

    return card;
}

function removeBookmark(reference) {
    const index = APP_STATE.bookmarks.findIndex(b => b.reference === reference);
    if (index >= 0) {
        APP_STATE.bookmarks.splice(index, 1);
        saveBookmarks();
        renderBookmarks();
        showToast('Bookmark removed', 'success');

        // Update bookmark button if verse is currently displayed
        const verseElements = document.querySelectorAll('.verse-item');
        verseElements.forEach(element => {
            const verseNum = element.dataset.verse;
            const chapterTitle = document.querySelector('.chapter-title');
            if (chapterTitle) {
                const currentRef = `${chapterTitle.textContent}:${verseNum}`;
                if (currentRef === reference) {
                    const bookmarkBtn = element.querySelector('.verse-action-btn');
                    if (bookmarkBtn) {
                        bookmarkBtn.innerHTML = '☆';
                        bookmarkBtn.classList.remove('bookmarked');
                        bookmarkBtn.setAttribute('aria-label', 'Add bookmark');
                    }
                }
            }
        });
    }
}

// ========================================
// Utility Functions
// ========================================

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            showToast('Copied to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Failed to copy:', err);
            showToast('Failed to copy', 'error');
        });
}

function shareVerse(reference, text) {
    const shareText = `"${text}" - ${reference}`;

    if (navigator.share) {
        navigator.share({
            title: reference,
            text: shareText
        })
        .then(() => showToast('Shared successfully!', 'success'))
        .catch(err => {
            if (err.name !== 'AbortError') {
                console.error('Error sharing:', err);
            }
        });
    } else {
        const encodedText = encodeURIComponent(shareText);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterUrl, '_blank');
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');

    if (APP_STATE.toastTimeout) {
        clearTimeout(APP_STATE.toastTimeout);
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    APP_STATE.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        APP_STATE.toastTimeout = null;
    }, 3000);
}

// ========================================
// Export for global access
// ========================================

window.navigateTo = navigateTo;
window.retryDailyVerse = retryDailyVerse;
window.retryChapter = retryChapter;

// ========================================
// Daily Bible Quiz
// ========================================

const QUIZ_QUESTIONS = [
    // ---- People ----
    { category: 'People', q: 'Who built the ark?', options: ['Moses', 'Noah', 'Abraham', 'David'], answer: 1, ref: 'Genesis 6:13-14' },
    { category: 'People', q: 'Who was the first king of Israel?', options: ['David', 'Solomon', 'Saul', 'Samuel'], answer: 2, ref: '1 Samuel 10:1' },
    { category: 'People', q: 'Who was thrown into a den of lions?', options: ['David', 'Daniel', 'Elijah', 'Jonah'], answer: 1, ref: 'Daniel 6:16' },
    { category: 'People', q: 'Who was swallowed by a great fish?', options: ['Peter', 'Jonah', 'Paul', 'Moses'], answer: 1, ref: 'Jonah 1:17' },
    { category: 'People', q: 'Who killed Goliath?', options: ['Saul', 'Jonathan', 'David', 'Joshua'], answer: 2, ref: '1 Samuel 17:50' },
    { category: 'People', q: 'Who betrayed Jesus for thirty pieces of silver?', options: ['Peter', 'Thomas', 'Judas Iscariot', 'James'], answer: 2, ref: 'Matthew 26:14-15' },
    { category: 'People', q: 'Who was the mother of Jesus?', options: ['Martha', 'Mary Magdalene', 'Elizabeth', 'Mary'], answer: 3, ref: 'Luke 1:30-31' },
    { category: 'People', q: 'Who denied Jesus three times?', options: ['John', 'Peter', 'Thomas', 'Andrew'], answer: 1, ref: 'Luke 22:61' },
    { category: 'People', q: 'Who led the Israelites out of Egypt?', options: ['Aaron', 'Joshua', 'Moses', 'Joseph'], answer: 2, ref: 'Exodus 3:10' },
    { category: 'People', q: 'Who was known as the wisest man?', options: ['David', 'Solomon', 'Daniel', 'Moses'], answer: 1, ref: '1 Kings 4:30' },
    { category: 'People', q: 'Who was the wife of Abraham?', options: ['Rebekah', 'Rachel', 'Sarah', 'Leah'], answer: 2, ref: 'Genesis 17:15' },
    { category: 'People', q: 'Who was sold into slavery by his brothers?', options: ['Benjamin', 'Reuben', 'Joseph', 'Judah'], answer: 2, ref: 'Genesis 37:28' },
    { category: 'People', q: 'Who wrote most of the Psalms?', options: ['Solomon', 'Moses', 'David', 'Asaph'], answer: 2, ref: 'Psalm 72:20' },
    { category: 'People', q: 'Who was the first person to see the risen Jesus?', options: ['Peter', 'Mary Magdalene', 'John', 'Thomas'], answer: 1, ref: 'Mark 16:9' },
    { category: 'People', q: 'Who baptized Jesus?', options: ['Peter', 'John the Baptist', 'Andrew', 'James'], answer: 1, ref: 'Matthew 3:13' },

    // ---- Events ----
    { category: 'Events', q: 'How many days did it rain during the great flood?', options: ['7', '30', '40', '100'], answer: 2, ref: 'Genesis 7:12' },
    { category: 'Events', q: 'How many plagues did God send on Egypt?', options: ['5', '7', '10', '12'], answer: 2, ref: 'Exodus 7-12' },
    { category: 'Events', q: 'What did God create on the first day?', options: ['Land and sea', 'Light', 'Animals', 'Stars'], answer: 1, ref: 'Genesis 1:3' },
    { category: 'Events', q: 'Which sea did Moses part?', options: ['Dead Sea', 'Red Sea', 'Sea of Galilee', 'Mediterranean Sea'], answer: 1, ref: 'Exodus 14:21' },
    { category: 'Events', q: 'What fell from the sky to feed the Israelites?', options: ['Bread', 'Manna', 'Fruit', 'Fish'], answer: 1, ref: 'Exodus 16:14-15' },
    { category: 'Events', q: 'How many days was Jesus in the wilderness being tempted?', options: ['7', '21', '30', '40'], answer: 3, ref: 'Matthew 4:1-2' },
    { category: 'Events', q: 'At the wedding in Cana, Jesus turned water into what?', options: ['Milk', 'Oil', 'Wine', 'Honey'], answer: 2, ref: 'John 2:9' },
    { category: 'Events', q: 'How many loaves did Jesus use to feed the 5,000?', options: ['3', '5', '7', '12'], answer: 1, ref: 'Matthew 14:17-21' },
    { category: 'Events', q: 'What happened on the day of Pentecost?', options: ['An earthquake', 'The Holy Spirit came', 'Jesus ascended', 'The temple was destroyed'], answer: 1, ref: 'Acts 2:1-4' },
    { category: 'Events', q: 'How did Jesus enter Jerusalem before his crucifixion?', options: ['On a horse', 'On a donkey', 'On foot', 'In a chariot'], answer: 1, ref: 'Matthew 21:7' },

    // ---- Places ----
    { category: 'Places', q: 'In which city was Jesus born?', options: ['Nazareth', 'Jerusalem', 'Bethlehem', 'Capernaum'], answer: 2, ref: 'Matthew 2:1' },
    { category: 'Places', q: 'Where did God give Moses the Ten Commandments?', options: ['Mount Sinai', 'Mount Zion', 'Mount Carmel', 'Mount Nebo'], answer: 0, ref: 'Exodus 19:20' },
    { category: 'Places', q: 'What was the name of the garden where Adam and Eve lived?', options: ['Gethsemane', 'Eden', 'Galilee', 'Canaan'], answer: 1, ref: 'Genesis 2:8' },
    { category: 'Places', q: 'On what mountain did Noah\'s ark come to rest?', options: ['Mount Sinai', 'Mount Ararat', 'Mount Carmel', 'Mount Nebo'], answer: 1, ref: 'Genesis 8:4' },
    { category: 'Places', q: 'Where was Paul on the road to when he saw a blinding light?', options: ['Jerusalem', 'Damascus', 'Athens', 'Rome'], answer: 1, ref: 'Acts 9:3' },

    // ---- Books & Scripture ----
    { category: 'Scripture', q: 'What is the shortest verse in the Bible?', options: ['"Jesus wept."', '"God is love."', '"Pray continually."', '"Rejoice always."'], answer: 0, ref: 'John 11:35' },
    { category: 'Scripture', q: 'How many books are in the Bible?', options: ['27', '39', '66', '73'], answer: 2, ref: '' },
    { category: 'Scripture', q: 'What is the first book of the Bible?', options: ['Exodus', 'Psalms', 'Genesis', 'Matthew'], answer: 2, ref: '' },
    { category: 'Scripture', q: 'What is the last book of the Bible?', options: ['Jude', 'Revelation', 'Malachi', 'Acts'], answer: 1, ref: '' },
    { category: 'Scripture', q: 'Which book contains the Ten Commandments?', options: ['Genesis', 'Leviticus', 'Exodus', 'Deuteronomy'], answer: 2, ref: 'Exodus 20:1-17' },
    { category: 'Scripture', q: 'How many Psalms are in the Bible?', options: ['50', '100', '119', '150'], answer: 3, ref: '' },
    { category: 'Scripture', q: '"For God so loved the world..." is found in which book?', options: ['Romans', 'Matthew', 'John', 'Luke'], answer: 2, ref: 'John 3:16' },
    { category: 'Scripture', q: 'Which book tells the story of the Exodus from Egypt?', options: ['Genesis', 'Exodus', 'Numbers', 'Leviticus'], answer: 1, ref: '' },
    { category: 'Scripture', q: 'The Sermon on the Mount is found in which Gospel?', options: ['Mark', 'Luke', 'John', 'Matthew'], answer: 3, ref: 'Matthew 5-7' },
    { category: 'Scripture', q: 'Who wrote the book of Acts?', options: ['Paul', 'Peter', 'Luke', 'John'], answer: 2, ref: 'Acts 1:1' },

    // ---- Teachings ----
    { category: 'Teachings', q: 'How many commandments did God give Moses?', options: ['5', '7', '10', '12'], answer: 2, ref: 'Exodus 34:28' },
    { category: 'Teachings', q: 'How many disciples did Jesus choose?', options: ['7', '10', '12', '70'], answer: 2, ref: 'Luke 6:13' },
    { category: 'Teachings', q: 'Which is the greatest commandment according to Jesus?', options: ['Do not steal', 'Honor your parents', 'Love the Lord your God', 'Do not kill'], answer: 2, ref: 'Matthew 22:37-38' },
    { category: 'Teachings', q: 'What are the fruits of the Spirit?', options: ['Faith, hope, charity', 'Love, joy, peace...', 'Wisdom, knowledge, truth', 'Grace, mercy, power'], answer: 1, ref: 'Galatians 5:22-23' },
    { category: 'Teachings', q: 'In the parable, what did the prodigal son spend his inheritance on?', options: ['Land', 'Wild living', 'Charity', 'Business'], answer: 1, ref: 'Luke 15:13' },
    { category: 'Teachings', q: 'What does Jesus say is the second greatest commandment?', options: ['Keep the Sabbath', 'Love your neighbor as yourself', 'Do not lie', 'Honor your parents'], answer: 1, ref: 'Matthew 22:39' },
    { category: 'Teachings', q: 'How many beatitudes did Jesus teach?', options: ['5', '7', '8', '10'], answer: 2, ref: 'Matthew 5:3-12' },
    { category: 'Teachings', q: 'What did Jesus say to do when someone strikes your right cheek?', options: ['Strike back', 'Turn the other cheek', 'Run away', 'Call for help'], answer: 1, ref: 'Matthew 5:39' },

    // ---- Miracles ----
    { category: 'Miracles', q: 'Who did Jesus raise from the dead after four days?', options: ['Jairus\u2019 daughter', 'Lazarus', 'Tabitha', 'Eutychus'], answer: 1, ref: 'John 11:43-44' },
    { category: 'Miracles', q: 'How many people did Jesus feed with five loaves and two fish?', options: ['3,000', '4,000', '5,000', '10,000'], answer: 2, ref: 'Matthew 14:21' },
    { category: 'Miracles', q: 'What happened when Jesus touched the eyes of the blind man?', options: ['Nothing', 'He could see', 'He fell asleep', 'He cried'], answer: 1, ref: 'Matthew 9:29-30' },
    { category: 'Miracles', q: 'Jesus calmed a storm on which body of water?', options: ['Jordan River', 'Red Sea', 'Sea of Galilee', 'Dead Sea'], answer: 2, ref: 'Mark 4:39' },
    { category: 'Miracles', q: 'Which disciple walked on water with Jesus?', options: ['John', 'James', 'Andrew', 'Peter'], answer: 3, ref: 'Matthew 14:29' },
];

// Quiz state
const QUIZ_STATE = {
    questions: [],
    currentIndex: 0,
    answers: [],       // { selected, correct }
    completed: false,
    dateKey: ''
};

function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seedRandom(seed) {
    // Simple seeded PRNG (mulberry32)
    let t = seed | 0;
    return function () {
        t = (t + 0x6D2B79F5) | 0;
        let v = t;
        v = Math.imul(v ^ (v >>> 15), v | 1);
        v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
        return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
    };
}

function dateToSeed(dateKey) {
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
        hash = ((hash << 5) - hash) + dateKey.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function getDailyQuestions(count) {
    const dateKey = getTodayKey();
    const rng = seedRandom(dateToSeed(dateKey));
    const shuffled = [...QUIZ_QUESTIONS];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

function initializeQuiz() {
    const dateKey = getTodayKey();
    QUIZ_STATE.dateKey = dateKey;

    // Format date for display
    const dateEl = document.getElementById('quiz-date');
    if (dateEl) {
        const d = new Date();
        dateEl.textContent = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Check if quiz was already completed today
    const saved = loadQuizResult(dateKey);
    if (saved) {
        QUIZ_STATE.questions = saved.questions;
        QUIZ_STATE.answers = saved.answers;
        QUIZ_STATE.currentIndex = saved.questions.length;
        QUIZ_STATE.completed = true;
        showQuizResults();
        return;
    }

    // Pick 10 questions for today
    QUIZ_STATE.questions = getDailyQuestions(10);
    QUIZ_STATE.currentIndex = 0;
    QUIZ_STATE.answers = [];
    QUIZ_STATE.completed = false;

    showQuizQuestion();
}

function showQuizQuestion() {
    const loader = document.getElementById('quiz-loader');
    const card = document.getElementById('quiz-question-card');
    const results = document.getElementById('quiz-results');
    const review = document.getElementById('quiz-review');

    if (loader) loader.style.display = 'none';
    if (results) results.hidden = true;
    if (review) review.hidden = true;
    if (card) card.hidden = false;

    const idx = QUIZ_STATE.currentIndex;
    const total = QUIZ_STATE.questions.length;
    const question = QUIZ_STATE.questions[idx];

    // Update progress
    const progressBar = document.getElementById('quiz-progress-bar');
    const progressText = document.getElementById('quiz-progress-text');
    if (progressBar) progressBar.style.width = `${((idx) / total) * 100}%`;
    if (progressText) progressText.textContent = `Question ${idx + 1} of ${total}`;

    // Update score badge
    const badge = document.getElementById('quiz-score-badge');
    if (badge) {
        const correctSoFar = QUIZ_STATE.answers.filter(a => a.correct).length;
        if (idx > 0) {
            badge.hidden = false;
            badge.textContent = `${correctSoFar}/${idx} correct`;
        } else {
            badge.hidden = true;
        }
    }

    // Set question content
    document.getElementById('quiz-category').textContent = question.category;
    document.getElementById('quiz-question').textContent = question.q;

    // Build options
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';
    question.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt;
        btn.addEventListener('click', () => selectQuizAnswer(i));
        optionsContainer.appendChild(btn);
    });

    // Hide feedback & next
    const feedback = document.getElementById('quiz-feedback');
    const nextBtn = document.getElementById('quiz-next-btn');
    if (feedback) { feedback.hidden = true; feedback.className = 'quiz-feedback'; }
    if (nextBtn) nextBtn.hidden = true;
}

function selectQuizAnswer(selectedIndex) {
    const question = QUIZ_STATE.questions[QUIZ_STATE.currentIndex];
    const correctIndex = question.answer;
    const isCorrect = selectedIndex === correctIndex;

    QUIZ_STATE.answers.push({ selected: selectedIndex, correct: isCorrect });

    // Mark options
    const options = document.querySelectorAll('#quiz-options .quiz-option');
    options.forEach((btn, i) => {
        btn.classList.add('disabled');
        btn.disabled = true;
        if (i === correctIndex) btn.classList.add('correct');
        if (i === selectedIndex && !isCorrect) btn.classList.add('incorrect');
    });

    // Show feedback
    const feedback = document.getElementById('quiz-feedback');
    const feedbackText = document.getElementById('quiz-feedback-text');
    const refEl = document.getElementById('quiz-reference');
    feedback.hidden = false;
    feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
    feedbackText.textContent = isCorrect
        ? 'Correct! Well done.'
        : `Incorrect. The correct answer is: ${question.options[correctIndex]}`;
    refEl.textContent = question.ref ? `Reference: ${question.ref}` : '';

    // Show next button
    const nextBtn = document.getElementById('quiz-next-btn');
    if (QUIZ_STATE.currentIndex < QUIZ_STATE.questions.length - 1) {
        nextBtn.textContent = 'Next Question';
    } else {
        nextBtn.textContent = 'See Results';
    }
    nextBtn.hidden = false;
    nextBtn.onclick = nextQuizQuestion;
}

function nextQuizQuestion() {
    QUIZ_STATE.currentIndex++;
    if (QUIZ_STATE.currentIndex >= QUIZ_STATE.questions.length) {
        QUIZ_STATE.completed = true;
        saveQuizResult();
        showQuizResults();
    } else {
        showQuizQuestion();
    }
}

function showQuizResults() {
    const card = document.getElementById('quiz-question-card');
    const loader = document.getElementById('quiz-loader');
    const results = document.getElementById('quiz-results');
    const review = document.getElementById('quiz-review');

    if (card) card.hidden = true;
    if (loader) loader.style.display = 'none';
    if (review) review.hidden = true;
    if (results) results.hidden = false;

    const total = QUIZ_STATE.questions.length;
    const correct = QUIZ_STATE.answers.filter(a => a.correct).length;
    const pct = Math.round((correct / total) * 100);

    // Progress bar full
    const progressBar = document.getElementById('quiz-progress-bar');
    const progressText = document.getElementById('quiz-progress-text');
    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = 'Quiz Complete!';

    const badge = document.getElementById('quiz-score-badge');
    if (badge) { badge.hidden = false; badge.textContent = `${correct}/${total}`; }

    // Icon & title
    const icon = document.getElementById('quiz-results-icon');
    const title = document.getElementById('quiz-results-title');
    const score = document.getElementById('quiz-results-score');

    if (pct === 100) {
        icon.textContent = '🏆';
        title.textContent = 'Perfect Score!';
    } else if (pct >= 80) {
        icon.textContent = '🌟';
        title.textContent = 'Excellent!';
    } else if (pct >= 60) {
        icon.textContent = '👏';
        title.textContent = 'Great Job!';
    } else if (pct >= 40) {
        icon.textContent = '📖';
        title.textContent = 'Keep Studying!';
    } else {
        icon.textContent = '💪';
        title.textContent = 'Keep Going!';
    }

    score.textContent = `You scored ${correct} out of ${total} (${pct}%)`;

    // Breakdown stats
    const breakdown = document.getElementById('quiz-results-breakdown');
    breakdown.innerHTML = `
        <div class="quiz-stat"><span class="quiz-stat-value">${correct}</span><span class="quiz-stat-label">Correct</span></div>
        <div class="quiz-stat"><span class="quiz-stat-value">${total - correct}</span><span class="quiz-stat-label">Incorrect</span></div>
        <div class="quiz-stat"><span class="quiz-stat-value">${pct}%</span><span class="quiz-stat-label">Score</span></div>
    `;

    // Review button
    const reviewBtn = document.getElementById('quiz-review-btn');
    reviewBtn.onclick = showQuizReview;

    // Back-to-results button
    const backBtn = document.getElementById('quiz-back-results-btn');
    if (backBtn) backBtn.onclick = () => {
        review.hidden = true;
        results.hidden = false;
    };
}

function showQuizReview() {
    const results = document.getElementById('quiz-results');
    const review = document.getElementById('quiz-review');
    const list = document.getElementById('quiz-review-list');

    if (results) results.hidden = true;
    if (review) review.hidden = false;

    list.innerHTML = '';
    QUIZ_STATE.questions.forEach((q, i) => {
        const a = QUIZ_STATE.answers[i];
        const div = document.createElement('div');
        div.className = `quiz-review-item ${a.correct ? 'review-correct' : 'review-incorrect'}`;
        const yourAnswer = q.options[a.selected];
        const correctAnswer = q.options[q.answer];
        div.innerHTML = `
            <p class="quiz-review-q">${i + 1}. ${escapeHTML(q.q)}</p>
            ${a.correct
                ? `<p class="quiz-review-answer"><span class="correct-answer">✓ ${escapeHTML(correctAnswer)}</span></p>`
                : `<p class="quiz-review-answer">Your answer: <span class="wrong-answer">${escapeHTML(yourAnswer)}</span></p>
                   <p class="quiz-review-answer">Correct: <span class="correct-answer">${escapeHTML(correctAnswer)}</span></p>`
            }
            ${q.ref ? `<p class="quiz-review-ref">${escapeHTML(q.ref)}</p>` : ''}
        `;
        list.appendChild(div);
    });
}

function saveQuizResult() {
    try {
        const data = {
            dateKey: QUIZ_STATE.dateKey,
            questions: QUIZ_STATE.questions,
            answers: QUIZ_STATE.answers
        };
        localStorage.setItem('bibleQuiz_' + QUIZ_STATE.dateKey, JSON.stringify(data));

        // Save streak
        const streak = loadQuizStreak();
        streak.lastDate = QUIZ_STATE.dateKey;
        streak.totalQuizzes = (streak.totalQuizzes || 0) + 1;
        localStorage.setItem('bibleQuizStreak', JSON.stringify(streak));
    } catch (e) {
        // localStorage full or unavailable
    }
}

function loadQuizResult(dateKey) {
    try {
        const raw = localStorage.getItem('bibleQuiz_' + dateKey);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function loadQuizStreak() {
    try {
        const raw = localStorage.getItem('bibleQuizStreak');
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}


// ========================================
// Bible Stories for Kids
// ========================================

const BIBLE_STORIES = [
    {
        id: 'creation',
        title: 'The Creation of the World',
        icon: '🌍',
        testament: 'old-testament',
        reference: 'Genesis 1–2',
        snippet: 'God creates the heavens, the earth, and everything in them in six days.',
        sections: [
            { title: 'In the Beginning', text: 'A very, very long time ago — before there were any mountains or oceans, before there were any animals or trees, before there were any people at all — there was nothing. Absolutely nothing. No light, no sound, no colors. Just deep, empty darkness stretching out in every direction, as far as you could imagine and even farther.\n\nBut there was someone there in that darkness. God was there. And God had the most wonderful, amazing, incredible plan. He was about to do something that had never been done before — He was going to create the entire world, and everything in it, out of absolutely nothing! Can you imagine that? Making something out of nothing at all? That\'s how powerful God is.' },
            { title: 'Day One — Light!', text: 'God spoke into the darkness, and His very first words were, "Let there be light!" And just like that — WHOOSH — brilliant, beautiful light burst into existence! It was as if someone had turned on the biggest, brightest lamp in the universe. The light was warm and golden and wonderful.\n\nGod looked at the light and smiled. He saw that it was good. Then He separated the light from the darkness, giving the light a name — "Day" — and giving the darkness a name — "Night." And so, the very first day passed, with an evening and a morning. The story of our world had begun!' },
            { title: 'Day Two — The Sky', text: 'On the second day, God made the sky. He took the waters and separated them — some stayed below and some went high above. In between, He placed a great big, beautiful expanse that stretched from one end of the earth to the other. He called it "sky."\n\nImagine looking up and seeing the sky for the very first time! The vast blue dome reaching up, up, up, higher than anything. It was like a magnificent ceiling over the whole world, and behind it, the waters above waited quietly, ready for the day when God would send rain to water the earth below.' },
            { title: 'Day Three — Land, Sea, and Plants', text: 'On the third day, God did two amazing things! First, He gathered all the water below the sky into one place and let dry land appear. As the waters rushed and swirled together to form the mighty oceans, seas, and rivers, the ground rose up — forming hills, valleys, mountains, and wide, flat plains. God called the dry ground "land" and the gathered waters "seas." He looked at it all and said, "This is good!"\n\nBut God wasn\'t done with day three yet! He told the land to bring forth plants and trees. And immediately, the bare brown ground burst into color! Tiny green seedlings pushed through the soil and grew into tall grasses. Flowers of every imaginable color — red, yellow, purple, blue, orange, and pink — bloomed across the meadows. Enormous trees stretched their branches toward the sky, heavy with fruits and nuts. Apple trees, orange trees, fig trees, mighty oaks, towering pines — God created them all. Each plant had seeds inside it, so more plants could grow in the future. God looked at the colorful, living land and saw that it was very, very good!' },
            { title: 'Day Four — Sun, Moon, and Stars', text: 'On the fourth day, God filled the sky with lights. He made the sun — a great, blazing ball of light to rule the daytime and keep the earth warm. It was so bright and powerful that it chased away every shadow! Then He made the moon — a smaller, gentle light to rule the night and shine softly over the sleeping world.\n\nBut God wasn\'t finished. He also made the stars! Not just a few — but billions and billions of them, in every direction, as far as the eye could see and much farther. Some were tiny pinpricks of light and others were enormous, blazing suns far, far away. He scattered them across the darkness like glittering diamonds on black velvet. The stars were so many that no one could ever count them all. God set them all in place and gave them their seasons, their paths, and their purposes. And when He was done, the night sky was the most beautiful thing you could ever imagine.' },
            { title: 'Day Five — Fish and Birds', text: 'On the fifth day, God turned His attention to the waters and the sky. He said, "Let the waters be filled with living creatures, and let birds fly above the earth across the sky!"\n\nSuddenly, the oceans came alive! Tiny, shimmering fish darted through the shallow waters while enormous whales dove deep, deep, deep into the dark blue sea. Dolphins leaped joyfully out of the waves. Colorful coral grew on the ocean floor, and sea turtles glided peacefully through the warm currents. Jellyfish floated like gentle umbrellas, and octopuses explored rocky caves. Crabs, lobsters, seahorses, starfish — the water was teeming with life!\n\nAnd up above, the sky was suddenly filled with birds! Eagles soared high on the wind with their great, broad wings. Tiny hummingbirds hovered over flowers, their wings beating so fast they were just a blur. Parrots flashed their brilliant colors, owls blinked their wise eyes, and sparrows chirped their happy songs. Pelicans dove into the water for fish, and herons stood tall and elegant in the marshes.\n\nGod blessed all these creatures and told them to be fruitful and multiply — to fill the seas and fill the skies. And He saw that it was good!' },
            { title: 'Day Six — Animals and People', text: 'On the sixth day, God made all the animals that live on the land. And what an incredible day it was! Lions padded through the grass with their golden manes. Elephants trumpeted and swung their long trunks. Giraffes stretched their spotted necks to nibble leaves from the tallest trees. Bears lumbered through the forests, rabbits hopped through the meadows, and horses galloped across the open plains.\n\nGod made the tiny creatures too — ants that marched in long, orderly lines, ladybugs with their bright red shells, butterflies that floated through the air like living flowers, and fireflies that blinked their tiny lights in the evening. He made dogs and cats, cows and sheep, frogs and lizards, snakes and mice. Every animal you can think of — and many more — God created on this one amazing day.\n\nBut then God did something extra special. He said, "Let Us make people in Our image, according to Our likeness." And God took dust from the ground and formed a man. He breathed the breath of life into the man\'s nostrils, and the man came alive! God named him Adam.\n\nGod planted a beautiful garden in a place called Eden and put Adam there. It was the most perfect, wonderful garden you could ever imagine. Then God said, "It is not good for the man to be alone." So He caused Adam to fall into a deep sleep, and from one of Adam\'s ribs, God made a woman. Adam named her Eve, and they were so happy together. God blessed them and gave them the job of taking care of the earth and all its creatures.' },
            { title: 'Day Seven — Rest', text: 'On the seventh day, something different happened. God had finished all His work of creating. He looked at absolutely everything He had made — the light and darkness, the sky and seas, the land and plants, the sun, moon, and stars, the fish and birds, the animals, and the people — and He saw that it was all very, very good.\n\nSo on the seventh day, God rested. Not because He was tired — God never gets tired! But He rested to enjoy everything He had created and to show us something important: that rest is good, and that we need it too. He blessed the seventh day and made it holy — a special day set apart for rest and for remembering how wonderful God is.\n\nAnd so, the whole amazing story of the world began — all because God spoke, and His powerful words brought everything to life out of nothing at all.' }
        ],
        moral: 'God made everything in the world with love and care, including you! Every person is special because God created them in His own image. The world is God\'s gift, and we are invited to enjoy it and take care of it.',
        keyVerse: { text: 'In the beginning God created the heavens and the earth.', ref: 'Genesis 1:1' }
    },
    {
        id: 'adam-eve',
        title: 'Adam and Eve',
        icon: '🍎',
        testament: 'old-testament',
        reference: 'Genesis 2–3',
        snippet: 'The first man and woman live in a beautiful garden but make a choice that changes everything.',
        sections: [
            { title: 'The Garden of Eden', text: 'After God created Adam and Eve, He placed them in the most wonderful garden anyone could ever imagine. It was called the Garden of Eden, and it was absolutely perfect in every single way.\n\nCrystal-clear rivers flowed through the garden, sparkling in the sunlight. Trees grew everywhere — tall, strong trees with broad leaves that gave cool shade, and fruit trees loaded with the most delicious fruits you\'ve ever tasted. There were apples, figs, pomegranates, dates, and many other fruits that no one has ever seen since. The air smelled sweet with flowers of every color — roses, lilies, and blossoms that glowed like jewels.\n\nAnimals lived peacefully in the garden alongside Adam and Eve. Lions lay down next to lambs. Rabbits played near bears. Birds sang in the trees, and butterflies danced through the warm air. Nothing was scary, nothing was dangerous, and nothing was sad. There was no sickness, no pain, and no death. Everything was perfect because God had made it that way.' },
            { title: 'One Special Rule', text: 'God loved Adam and Eve so much. He walked with them in the garden in the cool of the day, talking with them like a father talks with his children. He gave them an amazing job — to care for the garden and name all the animals. Can you imagine naming every single animal? Adam looked at each one and gave it the perfect name.\n\nGod told Adam and Eve that they could eat fruit from any tree in the entire garden — and there were hundreds and hundreds of beautiful trees! But there was one rule, just one: "You must not eat from the Tree of the Knowledge of Good and Evil," God said. "If you eat from it, you will surely die." It wasn\'t a hard rule. They had every other tree in the whole garden! God gave them this rule because He loved them and wanted to protect them from something terrible.' },
            { title: 'The Serpent\'s Trick', text: 'Now, there was a serpent in the garden — the craftiest, most cunning of all the creatures God had made. One day, the serpent slithered up to Eve near the forbidden tree and spoke to her in a smooth, tricky voice.\n\n"Did God really say you can\'t eat from any tree in the garden?" the serpent asked, twisting God\'s words.\n\nEve answered honestly, "We can eat fruit from any tree — except this one in the middle of the garden. God said if we eat it or even touch it, we\'ll die."\n\nThe serpent hissed softly and said, "You won\'t die! God knows that if you eat this fruit, your eyes will be opened and you\'ll become like God, knowing good and evil. He\'s keeping something good from you!"\n\nEve looked at the fruit. It was beautiful. It looked delicious. And the serpent\'s words echoed in her mind — she wanted to be wise. So she reached out, picked the fruit, and took a bite. Then she gave some to Adam, who was right there with her, and he ate it too.\n\nThe moment they swallowed, everything changed. A terrible feeling swept over them. They felt ashamed and exposed. They looked at themselves and realized they were naked, so they sewed fig leaves together to try to cover themselves. The peace and innocence they had known was gone.' },
            { title: 'Hiding from God', text: 'That evening, Adam and Eve heard a familiar sound — God walking through the garden in the cool breeze of the day. But instead of running to meet Him with joy like they always had, they felt afraid. For the very first time, they felt guilt and shame. They hid among the trees.\n\n"Where are you?" God called out. He knew exactly where they were, of course — but He was giving them a chance to come to Him.\n\nAdam answered in a trembling voice, "I heard You in the garden, and I was afraid because I was naked, so I hid."\n\nGod asked sadly, "Who told you that you were naked? Have you eaten from the tree I told you not to eat from?"\n\nAdam pointed at Eve: "The woman You gave me — she gave me the fruit, and I ate it." Eve pointed at the serpent: "The serpent tricked me, and I ate it." Everyone was blaming someone else instead of taking responsibility for what they had done.' },
            { title: 'Consequences and a Promise', text: 'God\'s heart was broken. His children had disobeyed Him — the one rule He had given them, they had broken. There had to be consequences.\n\nGod told the serpent, "Because you have done this, you are cursed above all animals. You will crawl on your belly and eat dust all the days of your life." But then God said something mysterious and wonderful — He promised that one day, a descendant of the woman would crush the serpent\'s head. This was a hint about Jesus, who would one day come to defeat evil!\n\nGod told Adam and Eve that life would now be harder. Working the ground would be difficult. There would be thorns and thistles. There would be pain and sadness. And one day, they would die and return to the dust they were made from.\n\nBut even in this sad moment, God showed His love. He made clothes out of animal skins for Adam and Eve — covering their shame Himself, because the fig leaves they had made weren\'t good enough. Then He sent them out of the Garden of Eden. An angel with a flaming sword guarded the entrance so they could never go back to the Tree of Life.\n\nEven though Adam and Eve had disobeyed, God never stopped loving them. He had already set in motion a plan to bring His children back to Himself — a plan that would one day bring a Savior into the world.' },
            { title: 'A New Beginning', text: 'Outside the garden, life was very different for Adam and Eve. They had to work hard to grow food. They experienced cold, heat, and storms they had never known before. But God was still with them. He didn\'t abandon them.\n\nAdam and Eve had children — first Cain, then Abel, and later many more sons and daughters. Life wasn\'t the same as it had been in the perfect garden, but there were still many blessings. There were still beautiful sunsets, starry nights, and the joy of holding a newborn child.\n\nAnd deep in their hearts, they held onto God\'s promise — that one day, someone from their family line would come to make things right again. That promise was like a tiny seed planted in the ground, and it would grow and grow for thousands of years until, at just the right time, it blossomed into the greatest gift the world has ever known.' }
        ],
        moral: 'God gives us rules because He loves us and wants to protect us. When we make wrong choices, there are consequences — but God never stops loving us. He always has a plan to bring us back to Him.',
        keyVerse: { text: 'The Lord God took the man and put him in the Garden of Eden to work it and take care of it.', ref: 'Genesis 2:15' }
    },
    {
        id: 'noahs-ark',
        title: 'Noah\'s Ark',
        icon: '🚢',
        testament: 'old-testament',
        reference: 'Genesis 6–9',
        snippet: 'God asks Noah to build a giant boat to save his family and the animals from a great flood.',
        sections: [
            { title: 'A World Gone Wrong', text: 'Many, many years had passed since Adam and Eve left the Garden of Eden. People had spread across the earth and had many children and grandchildren and great-grandchildren. But something very sad had happened over all those years — people had become terribly wicked.\n\nAlmost everyone on earth had forgotten about God. They lied, they cheated, they were cruel to each other, and they did all sorts of terrible things. Every day, it seemed to get worse and worse. The Bible tells us that every thought in people\'s hearts was only evil, all the time. Can you imagine that? Never a kind thought, never a helpful deed, never a prayer to God.\n\nGod looked down at the earth and His heart was filled with sorrow. He was deeply grieved — it hurt Him to see how far people had fallen from the beautiful life He had planned for them. He decided that He would send a great flood to wash the wickedness away and start fresh.' },
            { title: 'Noah Finds Favor', text: 'But in the middle of all that wickedness, there was one man who was different. His name was Noah.\n\nNoah loved God with his whole heart. While everyone around him was lying and stealing and fighting, Noah tried to do what was right. He talked to God. He taught his three sons — Shem, Ham, and Japheth — about God. He was honest, kind, and faithful.\n\nThe Bible says that Noah "walked with God" — that means they were close friends. God saw Noah\'s good heart, and it made Him glad. Out of all the people on the entire earth, Noah was the one God chose for a very important mission.\n\nOne day, God spoke to Noah and told him His plan. "I am going to put an end to all the wickedness on earth," God said. "I am going to send a great flood. But I will save you and your family because you have been faithful to Me. I need you to build an ark."' },
            { title: 'Building the Ark', text: '"What\'s an ark?" Noah might have wondered. God told him exactly what to do. He was to build an enormous boat — not just any boat, but the biggest boat the world had ever seen!\n\nGod gave Noah very specific instructions. The ark was to be 300 cubits long (that\'s about 450 feet — longer than a football field!), 50 cubits wide, and 30 cubits high. It would have three decks inside, one door in the side, and a window near the top. It was to be made out of special wood called gopher wood and covered inside and out with a waterproof coating called pitch.\n\nNoah didn\'t argue. He didn\'t ask questions. He simply obeyed. Day after day, week after week, month after month, year after year, Noah worked on building the ark. It took a very, very long time — possibly as long as 100 years!\n\nAll the while, people walked by and laughed at him. "Noah, you crazy old man! What are you building? A giant boat on dry land? There isn\'t even a lake nearby! Have you lost your mind?" But Noah didn\'t stop. He kept hammering, sawing, and building, because God had told him to, and Noah trusted God. He also warned the people that a flood was coming, but nobody listened.' },
            { title: 'The Animals Come', text: 'Finally, after all those years of work, the ark was finished. It was absolutely enormous — like a floating building! And then something truly amazing happened.\n\nGod sent the animals to Noah. Two of every kind of animal — one male and one female — came walking, crawling, hopping, and flying toward the ark. Elephants lumbered in with their heavy footsteps. Giraffes bent their long necks to squeeze through the door. Lions and tigers padded in side by side. Tiny mice scurried in. Colorful parrots flew in and perched on the beams. Snakes slithered in. Monkeys swung in. Turtles crawled in slowly. Two by two, pair by pair, the animals came from every direction — from forests and deserts, mountains and plains.\n\nNoah didn\'t have to chase them or catch them. God brought them right to the ark! Noah and his sons guided them inside, put them in their places, and stored food for every kind of animal.\n\nThen Noah, his wife, his three sons, and their three wives — eight people in all — went inside the ark. And then God Himself shut the door. It closed with a heavy, final THUD that echoed across the land. Everyone inside was safe. Everyone outside had made their choice.' },
            { title: 'The Great Flood', text: 'Seven days after the door closed, it began. The sky turned dark as thick, black clouds rolled in from every direction. Then the rain came — not a gentle shower, but a torrential downpour unlike anything the world had ever seen. Water didn\'t just fall from the sky. The Bible says the "fountains of the great deep burst open" — that means water exploded up from underground too!\n\nIt rained and rained and rained. For forty days and forty nights, the water never stopped. Streams became rivers. Rivers became lakes. Lakes became seas. The water rose higher and higher — covering the roads, then the houses, then the trees, then even the hills and the mountains. Eventually, every bit of land on the entire earth was covered with water. It was like one enormous ocean stretching from horizon to horizon in every direction.\n\nInside the ark, Noah and his family could hear the rain pounding on the roof and the waves crashing against the sides. The ark rocked and swayed, but it never tipped over. God kept them safe. The animals rested in their stalls, and Noah and his family cared for them day after day — feeding the lions, giving water to the elephants, and making sure every creature was healthy and comfortable.\n\nFor five long months, the ark floated on the endless water. It was quiet and sometimes lonely, but Noah never lost faith. He knew God was in control.' },
            { title: 'The Waters Go Down', text: 'Then one day, God sent a wind over the earth, and slowly — very slowly — the water began to go down. The rain had stopped, the underground fountains had closed, and now the great flood was receding.\n\nAfter 150 days, the ark came to rest on the top of a mountain range called Ararat. But there was still water everywhere around them. Noah waited patiently. After forty more days, he opened the window of the ark and sent out a raven. The raven flew back and forth but found no place to land.\n\nThen Noah sent out a dove. The dove flew around but couldn\'t find any dry land either, so she came back to the ark. Noah gently reached out his hand, caught her, and brought her back inside. He waited seven more days and sent the dove out again. This time, the dove came back with a fresh olive branch in her beak! Noah\'s heart leaped with joy — somewhere out there, a tree was growing above the water! Life was returning!\n\nNoah waited seven more days and sent the dove out one more time. This time, she didn\'t come back at all. She had found a home. The land was dry.' },
            { title: 'The Rainbow Promise', text: 'God told Noah, "Come out of the ark — you, your wife, your sons, and their wives. Bring out every living creature, so they can spread across the earth and be fruitful and multiply." Noah opened the great door, and the animals poured out — running, flying, leaping, and crawling in every direction, filling the fresh, clean world.\n\nThe first thing Noah did was build an altar and give thanks to God. He worshipped the Lord who had saved him and his family through the flood. God was pleased with Noah\'s grateful heart.\n\nThen God made a covenant — a solemn promise — with Noah and with every living creature on earth. "Never again will I destroy the earth with a flood," God said. "I promise." And to seal that promise, God placed something new and beautiful in the sky — a rainbow!\n\nThe glowing arc of color stretched across the dark rain clouds — red, orange, yellow, green, blue, indigo, and violet — the most beautiful sight Noah had ever seen. God said, "Whenever the rainbow appears in the clouds, I will see it and remember My everlasting covenant with every living creature on earth."\n\nAnd so, every time you see a rainbow after a storm, you can remember that it\'s God\'s promise — painted across the sky — that He will never flood the whole earth again. It\'s a reminder that even after the darkest storms, God\'s promises shine through in brilliant color.' }
        ],
        moral: 'When we trust and obey God, even when others don\'t understand or laugh at us, He takes care of us. God always keeps His promises, and His love is faithful through every storm.',
        keyVerse: { text: 'I have set my rainbow in the clouds, and it will be the sign of the covenant between me and the earth.', ref: 'Genesis 9:13' }
    },
    {
        id: 'abraham',
        title: 'Abraham\'s Big Promise',
        icon: '⭐',
        testament: 'old-testament',
        reference: 'Genesis 12–22',
        snippet: 'God makes an incredible promise to Abraham that his family will be as many as the stars.',
        sections: [
            { title: 'God Calls Abram', text: 'In a bustling city called Ur, in a land called Mesopotamia, there lived a man named Abram. He was married to a beautiful woman named Sarai, and they lived a comfortable life surrounded by family and friends. Ur was a big, wealthy city with grand buildings and busy markets. It was all Abram had ever known.\n\nBut one day, everything changed. God spoke to Abram — and what He said was truly extraordinary.\n\n"Leave your country," God said. "Leave your family and your father\'s house, and go to a land that I will show you. I will make you into a great nation. I will bless you and make your name great, and you will be a blessing to others. All peoples on earth will be blessed through you."\n\nThink about how amazing and scary that must have been! God was asking Abram to leave everything he knew — his home, his city, most of his family — and travel to a place he had never been, a place he couldn\'t even find on a map. God didn\'t tell him exactly where he was going. He just said, "Go, and I will show you."\n\nBut Abram trusted God. He packed up everything he owned, took Sarai and his nephew Lot, gathered his servants, his flocks, and his herds, and set off on a long, dusty journey to a land he had never seen. He was 75 years old when he started this great adventure!' },
            { title: 'A Promise Under the Stars', text: 'Abram traveled for many weeks, crossing deserts and rivers until he reached the land of Canaan. God appeared to him and said, "This is the land I will give to your descendants." Abram built an altar and worshipped God right there.\n\nBut years went by, and something troubled Abram deeply. God had promised to make him into a great nation — but Abram and Sarai didn\'t have any children. Not one. They had been waiting and waiting, and Sarai was getting older. How could Abram become the father of a great nation if he didn\'t even have a single child?\n\nOne clear, dark night, God took Abram outside his tent. "Look up at the sky," God said. "Count the stars — if you can." Abram tilted his head back and gazed up at the heavens. Thousands upon thousands of stars glittered across the black velvet sky — too many to count, stretching to infinity.\n\nThen God made an incredible promise: "So shall your descendants be — as many as the stars in the sky!"\n\nAbram stared at those countless stars and something amazing happened in his heart. He believed God. Despite his old age, despite having no children, despite the impossibility of it all — he believed. And the Bible tells us that God counted Abram\'s faith as righteousness. God was pleased because Abram trusted Him.' },
            { title: 'New Names and a Heavenly Visit', text: 'More years passed — thirteen more years, in fact. Abram was now 99 years old, and Sarai was 89. Still no child. Can you imagine waiting that long for something God promised you?\n\nThen God appeared to Abram again and said something wonderful. "I am changing your name. You will no longer be called Abram. From now on, your name is Abraham, which means \'father of many nations.\' And Sarai will now be called Sarah, which means \'princess.\' I will give you a son through Sarah by this time next year."\n\nAbraham fell on his face and laughed! Not a mocking laugh, but a laugh of pure amazement. "Can a man who is 100 years old have a son? Can Sarah, who is 90, have a baby?" It seemed absolutely impossible!\n\nSoon after, three mysterious visitors came to Abraham\'s tent. Abraham welcomed them with great hospitality — he washed their feet, prepared a feast of his best food, and served them under the shade of the great oak trees. During the meal, one of the visitors said, "I will return to you about this time next year, and Sarah will have a son."\n\nSarah was listening from inside the tent, and she laughed to herself. "I\'m too old to have a baby!" she thought.\n\nBut the visitor heard her and said, "Why did Sarah laugh? Is anything too hard for the Lord?" Those words hung in the air: Is anything too hard for the Lord? And the answer, of course, is no.' },
            { title: 'Isaac — The Son of Laughter', text: 'And sure enough, exactly when God said it would happen — it happened! Sarah became pregnant, and at the age of 90, she gave birth to a beautiful, healthy baby boy. Abraham was 100 years old — the oldest new dad in history!\n\nThey named him Isaac, which means "he laughs." Sarah said with tears of joy streaming down her face, "God has brought me laughter, and everyone who hears about this will laugh with me! Who would have said to Abraham that Sarah would nurse children? Yet I have given him a son in his old age!"\n\nThe day Isaac was weaned, Abraham threw a great feast to celebrate. The whole camp was filled with music, dancing, and laughter. After all those years of waiting — after decades of wondering if God\'s promise would ever come true — here was the proof, lying right there in Sarah\'s arms, gurgling and cooing.\n\nIsaac grew up strong and healthy, and Abraham loved him more than anything in the world. He was the child of the promise, the beginning of a family that would eventually become as numerous as the stars in the sky and the sand on the seashore — just as God had said.' },
            { title: 'The Ultimate Test', text: 'But then came the hardest moment of Abraham\'s life.\n\nGod spoke to Abraham and said, "Take your son, your only son, Isaac, whom you love, and go to the region of Moriah. Sacrifice him there as a burnt offering on one of the mountains I will show you."\n\nAbraham\'s heart must have nearly broken. Isaac was his beloved son — the miracle child he had waited for his entire life! How could God ask him to give up Isaac? It didn\'t make sense. But Abraham had learned something over all those long years: God can always be trusted, even when we don\'t understand.\n\nEarly the next morning, Abraham got up, loaded his donkey with wood, and set out with Isaac and two servants. After three days of traveling, Abraham saw the mountain in the distance. He told the servants to wait, and he and Isaac continued alone. Isaac carried the wood on his back, and Abraham carried the fire and the knife.\n\nAs they walked, Isaac looked at his father and asked, "Father, I see the fire and the wood, but where is the lamb for the offering?" Abraham\'s voice trembled as he answered, "God Himself will provide the lamb, my son." And they walked on together.\n\nWhen they reached the top of the mountain, Abraham built an altar and laid the wood on it. Then, with a breaking heart and trembling hands, he bound Isaac. But just as Abraham raised the knife, a powerful voice called from heaven: "Abraham! Abraham! Do not lay a hand on the boy! Now I know that you fear God, because you have not withheld from Me your son, your only son."\n\nAbraham looked up and saw a ram caught by its horns in a thicket nearby. God had provided a sacrifice! Abraham untied Isaac, and they offered the ram together, tears of relief and gratitude streaming down their faces. Abraham named that place "The Lord Will Provide," because God had done just that — at the very last moment, in the most amazing way.' },
            { title: 'A Legacy of Faith', text: 'After that day on the mountain, God reaffirmed His promise to Abraham with the strongest possible words: "Because you have done this and have not withheld your son, your only son, I will surely bless you and make your descendants as numerous as the stars in the sky and as the sand on the seashore. Through your offspring, all nations on earth will be blessed."\n\nAbraham lived to be 175 years old. He saw Isaac grow into a fine young man, get married to a woman named Rebekah, and have sons of his own — Jacob and Esau. And from Jacob\'s twelve sons came the twelve tribes of Israel — an entire nation!\n\nSo God\'s promise came true, step by step, generation by generation. And it\'s still coming true today! Billions of people around the world — Jews, Christians, and Muslims — all look back to Abraham as the father of their faith. He really did become the father of many nations, just as God said he would.\n\nAbraham\'s story teaches us that faith means trusting God even when we can\'t see how things will work out. It means obeying even when it\'s hard. It means believing that God\'s timing is perfect, even when we have to wait a very, very long time. Because with God, nothing — absolutely nothing — is impossible.' }
        ],
        moral: 'God\'s promises may take time, but He always keeps them. We can trust God even when things seem impossible. Faith means believing God even when we can\'t see the whole picture.',
        keyVerse: { text: 'I will make you into a great nation, and I will bless you.', ref: 'Genesis 12:2' }
    },
    {
        id: 'joseph',
        title: 'Joseph and the Colorful Coat',
        icon: '🧥',
        testament: 'old-testament',
        reference: 'Genesis 37–47',
        snippet: 'Joseph goes from being sold by his brothers to becoming the second most powerful person in Egypt.',
        sections: [
            { title: 'The Favorite Son', text: 'Jacob — the grandson of Abraham — had twelve sons, but there was one son he loved above all the others: Joseph. Joseph was the eleventh son, born to Jacob\'s favorite wife, Rachel, after many years of waiting. Jacob adored Joseph, and he showed it by giving him something very special — a beautiful, colorful coat.\n\nThis wasn\'t just any coat. It was a robe of many colors, woven with threads of red, blue, purple, gold, and green. It was magnificent — the kind of coat a prince would wear. When Joseph put it on, everyone could see how much his father loved him.\n\nBut that beautiful coat caused a big problem. Joseph\'s ten older brothers saw how their father treated Joseph, and they burned with jealousy. "Father loves him more than all of us!" they grumbled to each other. "He gets a fancy coat while we get nothing!" They became so bitter that they couldn\'t even say a kind word to Joseph.\n\nTo make matters worse, Joseph had dreams — special dreams from God. In one dream, he saw sheaves of grain in a field. His brothers\' sheaves all bowed down to Joseph\'s sheaf. In another dream, the sun, moon, and eleven stars bowed down to him. When Joseph told his brothers about these dreams, they were furious. "Do you think you\'re going to rule over us?" they snapped. Even his father raised his eyebrows, but he kept the dreams in his mind, wondering what they might mean.' },
            { title: 'Betrayed by His Brothers', text: 'One day, Joseph\'s brothers were far from home, tending their father\'s flocks in the fields near a place called Shechem. Jacob sent seventeen-year-old Joseph to check on them and bring back a report.\n\nJoseph set off happily, wearing his colorful coat. But when his brothers saw him coming in the distance — the bright colors of his coat giving him away — hatred welled up in their hearts.\n\n"Here comes the dreamer!" they said with bitter sarcasm. "Let\'s kill him and throw him into a pit. We\'ll tell Father that a wild animal ate him. Then we\'ll see what happens to his precious dreams!"\n\nBut Reuben, the oldest brother, couldn\'t stomach the idea of murder. "Don\'t kill him," he said. "Just throw him into this empty well." Reuben secretly planned to come back later and rescue Joseph.\n\nSo when Joseph arrived, his brothers grabbed him roughly, ripped off his beautiful coat, and threw him into a deep, dry well. Joseph cried out and begged his brothers, but they ignored his pleas. They sat down nearby and ate their lunch while their little brother sobbed in the darkness below.\n\nThen a caravan of traders came by — merchants heading to Egypt. Joseph\'s brother Judah had an idea: "Why leave him in the well? Let\'s sell him to these traders. We\'ll get rid of him and make some money too." So they pulled Joseph out of the pit and sold him for twenty pieces of silver. Joseph was led away in chains, crying and looking back at his brothers, who didn\'t even bother to wave goodbye.\n\nThe brothers killed a goat and dipped Joseph\'s coat in the blood. They brought it to their father Jacob and said, "We found this. Is it Joseph\'s coat?" Jacob recognized it immediately and let out a cry of agony. "A wild animal has devoured my son! My Joseph is torn to pieces!" Jacob mourned for Joseph and wept for many, many days. No one could comfort him.' },
            { title: 'Slave and Prisoner in Egypt', text: 'Meanwhile, Joseph was taken to Egypt — a strange, foreign land where he didn\'t know anyone and couldn\'t even speak the language at first. The traders sold him as a slave to a man named Potiphar, who was an important officer in Pharaoh\'s guard.\n\nJoseph could have given up. He could have been angry at God and refused to try. But Joseph didn\'t do that. Even as a slave, he worked hard, stayed honest, and trusted that God was with him. And God was with him! Everything Joseph did succeeded. Potiphar noticed this and put Joseph in charge of his entire household.\n\nBut then something terrible happened. Potiphar\'s wife told lies about Joseph, and even though Joseph had done absolutely nothing wrong, Potiphar threw him into prison. It was dark, cold, and lonely. Joseph had been betrayed by his brothers, sold into slavery, and now imprisoned for something he didn\'t do.\n\nYet even in the dungeon, Joseph didn\'t give up on God. He kept being kind, helpful, and faithful. The prison warden noticed Joseph\'s character and put him in charge of the other prisoners. God was working in Joseph\'s life, even in the darkest places.\n\nWhile in prison, Joseph met two of Pharaoh\'s servants — a baker and a cupbearer. Both had troubling dreams, and God gave Joseph the gift of understanding dreams. Joseph correctly interpreted both dreams — the cupbearer would be freed, and the baker would not. "When you get out, please remember me and mention me to Pharaoh," Joseph begged the cupbearer. But the cupbearer forgot all about Joseph. Two more years dragged by in that prison cell.' },
            { title: 'From the Dungeon to the Palace', text: 'Then one night, Pharaoh — the king of all Egypt — had two terrifying dreams. In the first dream, seven fat, healthy cows came out of the Nile River. Then seven skinny, ugly cows came out and ate the fat cows! In the second dream, seven plump, golden heads of grain grew on a stalk. Then seven thin, dried-up heads of grain swallowed the good ones.\n\nPharaoh was deeply disturbed. He called every wise man and magician in Egypt, but none of them could explain what the dreams meant. Then — finally! — the cupbearer remembered Joseph. "Your Majesty, there\'s a man in prison who can interpret dreams," he said.\n\nPharaoh immediately sent for Joseph. Joseph was cleaned up, shaved, and brought before the most powerful man in the world. "I\'ve heard you can interpret dreams," Pharaoh said.\n\nJoseph replied humbly, "I cannot do it, but God will give Pharaoh the answer he needs." Then he listened to the dreams and said, "Both dreams mean the same thing. God is telling you what He is about to do. The seven fat cows and seven good heads of grain mean seven years of wonderful harvests — the land will produce more food than anyone can imagine. But the seven skinny cows and seven thin heads of grain mean seven years of terrible famine that will follow. The famine will be so severe that people will forget the good years ever happened."\n\nJoseph then gave Pharaoh wise advice: "You should appoint someone to collect one-fifth of all the food during the seven good years and store it up. That way, when the famine comes, Egypt will have enough to survive."\n\nPharaoh was amazed. "Can we find anyone like this man, in whom the spirit of God lives?" he asked his officials. Then he turned to Joseph and said, "Since God has made all this known to you, there is no one as wise as you. You shall be in charge of my palace, and all my people will obey you. Only I, the king, will be greater than you!"\n\nPharaoh took off his royal signet ring and put it on Joseph\'s finger. He dressed Joseph in fine linen robes and placed a gold chain around his neck. Joseph rode in a chariot through the streets as people bowed before him. In a single day, Joseph went from being a forgotten prisoner to the second most powerful person in all of Egypt. He was only thirty years old.' },
            { title: 'The Brothers Come to Egypt', text: 'Everything happened exactly as God had shown Joseph. For seven years, the crops in Egypt grew in unbelievable abundance. Joseph traveled all over the land, collecting food and storing it in enormous granaries in every city. He gathered so much grain it was like the sand of the sea — too much to measure.\n\nThen the seven good years ended, and the famine began. Crops withered and died. Rivers shrank. The ground turned hard and dry. The famine wasn\'t just in Egypt — it spread to every surrounding country, including the land of Canaan, where Joseph\'s father and brothers still lived.\n\nJacob heard there was food in Egypt. "Go there and buy grain," he told his sons, "so that we don\'t starve." So ten of Joseph\'s brothers traveled to Egypt. Jacob kept the youngest son, Benjamin, at home — Benjamin was Rachel\'s other son, and Jacob couldn\'t bear to risk losing him.\n\nThe ten brothers arrived in Egypt and were brought before the governor — and they bowed down with their faces to the ground, just as Joseph\'s dream had foretold all those years ago! Joseph recognized them immediately, but they had no idea who he was. The scrawny teenager they had sold was now a powerful Egyptian ruler with different clothes, a different language, and a different name.\n\nJoseph\'s eyes filled with tears, but he turned away and hid his emotion. He tested his brothers in various ways to see if they had truly changed. He accused them of being spies. He kept one brother in prison and sent the rest home to bring Benjamin. And through it all, he listened to them talk among themselves.\n\n"We\'re being punished for what we did to Joseph," they said to each other. "We saw how distressed he was when he begged us for mercy, and we didn\'t listen. That\'s why this trouble has come upon us." Joseph heard their words and had to leave the room to weep.' },
            { title: 'The Family Reunited', text: 'Eventually, the famine forced the brothers to return with Benjamin. Joseph prepared a feast for them and seated them at the table in birth order — which amazed and confused them. How did this Egyptian know their ages?\n\nFinally, Joseph couldn\'t contain himself any longer. He sent all the Egyptian servants out of the room. Then, in front of his stunned brothers, he broke down weeping so loudly that the Egyptians outside could hear him.\n\n"I am Joseph!" he cried. "I am your brother — the one you sold into Egypt!"\n\nThe brothers were absolutely terrified. Their mouths fell open. They couldn\'t speak. The brother they had betrayed twenty years ago was now the most powerful man in Egypt after Pharaoh! Surely he would take revenge!\n\nBut what Joseph said next was one of the most beautiful things ever spoken: "Don\'t be afraid, and don\'t be angry with yourselves for selling me here. It was God who sent me ahead of you to save lives! God turned what you meant for evil into something good, so that many people could be kept alive. You intended to harm me, but God intended it for good."\n\nJoseph threw his arms around Benjamin and wept. Then he kissed all his brothers, and they talked and cried together. The years of pain and separation melted away in the warmth of forgiveness.\n\nPharaoh invited Joseph\'s entire family to move to Egypt. Jacob, who was now very old, couldn\'t believe his ears when he heard the news. "Joseph is alive? My son is alive?" he gasped. He packed everything and traveled to Egypt.\n\nWhen Jacob finally saw Joseph, he threw his arms around his son\'s neck and wept and wept. "Now I can die in peace," the old man said, "because I have seen your face and know you are alive." The family was together again, and they lived in the best part of Egypt, with plenty of food and everything they needed.' }
        ],
        moral: 'Even when bad things happen, God can turn them into something good. Forgiveness is powerful and can heal families. No matter how dark things get, God is always working behind the scenes for our good.',
        keyVerse: { text: 'You intended to harm me, but God intended it for good.', ref: 'Genesis 50:20' }
    },
    {
        id: 'moses',
        title: 'Moses and the Exodus',
        icon: '🌊',
        testament: 'old-testament',
        reference: 'Exodus 1–14',
        snippet: 'God uses Moses to free His people from slavery in Egypt through amazing miracles.',
        sections: [
            { title: 'Slaves in Egypt', text: 'After Joseph died, many years passed — hundreds of years. The family of Jacob, now called the Israelites, had grown from just seventy people into a vast nation of hundreds of thousands! They filled the land of Egypt.\n\nBut a new Pharaoh came to power who didn\'t know anything about Joseph or what he had done for Egypt. This Pharaoh looked at all the Israelites and was afraid. "There are too many of them!" he said to his advisors. "If a war breaks out, they might fight against us!"\n\nSo Pharaoh did something terrible — he made the Israelites into slaves. He forced them to work brutally hard, making bricks out of mud and straw, and building enormous cities and monuments under the scorching Egyptian sun. Slave drivers whipped them if they slowed down. Their lives were miserable — nothing but backbreaking labor from sunrise to sunset.\n\nBut the more Pharaoh oppressed them, the more the Israelites grew in number. So Pharaoh came up with an even more evil plan: he ordered that every Israelite baby boy must be thrown into the Nile River. It was a command of pure evil. Mothers clutched their babies and wept, and the whole nation cried out to God for help.' },
            { title: 'A Baby in a Basket', text: 'During this terrible time, a woman from the tribe of Levi gave birth to a beautiful baby boy. When she looked at her son, she knew he was special. She couldn\'t bear to hand him over to be killed. So she hid him — for three whole months! Every time the baby cried, her heart raced. Every knock on the door made her tremble. But she kept her baby safe.\n\nWhen he was too big to hide any longer, she came up with a desperate, brilliant plan. She wove a basket out of reeds, sealed it with tar and pitch to make it waterproof, and gently laid her baby inside. Then, with tears streaming down her face, she placed the basket among the tall reeds at the edge of the Nile River. His big sister, Miriam, hid nearby to watch and see what would happen.\n\nSoon, Pharaoh\'s own daughter — the princess of Egypt — came down to the river to bathe. She spotted the basket among the reeds and sent her servant to fetch it. When she opened it, the baby was crying, and her heart melted with compassion. "This is one of the Hebrew babies," she said sadly.\n\nAt just the right moment, brave little Miriam stepped out from her hiding place. "Would you like me to find a Hebrew woman to nurse the baby for you?" she asked. The princess said yes — and Miriam ran home and brought back her own mother! God had worked everything out so perfectly that the baby\'s real mother got to raise her own son, and she was even paid to do it!\n\nThe princess named the baby Moses, which means "drawn out," because she drew him out of the water. When Moses was old enough, he went to live in Pharaoh\'s palace and was raised as an Egyptian prince. He learned to read and write, studied the wisdom of Egypt, and wore fine clothes. But deep inside, he never forgot that he was an Israelite.' },
            { title: 'The Burning Bush', text: 'As Moses grew into a man, he saw the suffering of his people. One day, when he was about forty years old, he saw an Egyptian beating a Hebrew slave. In a burst of anger, Moses struck the Egyptian and killed him. When Pharaoh found out, he wanted to kill Moses. So Moses fled Egypt and ran far, far away to a wilderness called Midian.\n\nIn Midian, Moses became a humble shepherd. He married a woman named Zipporah, had children, and spent forty years tending sheep in the desert. The prince of Egypt was now a lonely shepherd in the middle of nowhere. It must have seemed like his life\'s purpose was over.\n\nBut God had other plans.\n\nOne day, while Moses was leading his flock near a mountain called Horeb, something extraordinary caught his eye. A bush was on fire — but it wasn\'t burning up! The flames danced on the branches, but the leaves stayed green. The bush just kept burning and burning without being destroyed.\n\nMoses said to himself, "I must go look at this amazing sight. Why isn\'t the bush burning up?" As he walked closer, a voice called out from the bush: "Moses! Moses!"\n\nMoses\' heart nearly stopped. "Here I am," he whispered.\n\n"Do not come any closer," the voice said. "Take off your sandals, because the place where you are standing is holy ground. I am the God of your father — the God of Abraham, the God of Isaac, the God of Jacob."\n\nMoses was trembling. He covered his face because he was afraid to look at God.\n\nGod said, "I have seen the misery of My people in Egypt. I have heard them crying out because of their slave drivers. I know their suffering, and I have come to rescue them. I am sending you to Pharaoh to bring My people out of Egypt."' },
            { title: 'Moses Returns to Egypt', text: 'Moses was terrified. "Who am I to go to Pharaoh?" he said. "I\'m just a shepherd! I\'m not a good speaker — I stumble over my words!"\n\nBut God answered every objection. "I will be with you. I will teach you what to say. I will give you signs and wonders to show Pharaoh." God even gave Moses\' brother, Aaron, to go with him and speak on his behalf.\n\nGod showed Moses three miraculous signs: He turned Moses\' staff into a snake, made his hand leprous and then healed it, and turned water into blood. These were to prove to Pharaoh — and to the Israelites — that God had truly sent Moses.\n\nSo at the age of eighty, Moses left Midian and returned to Egypt. He gathered the Israelite leaders and told them that God had heard their cries and was going to free them. The people bowed down and worshipped God with tears of hope.\n\nThen Moses and Aaron went to Pharaoh\'s palace — the same palace where Moses had grown up as a prince. They stood before the most powerful king in the world and delivered God\'s message: "This is what the Lord, the God of Israel, says: Let My people go!"\n\nPharaoh sneered. "Who is the Lord? Why should I obey Him? I don\'t know your God, and I will NOT let Israel go!" Instead, he made the slaves work even harder, forcing them to make the same number of bricks but without providing straw. The people were crushed, and they blamed Moses for making things worse.' },
            { title: 'The Ten Plagues', text: 'But God was about to show His power in ways the world had never seen.\n\nGod sent ten devastating plagues upon Egypt — each one more terrible than the last:\n\nFirst, Moses raised his staff over the Nile River, and all the water in Egypt turned to blood. The fish died, and the river stank. But Pharaoh\'s heart was hard, and he refused to let the people go.\n\nSecond, frogs — millions of frogs — came up from the rivers and covered the whole land. They were in the houses, in the beds, in the ovens, everywhere! Pharaoh begged Moses to take them away and promised to let the people go, but when the frogs died, Pharaoh changed his mind.\n\nThird, the dust of the ground became gnats that swarmed over people and animals. Fourth, dense swarms of flies filled every house in Egypt — but not in Goshen, where the Israelites lived. God was protecting His people!\n\nFifth, a terrible disease killed the Egyptians\' livestock — their horses, donkeys, camels, cattle, and sheep — but not a single Israelite animal died. Sixth, painful boils broke out on the skin of every Egyptian. They were covered in sores!\n\nSeventh, God sent a massive hailstorm — the worst in Egypt\'s history — with hail mixed with fire that destroyed crops and trees. Eighth, a wind brought billions of locusts that ate every remaining green thing in the land. Ninth, thick darkness — a darkness so heavy you could almost feel it — covered Egypt for three solid days. People couldn\'t see each other or move. But in Goshen, the Israelites had light!\n\nAfter each plague, Pharaoh promised to let the people go, but each time he hardened his heart and broke his promise.\n\nFinally, the tenth plague — the most terrible of all. God said that at midnight, every firstborn son in Egypt would die. But the Israelites were told to paint the blood of a lamb on their doorposts. When the angel of death saw the blood, he would pass over that house, and the family inside would be safe. This was called the Passover.\n\nAt midnight, a great cry went up throughout all Egypt. The firstborn of every Egyptian family died — from the son of Pharaoh on his throne to the son of the prisoner in the dungeon. Pharaoh finally broke. In the middle of the night, with tears streaming down his face, he called for Moses and said, "Go! Leave my people! Take your flocks and herds and go! And bless me too."' },
            { title: 'Crossing the Red Sea', text: 'The Israelites left Egypt in a hurry, carrying their bread dough before it could rise. Six hundred thousand men, plus women and children — perhaps two million people in all — walked out of Egypt as free people for the first time in over 400 years! God led them during the day as a tall pillar of cloud and during the night as a pillar of fire, so they always knew which way to go.\n\nBut back in Egypt, Pharaoh changed his mind one more time. "What have we done? We\'ve let our slaves go!" He gathered his army — six hundred of his best chariots and all the horsemen of Egypt — and chased after the Israelites.\n\nThe Israelites came to the edge of the Red Sea and stopped. Behind them, they could hear the thunder of Pharaoh\'s chariots getting closer. In front of them was nothing but deep, impossible water. They were trapped!\n\nThe people were terrified. "Did you bring us out here to die?" they cried to Moses. "We should have stayed in Egypt!"\n\nBut Moses stood firm. "Don\'t be afraid!" he said. "Stand still and watch the Lord save you today. The Lord will fight for you; you need only to be still."\n\nThen God told Moses to raise his staff over the sea. Moses obeyed, and God sent a powerful east wind that blew all through the night. And an incredible, miraculous thing happened — the sea split apart! The waters stood up in two massive walls, one on the right and one on the left, and between them was a path of dry ground stretching all the way to the other side.\n\nThe Israelites walked through the sea on dry land — two million people, with children and animals, walking between towering walls of water with fish swimming in them! The pillar of cloud moved behind them, blocking the Egyptian army\'s view.\n\nWhen all the Israelites were safely across, the Egyptians charged in after them. But God threw the army into confusion — chariot wheels fell off, horses stumbled. Then God told Moses to stretch his hand over the sea once more. The walls of water came crashing down, covering all of Pharaoh\'s chariots and soldiers. Not one of them survived.\n\nWhen the Israelites looked back and saw what God had done, they were filled with awe. They trusted God, and Moses\' sister Miriam grabbed a tambourine and led all the women in singing and dancing. "Sing to the Lord, for He is highly exalted! The horse and its rider He has hurled into the sea!" The people were free at last — and God had done it all.' }
        ],
        moral: 'God hears the cries of those who are suffering and has the power to rescue them. No problem is too big for God, and He fights for those who trust Him.',
        keyVerse: { text: 'The Lord will fight for you; you need only to be still.', ref: 'Exodus 14:14' }
    },
    {
        id: 'ten-commandments',
        title: 'The Ten Commandments',
        icon: '📜',
        testament: 'old-testament',
        reference: 'Exodus 19–20',
        snippet: 'God gives Moses ten special rules for the people to live by.',
        sections: [
            { title: 'Journey Through the Wilderness', text: 'After the Israelites crossed the Red Sea and escaped from Egypt, they didn\'t go straight to the Promised Land. Instead, God led them through a vast, dry wilderness. It was a land of sand, rocks, and scorching sun — very different from the green fields of Egypt.\n\nThe people were tired and thirsty. They grumbled and complained. "We wish we were back in Egypt!" they said. "At least we had food there!" It seems strange that they would miss being slaves, but they had quickly forgotten how bad it had been.\n\nBut God took care of them. When they were thirsty, God gave them water from a rock. When they were hungry, He sent a special bread from heaven called manna — it appeared on the ground every morning like dew, and it tasted like honey wafers. He also sent flocks of quail for meat. God provided everything they needed, even when they didn\'t deserve it.\n\nThree months after leaving Egypt, the Israelites arrived at a place that would change their lives forever — the foot of a great mountain called Mount Sinai. Its rocky peak reached up into the clouds, and the whole area felt ancient and holy. God had brought them here for a very special reason.' },
            { title: 'God Speaks from the Mountain', text: 'God told Moses to tell the people to prepare themselves for something incredible. "On the third day," God said, "I will come down on Mount Sinai in the sight of all the people." He told them to wash their clothes, prepare their hearts, and set a boundary around the mountain that no one could cross.\n\nWhen the third day arrived, the Israelites experienced something they would never forget as long as they lived.\n\nEarly in the morning, thick clouds gathered around the top of the mountain. Thunder crashed and boomed — not ordinary thunder, but thunder that shook the ground beneath their feet. Lightning flashed again and again, turning the dark clouds into walls of white fire. Then came the sound of a trumpet blast — louder than any trumpet made by human hands — that grew louder and louder until it was almost unbearable.\n\nMount Sinai was covered in smoke because God had descended upon it in fire. The whole mountain trembled violently, shaking like an earthquake. Smoke billowed up like from a furnace, blotting out the sky. The people at the base of the mountain were terrified. They stared with wide eyes, clinging to each other, trembling from head to toe.\n\nThis was not just any moment — this was Almighty God, the Creator of the universe, coming down to meet with His people! And He was about to speak.' },
            { title: 'The Ten Commandments', text: 'Then the voice of God thundered from the mountain, and He spoke the Ten Commandments — ten special rules that would teach His people how to live good, loving lives:\n\n1. "You shall have no other gods before Me." — God is the one true God, and He should be the most important thing in our lives.\n\n2. "You shall not make for yourself an idol." — Don\'t worship statues or images. Nothing we make with our hands can compare to the living God.\n\n3. "You shall not misuse the name of the Lord your God." — God\'s name is holy and should be treated with respect, not used carelessly or as a curse word.\n\n4. "Remember the Sabbath day by keeping it holy." — Work for six days, but the seventh day is special — a day for rest and for remembering God, just as He rested after creating the world.\n\n5. "Honor your father and your mother." — Respect, obey, and be kind to your parents. They love you and take care of you.\n\n6. "You shall not murder." — Every human life is precious because God created it.\n\n7. "You shall not commit adultery." — Be faithful and trustworthy in your closest relationships.\n\n8. "You shall not steal." — Don\'t take what belongs to someone else. Be honest.\n\n9. "You shall not give false testimony." — Don\'t lie about others. Always tell the truth.\n\n10. "You shall not covet." — Don\'t be jealous of what other people have. Be grateful for what God has given you.\n\nThe thunder of God\'s voice was so powerful and terrifying that the people backed away from the mountain. "Please," they begged Moses, "you talk to God and tell us what He says. If God speaks to us directly, we will die!" Moses reassured them: "Don\'t be afraid. God has come to test you, so that the fear of God will keep you from sinning."' },
            { title: 'Moses on the Mountain', text: 'While the people waited below, Moses climbed up into the thick darkness where God was. He stayed on the mountain for forty days and forty nights! During that time, God gave Moses much more than just the Ten Commandments. He gave him detailed instructions about how the people should worship, how to build a special tent called the Tabernacle where God\'s presence would dwell, how to settle disagreements fairly, how to treat the poor and foreigners, and many other rules for daily life.\n\nGod also gave Moses two stone tablets — not ordinary stones, but tablets that God Himself had written on with His own finger! The Ten Commandments were carved into the stone in God\'s own handwriting. Imagine holding something written by the finger of God!\n\nBut while Moses was on the mountain for all those weeks, the people below grew impatient. "Where is this Moses?" they complained. "He\'s been gone forever. Maybe he died up there. We need a god we can see!" And they did something terrible — they melted down their gold jewelry, shaped it into a golden calf statue, and began worshipping it and having a wild party.\n\nWhen Moses came down the mountain and saw the golden calf, he was so angry and heartbroken that he threw the stone tablets on the ground and they shattered into pieces. The people had already broken God\'s commandments! Moses destroyed the golden calf, and God disciplined the people for their unfaithfulness.\n\nBut God is gracious. He told Moses to carve two new stone tablets and come back up the mountain. God wrote the commandments again, and Moses brought them down to the people. This time, they were placed inside a special golden box called the Ark of the Covenant, which was kept in the holiest place of the Tabernacle.' },
            { title: 'A Gift for All Time', text: 'The Ten Commandments weren\'t harsh rules meant to take away people\'s fun. They were a gift from a loving Father — guidelines for living a good, happy, peaceful life.\n\nThink about it: if everyone followed the Ten Commandments, what would the world be like? No lying, no stealing, no murder, no jealousy. Everyone would be honest. Families would be loving and respectful. People would take a day to rest and connect with God. The whole world would be filled with peace and kindness!\n\nJesus later said that all the commandments can be summed up in two simple rules: "Love the Lord your God with all your heart, soul, mind, and strength" and "Love your neighbor as yourself." The first four commandments teach us how to love God, and the last six teach us how to love each other.\n\nThe Ten Commandments have been treasured for thousands of years. They\'ve been carved into courtroom walls, taught in churches and synagogues, and passed down from parents to children across countless generations. They are as true today as they were when God\'s voice thundered from Mount Sinai — timeless words of wisdom from the God who created us and knows exactly how we were meant to live.' }
        ],
        moral: 'God gives us guidelines because He wants the best for us. His commandments aren\'t meant to limit us but to protect us and show us the path to a happy, loving life.',
        keyVerse: { text: 'Love the Lord your God with all your heart and with all your soul and with all your strength.', ref: 'Deuteronomy 6:5' }
    },
    {
        id: 'david-goliath',
        title: 'David and Goliath',
        icon: '⚔️',
        testament: 'old-testament',
        reference: '1 Samuel 17',
        snippet: 'A young shepherd boy defeats a giant warrior with just a sling and a stone.',
        sections: [
            { title: 'The Valley of Fear', text: 'The Israelites were at war. Their enemies, the Philistines, had gathered a massive army on one side of a valley called the Valley of Elah. The Israelites camped on the other side. Between them lay the valley floor — a wide, open space where the battle should have taken place. But every day, something happened that froze the Israelites with fear.\n\nEvery morning and every evening, a warrior stepped out from the Philistine camp. But he wasn\'t just any warrior. His name was Goliath, and he was a giant — over nine feet tall! He was enormous, like a walking tower. His arms were as thick as tree trunks, and his voice boomed across the valley like rolling thunder.\n\nGoliath wore a bronze helmet on his head and a coat of armor that weighed 125 pounds — that\'s heavier than most grown men! He had bronze armor on his legs, a bronze javelin slung across his back, and carried a spear whose iron tip alone weighed 15 pounds. A shield-bearer walked ahead of him, and the ground seemed to shake with each of Goliath\'s heavy footsteps.\n\nEvery day, Goliath roared his challenge across the valley: "Choose a man to fight me! If he kills me, the Philistines will become your slaves. But if I kill him, you will be our slaves! I defy the armies of Israel! Give me a man and let us fight!"\n\nThe Israelite soldiers looked at each other with pale faces and trembling knees. Nobody moved. Nobody volunteered. Even King Saul, the tallest man in Israel, hid in his tent. For forty days — forty mornings and forty evenings — Goliath shouted his challenge, and for forty days, no one had the courage to face him.' },
            { title: 'A Shepherd Boy Arrives', text: 'Now, there was a man named Jesse who lived in the town of Bethlehem. He had eight sons. The three oldest were soldiers in Saul\'s army. The youngest son, David, was still just a boy — probably around fifteen or sixteen years old. While his brothers were at war, David stayed home, taking care of his father\'s sheep.\n\nDavid wasn\'t a warrior. He was a shepherd — a boy with ruddy cheeks, bright eyes, and a heart full of songs. He spent his days in the hills and meadows, watching over the fluffy sheep, playing his harp, and singing praises to God under the open sky. The life of a shepherd may seem quiet, but David had faced real danger. When a lion came to steal a lamb, David chased it, grabbed it by the mane, and killed it. When a bear attacked his flock, David fought it and won. Each time, he knew it was God who gave him strength.\n\nOne day, Jesse called David in from the fields. "Take this bread and cheese to your brothers at the army camp," he said. "And find out how they\'re doing." David got up early, left the sheep with another keeper, and set off with the food.\n\nWhen David arrived at the Israelite camp, he ran to find his brothers among the soldiers. Just then, Goliath came out for his daily challenge. David heard the giant\'s thundering voice echoing across the valley, mocking the armies of the living God. David watched in amazement as every single soldier near him turned and ran away in terror.\n\n"Who is this giant who dares to defy the armies of the living God?" David asked. The soldiers told him about Goliath and about the reward King Saul had offered — wealth, the king\'s daughter in marriage, and freedom from taxes for the man\'s family.' },
            { title: 'David Volunteers', text: 'David\'s oldest brother, Eliab, overheard David asking questions and got angry. "Why are you here?" he snapped. "Who\'s watching those few little sheep? I know how cocky you are. You just came to watch the battle!"\n\nBut David wasn\'t discouraged by his brother\'s harsh words. He kept asking about Goliath, and word eventually reached King Saul that there was a young man willing to fight.\n\nSaul sent for David. When the boy walked into the king\'s tent, Saul must have stared in disbelief. This was the volunteer? A teenager with no armor and no military training?\n\n"Let no one lose heart on account of this Philistine," David said confidently. "Your servant will go and fight him."\n\nSaul shook his head. "You can\'t go against this Philistine. You\'re only a boy, and he has been a warrior since he was young."\n\nBut David stood tall and told the king about the lion and the bear. "The Lord who rescued me from the paw of the lion and the paw of the bear will rescue me from the hand of this Philistine," David said firmly. His voice didn\'t waver. His eyes didn\'t blink. He absolutely believed it.\n\nSaul was moved. "Go, and the Lord be with you," he said. He offered David his own royal armor — a bronze helmet, a heavy coat of mail, and a sword. David put it all on and tried to walk, but it was way too big and heavy. He clunked around awkwardly and said, "I can\'t wear this. I\'m not used to it." He took it all off.\n\nInstead, David took only what he knew — his shepherd\'s staff, his sling, and his bag. He walked down to the stream that flowed through the valley, knelt by the water, and carefully chose five smooth, round stones. He put them in his shepherd\'s pouch, gripped his sling, and started walking toward the most dangerous warrior in the world.' },
            { title: 'The Battle', text: 'Goliath saw David coming and couldn\'t believe his eyes. He had expected a mighty warrior in gleaming armor. Instead, a boy was walking toward him — a sunburned, unarmed boy with a stick and a sling.\n\nGoliath\'s face twisted with rage and insult. "Am I a dog, that you come at me with sticks?" he bellowed. "Come here, boy, and I\'ll give your flesh to the birds and the wild animals!"\n\nEvery soldier on both sides of the valley held their breath. This was it.\n\nDavid shouted back — and his voice, though young, carried across the valley with power and conviction: "You come against me with sword and spear and javelin, but I come against you in the name of the Lord Almighty — the God of the armies of Israel, whom you have defied! This day the Lord will deliver you into my hands, and the whole world will know that there is a God in Israel! All those gathered here will know that it is not by sword or spear that the Lord saves — for the battle is the Lord\'s, and He will give all of you into our hands!"\n\nGoliath laughed and started lumbering forward, the ground trembling with each heavy step. David didn\'t run away. He ran toward the giant! His bare feet flew across the rocky ground. He reached into his bag, pulled out a single smooth stone, loaded it into his sling, and swung it around his head — once, twice, three times — faster and faster until it was a blur.\n\nThen he let it fly.\n\nThe stone cut through the air like a bullet. It struck Goliath right in the center of his forehead — the only spot where the giant wore no armor. The stone sank deep, and the giant\'s eyes went wide. For a moment, the enormous warrior swayed like a tree about to fall. Then — CRASH! — Goliath fell face-first on the ground with a thunderous impact that raised a cloud of dust.\n\nSilence. Complete silence. Every soldier on both sides stared in stunned disbelief. The giant was down.\n\nDavid ran over, drew Goliath\'s own massive sword, and stood over the fallen giant. The battle was won — not by the strongest warrior, not by the best armor, but by a boy with a stone and a giant faith in God.' },
            { title: 'Victory and Celebration', text: 'When the Philistines saw that their champion was dead, panic swept through their ranks like wildfire. They turned and ran! The Israelite soldiers, who had been cowering in fear for forty days, let out a mighty shout and charged after them. They chased the Philistines all the way back to their cities, and the Israelites won a great victory that day.\n\nDavid became an instant hero. King Saul brought him to the palace, and Saul\'s son Jonathan became David\'s best friend — a friendship so deep and loyal that the Bible says their souls were "knit together." The women of Israel sang and danced through the streets, playing tambourines and celebrating: "Saul has slain his thousands, and David his tens of thousands!"\n\nBut David never forgot who really won that battle. It wasn\'t his skill with a sling. It wasn\'t his bravery or speed. It was God. The same God who had helped him fight lions and bears had given him victory over a nine-foot giant. David knew that without God, he was just a shepherd boy. With God, he was unstoppable.\n\nYears later, David would become the greatest king Israel ever had — a man after God\'s own heart. He would write beautiful psalms of praise, unite the nation, defeat its enemies, and prepare for the building of God\'s temple. And it all started in a valley with a sling and a stone, and a young boy\'s faith that God is bigger than any giant we will ever face.' }
        ],
        moral: 'With God on our side, we can face any challenge, no matter how big it seems. True strength doesn\'t come from muscles or weapons — it comes from trusting God. When everyone else is afraid, faith gives us the courage to step forward.',
        keyVerse: { text: 'The Lord who rescued me from the paw of the lion and the paw of the bear will rescue me from the hand of this Philistine.', ref: '1 Samuel 17:37' }
    },
    {
        id: 'daniel-lions',
        title: 'Daniel in the Lions\' Den',
        icon: '🦁',
        testament: 'old-testament',
        reference: 'Daniel 6',
        snippet: 'Daniel stays faithful to God even when it means being thrown into a den of hungry lions.',
        sections: [
            { title: 'A Man Far from Home', text: 'Many years after King David\'s time, the Israelite people disobeyed God so many times that He allowed them to be conquered by a powerful empire called Babylon. The Babylonians destroyed the beautiful temple in Jerusalem and carried many Israelites away to live in Babylon — a huge, magnificent city far from their homeland.\n\nAmong those taken was a young man named Daniel. He was just a teenager when he was ripped away from his family, his friends, and everything he knew. He was brought to the king\'s palace to be trained as a Babylonian official — to learn their language, their customs, and their ways.\n\nBut Daniel made a decision in his heart that would define his entire life: no matter what happened, no matter where he was, he would stay faithful to God. He wouldn\'t worship Babylonian idols. He wouldn\'t stop praying. He wouldn\'t compromise his faith, not even a little bit.\n\nYears passed. Daniel grew from a teenager into a man, and then into an elderly statesman. Kingdoms rose and fell around him. Babylon itself was conquered by the Medes and Persians. But through it all, Daniel remained faithful, wise, and trusted. Now, under the Persian King Darius, Daniel had risen to become one of the three most powerful officials in the entire empire. He was old — possibly in his eighties — but his mind was sharp and his faith was stronger than ever.' },
            { title: 'A Faithful Life of Prayer', text: 'Every day, three times a day, Daniel went to an upper room in his house that had windows opening toward Jerusalem — the holy city he still loved and longed for. He would kneel by those open windows, face toward his distant homeland, and pray to God.\n\nHe had done this every single day for decades. Morning, noon, and evening — Daniel prayed. He thanked God for His blessings. He asked for wisdom. He prayed for his people, the Israelites, hoping they would one day return home. He confessed when he made mistakes and asked for God\'s guidance.\n\nDaniel\'s prayer life was no secret. Everyone in the city knew about it. They could see him at his window, kneeling faithfully whether it was a good day or a terrible one. Rain or shine, feast or famine, Daniel prayed.\n\nKing Darius noticed something special about Daniel. Out of all his officials — and there were 120 governors plus three administrators — Daniel was the best. He was more honest, more capable, and more trustworthy than anyone else. The king planned to put Daniel in charge of the entire kingdom! This news made the other officials burn with jealousy.' },
            { title: 'The Evil Plot', text: 'The jealous officials desperately searched for something to use against Daniel. They investigated his tax records, examined his work, and looked for any mistake, any dishonesty, any scandal. But they couldn\'t find anything wrong! Daniel was completely trustworthy. He never took bribes, never lied, never cheated. He was, in every way, a man of integrity.\n\nFinally, the officials realized something. "We will never find any basis for charges against this man Daniel," they admitted to each other, "unless it has something to do with the law of his God." They knew that Daniel would never stop praying, no matter what. So they devised a cunning, wicked plan.\n\nThe officials went to King Darius and said, with false flattery, "Your Majesty! All the royal administrators, governors, and advisors have agreed that you should issue a decree: for the next thirty days, anyone who prays to any god or human being except you, O King, shall be thrown into the lions\' den. This will show your greatness and authority!"\n\nDarius was flattered. He didn\'t realize it was a trap aimed at Daniel. He signed the decree and stamped it with his royal seal. Under the law of the Medes and Persians, once a decree was signed, it could never be changed — not even by the king himself.\n\nThe officials hurried away, rubbing their hands together with glee. The trap was set.' },
            { title: 'Daniel Keeps Praying', text: 'Daniel heard about the new law. He understood perfectly what it meant. If he prayed to God, he would be thrown to the lions. If he stopped praying for thirty days, he would be safe.\n\nSome people might have thought, "Well, I can just pray silently. Or I can pray in a closet where no one can see me. Or I can skip praying for a month — God would understand, right?"\n\nBut Daniel didn\'t do any of those things. He went home, climbed the stairs to his upper room, opened his windows toward Jerusalem — just as he always did — knelt down on his old, faithful knees, and prayed. Three times that day. Out in the open. Where anyone could see.\n\nDaniel didn\'t do this to show off or to be rebellious. He did it because his relationship with God was the most important thing in his life — more important than his safety, more important than his position, more important even than his life itself. He had trusted God through decades of exile, through the rise and fall of empires, through every trial and test. He wasn\'t going to stop now.\n\nOf course, the jealous officials were watching. They gathered outside Daniel\'s house, peeked through the windows, and saw exactly what they expected — Daniel, on his knees, praying to his God. They had their evidence.' },
            { title: 'Into the Lions\' Den', text: 'The officials rushed to King Darius with the news. "Your Majesty, didn\'t you sign a decree that anyone who prays to another god must be thrown into the lions\' den?"\n\n"Yes," the king confirmed. "The law cannot be changed."\n\n"Well," they said with barely hidden smiles, "Daniel — your most trusted advisor — ignores your decree. He still prays to his God three times a day."\n\nKing Darius\'s face went pale. His heart sank. He suddenly realized he had been tricked! He loved Daniel and valued him above everyone else. The king spent the entire rest of the day desperately trying to find a legal loophole — any way to save Daniel. But the officials kept pressing: "Remember, Your Majesty, no decree can be changed once it is signed."\n\nWith a heavy heart and tears in his eyes, Darius gave the order. Daniel — this faithful, elderly man of God — was arrested and brought to the entrance of the lions\' den. The den was a deep pit carved into rock, filled with hungry, powerful lions that hadn\'t been fed.\n\nBefore Daniel was lowered in, King Darius said something remarkable: "May your God, whom you serve so faithfully, rescue you." Even the king believed that Daniel\'s God was real and powerful.\n\nDaniel was lowered into the dark pit. A heavy stone was placed over the opening, and the king sealed it with his own royal ring so that no one could interfere. Daniel was now alone in the pitch-black darkness, surrounded by the sound of lions breathing, growling, and padding around on the stone floor. Their eyes glowed in the darkness. These were not tame zoo animals — they were killers, trained to devour anything thrown to them.' },
            { title: 'The Longest Night', text: 'That night, King Darius couldn\'t eat. He couldn\'t sleep. He couldn\'t even listen to music or enjoy any entertainment. He tossed and turned on his royal bed, staring at the ceiling, his mind consumed with worry about Daniel. What was happening in that den? Was Daniel still alive? Could any God really protect a man from a pit of starving lions?\n\nThe hours crawled by like years. Every sound made the king jump. He paced the floors of his palace, watching the night sky slowly lighten. The moment the first gray light of dawn appeared on the horizon, Darius threw on his robes and ran — the king of the mighty Persian Empire actually ran — to the lions\' den.\n\nWith a trembling voice, he called down into the dark pit: "Daniel, servant of the living God! Has your God, whom you serve continually, been able to rescue you from the lions?"' },
            { title: 'God Shuts the Lions\' Mouths', text: 'And then — the most wonderful sound Darius had ever heard — Daniel\'s voice rose up from the den, calm and strong:\n\n"O King, live forever! My God sent His angel, and he shut the mouths of the lions. They have not hurt me, because I was found innocent in God\'s sight. Nor have I ever done any wrong before you, Your Majesty."\n\nDarius nearly collapsed with relief and joy. "Get him out! Get him out immediately!" he ordered. Servants rushed to remove the stone and lower ropes into the den. Daniel was lifted out into the morning sunlight.\n\nAnd when they examined him, there was not a single scratch on his body. Not a claw mark, not a bite, not even a bruise. The lions had been right there beside him all night — powerful enough to tear him apart in seconds — but they had lain down around him as gently as kittens. God\'s angel had quite literally shut the mouths of the lions.\n\nDaniel stepped out into the fresh morning air, dusted himself off, and praised God. He was over eighty years old, he had spent the night in a pit of lions, and he walked out without a scratch. That is the power of faith.\n\nKing Darius was overjoyed. He immediately had the officials who had plotted against Daniel arrested and thrown into the same lions\' den — and the lions showed them no such mercy. Then the king issued a new decree throughout his entire empire:\n\n"In every part of my kingdom, people must fear and reverence the God of Daniel. For He is the living God and He endures forever. His kingdom will not be destroyed. His dominion will never end. He rescues and He saves. He performs signs and wonders in the heavens and on the earth. He has rescued Daniel from the power of the lions."\n\nAnd Daniel continued to prosper — faithful to the very end of his long, remarkable life.' }
        ],
        moral: 'When we stay faithful to God, He protects us. We should never be afraid to do what is right, even when it\'s hard and even when everyone around us says to stop. God is always with those who trust Him.',
        keyVerse: { text: 'My God sent his angel, and he shut the mouths of the lions.', ref: 'Daniel 6:22' }
    },
    {
        id: 'jonah',
        title: 'Jonah and the Big Fish',
        icon: '🐋',
        testament: 'old-testament',
        reference: 'Jonah 1–4',
        snippet: 'Jonah tries to run from God but learns that you can\'t hide from Him.',
        sections: [
            { title: 'A Mission Jonah Didn\'t Want', text: 'Jonah was a prophet — a man who spoke God\'s messages to the people. One day, God came to Jonah with a very clear instruction: "Go to the great city of Nineveh and preach against it, because their wickedness has come up before Me."\n\nNow, Nineveh was the capital of the Assyrian Empire — one of the most powerful and feared nations in the ancient world. The Assyrians were known for being incredibly cruel to their enemies. They had attacked Israel, destroyed cities, and terrorized people for generations.\n\nJonah didn\'t want to go to Nineveh. In fact, he absolutely, positively, completely refused. Why? Because deep down, Jonah was afraid that if he preached to the people of Nineveh, they might actually listen and repent — and then God, who is merciful and compassionate, would forgive them! Jonah didn\'t want God to forgive the Ninevites. He wanted God to destroy them! They were enemies of his people!\n\nSo instead of going east to Nineveh, Jonah did the exact opposite. He went to the port city of Joppa, found a ship heading to Tarshish — which was about as far west as you could go in those days — paid the fare, and climbed aboard. He was running away from God.\n\nJonah went down into the bottom of the ship, found a dark corner, lay down, and fell into a deep sleep. He probably thought he had escaped. But you can\'t run away from the God who made the land, the sea, and the sky. God was about to teach Jonah a lesson he would never forget.' },
            { title: 'The Terrible Storm', text: 'As the ship sailed out to sea, the sky began to darken. Thick clouds boiled up from the horizon. The wind picked up — first a breeze, then a gust, then a howling gale. Within minutes, the sea was churning with enormous waves that crashed over the deck. The ship groaned and creaked as if it might break apart at any moment.\n\nThis was no ordinary storm. God had sent it, and it was terrifying. The experienced sailors — men who had spent their lives on the sea — were genuinely afraid for their lives.\n\nEach sailor cried out to whatever god he believed in, desperately begging for help. They threw cargo overboard to lighten the ship, hoping it would stop the vessel from sinking. Meanwhile, Jonah was still fast asleep in the hold below deck!\n\nThe captain found Jonah and was amazed. "How can you sleep at a time like this?" he shouted over the roar of the storm. "Get up and call on your God! Maybe he will notice us and we won\'t die!"\n\nThe sailors decided to draw lots to figure out who was responsible for the storm. The lot fell on Jonah. Every eye turned to him. "Tell us!" they demanded. "Who are you? Where are you from? What have you done?"\n\nJonah\'s heart was heavy with guilt. "I am a Hebrew," he said. "I worship the Lord, the God of heaven, who made the sea and the dry land. I am running away from Him."\n\nThe sailors\' eyes went wide with terror. "You\'re running from the God who made the sea?" they gasped, looking out at the raging waves. "What should we do to you to make the sea calm down?"\n\nJonah knew. "Pick me up and throw me into the sea," he said quietly. "The storm is my fault. If you throw me in, the sea will become calm."\n\nThe sailors didn\'t want to do it. They were good men. They tried rowing harder to reach shore, but the storm only got worse. Finally, with heavy hearts, they prayed, "Lord, please don\'t hold us responsible for this man\'s death." Then they picked Jonah up and threw him into the churning sea.\n\nThe instant Jonah hit the water, the storm stopped. Just like that. The wind died, the waves calmed, and the sea became as smooth as glass. The sailors stood on the deck in stunned silence, and a deep fear of God came over them. They offered sacrifices to the Lord and made vows, recognizing that the God of Israel was truly powerful.' },
            { title: 'Three Days Inside the Fish', text: 'As Jonah sank into the cold, dark water of the Mediterranean Sea, he must have thought it was the end. The waves closed over his head, the water pulled him down, and seaweed wrapped around him. He was sinking deeper and deeper into the darkness.\n\nBut God wasn\'t done with Jonah.\n\nThe Lord sent a massive fish — the Bible calls it a "great fish" — to swallow Jonah whole. Down Jonah went, sliding through the darkness into the enormous belly of the creature. And there he sat, alive and aware, in the strangest, most unpleasant prison anyone has ever been in.\n\nFor three days and three nights, Jonah was inside the belly of that fish. Can you imagine? The darkness was total. The smell was indescribable. The sounds of the fish\'s body groaning and gurgling surrounded him. And Jonah had nothing to do but think — think about what he had done, where he had gone wrong, and how foolish it was to try to run from God.\n\nIn that dark, slimy place, Jonah did the one thing he should have done from the very beginning — he prayed. And what a prayer it was! Jonah poured out his heart to God:\n\n"In my distress I called to the Lord, and He answered me. From deep in the realm of the dead I called for help, and You listened to my cry. You hurled me into the depths, into the heart of the seas. The currents swirled around me, and all Your waves and breakers swept over me. I said, \'I have been banished from Your sight.\' But I will look again toward Your holy temple. When my life was ebbing away, I remembered You, Lord, and my prayer rose to You. Those who cling to worthless idols turn away from God\'s love. But I will sacrifice to You with shouts of grateful praise. Salvation comes from the Lord!"\n\nGod heard Jonah\'s prayer. He commanded the fish, and it swam toward the shore. Then the great fish opened its enormous mouth and vomited Jonah out onto the dry land. There he lay on the beach — covered in fish slime, gasping for air, blinking in the bright sunlight — but alive. Very, very alive.' },
            { title: 'Jonah Obeys — This Time', text: 'Then the word of the Lord came to Jonah a second time: "Go to the great city of Nineveh and proclaim to it the message I give you."\n\nThis time, Jonah went. He picked himself up off that beach, cleaned himself off as best he could, and headed east toward Nineveh. He had learned his lesson.\n\nNineveh was an enormous city — so large that it took three days just to walk across it. When Jonah arrived, he walked through the streets and called out God\'s message: "Forty more days and Nineveh will be overthrown!"\n\nWhat happened next was something Jonah never expected. The people of Nineveh actually listened! From the poorest beggar to the richest merchant, from small children to the elderly, the people of Nineveh believed God\'s message. When the king of Nineveh heard about it, he stood up from his throne, took off his royal robes, put on rough sackcloth (a sign of sorrow), and sat down in ashes.\n\nThe king issued a decree: "Let everyone — every person and every animal — be covered with sackcloth. Let everyone call urgently on God. Let everyone give up their evil ways and their violence. Who knows? God may yet relent and have compassion on us."\n\nThe entire city repented. It was the greatest mass repentance in human history. An entire city — perhaps 120,000 people or more — turned from their wicked ways and asked God for mercy.' },
            { title: 'Jonah\'s Anger and God\'s Love', text: 'And God saw their sincere repentance, and He had compassion on them. He decided not to destroy Nineveh.\n\nYou would think Jonah would be happy. He had just delivered the most successful sermon in history! But Jonah was furious!\n\n"Isn\'t this what I said would happen when I was still at home?" Jonah complained to God. "That\'s why I ran away to Tarshish in the first place! I knew that You are a gracious and compassionate God, slow to anger and abounding in love — a God who relents from sending disaster. I knew You\'d forgive them! Just kill me, Lord. I\'d rather die than live."\n\nJonah stomped out of the city and sat on a hill to the east, pouting. He built a little shelter and sat in its shade, watching the city and hoping — perhaps — that God would change His mind and destroy it anyway.\n\nGod, in His patience, decided to teach Jonah one more lesson. He made a leafy vine grow up overnight to give Jonah extra shade. Jonah was delighted — the vine was cool and comfortable in the blistering heat. But the next day, God sent a worm that chewed through the vine, and it withered. Then God sent a scorching east wind and beat the sun down on Jonah\'s head until he felt faint.\n\n"I\'m so angry I could die!" Jonah said about the vine.\n\nAnd God spoke gently: "Jonah, you\'re upset about a vine that you didn\'t plant and didn\'t grow. It sprang up in a night and died in a night. And yet you don\'t think I should be concerned about Nineveh? A great city with more than 120,000 people who don\'t yet know right from wrong — and also many animals? Should I not have compassion on them?"\n\nThe book ends right there, with God\'s question hanging in the air. We never hear Jonah\'s answer. Maybe that\'s because God is asking the same question to each of us: shouldn\'t we want God\'s love and mercy to reach everyone — even people we don\'t particularly like?' }
        ],
        moral: 'We can\'t run away from God because He is everywhere. God is patient with us and gives second chances. And His love and mercy extend to all people — not just the ones we think deserve it.',
        keyVerse: { text: 'From inside the fish Jonah prayed to the Lord his God.', ref: 'Jonah 2:1' }
    },
    {
        id: 'birth-of-jesus',
        title: 'The Birth of Jesus',
        icon: '⭐',
        testament: 'new-testament',
        reference: 'Luke 1–2, Matthew 1–2',
        snippet: 'The Son of God is born as a baby in a humble manger in Bethlehem.',
        sections: [
            { title: 'An Angel Visits Mary', text: 'In a small, quiet town called Nazareth, in the region of Galilee, there lived a young woman named Mary. She was probably only about fourteen or fifteen years old — just a teenager. She was engaged to marry a kind carpenter named Joseph. They were ordinary people living simple, faithful lives.\n\nOne day, without any warning, an angel appeared to Mary. Not just any angel — this was Gabriel, one of the most powerful angels in heaven, the same angel who had appeared to Daniel and to the priest Zechariah before this.\n\nMary was terrified. She had never seen an angel before, and Gabriel\'s presence filled the room with a light that seemed to come from another world entirely.\n\nBut Gabriel\'s first words were, "Greetings, you who are highly favored! The Lord is with you."\n\nMary was troubled and confused. What could this greeting mean? Why would an angel call her "highly favored"?\n\nGabriel said, "Do not be afraid, Mary. You have found favor with God. You will conceive and give birth to a son, and you are to call Him Jesus. He will be great and will be called the Son of the Most High. The Lord God will give Him the throne of His father David, and He will reign over the house of Jacob forever. His kingdom will never end!"\n\nMary\'s mind was spinning. A son? The Son of the Most High? A kingdom that would never end? "How will this be," she asked, "since I am not married?"\n\nGabriel answered, "The Holy Spirit will come upon you, and the power of the Most High will overshadow you. So the holy one to be born will be called the Son of God. Nothing is impossible with God."\n\nAnd Mary — this young, humble girl — gave one of the most beautiful responses in all of scripture: "I am the Lord\'s servant. May it happen to me just as you have said." And with that, the angel left her.' },
            { title: 'Joseph\'s Dream', text: 'When Joseph found out that Mary was going to have a baby, he was deeply troubled. He knew the baby wasn\'t his, and according to the law, he had every right to end their engagement publicly. But Joseph was a good, compassionate man — he didn\'t want to embarrass Mary. So he decided to break off the engagement quietly.\n\nBut before he could do that, an angel appeared to Joseph in a dream. "Joseph, son of David," the angel said, "do not be afraid to take Mary home as your wife. The baby inside her is from the Holy Spirit. She will give birth to a son, and you are to give Him the name Jesus, because He will save His people from their sins."\n\nJoseph woke up and did exactly what the angel commanded. He married Mary and prepared to raise this very special child as his own. What extraordinary faith! Joseph couldn\'t fully understand what was happening, but he trusted God and obeyed.' },
            { title: 'The Journey to Bethlehem', text: 'Months passed, and the time for the baby\'s birth was getting very close. Then an announcement went out from Caesar Augustus, the emperor of Rome, that everyone in the empire had to register for a census. Each person had to travel to the town where their family originally came from.\n\nJoseph was a descendant of King David, which meant he had to travel to David\'s hometown — a small village called Bethlehem, about 80 miles south of Nazareth. Eighty miles on foot! That\'s like walking for four or five days.\n\nMary and Joseph set off on the journey together. It must have been exhausting — Mary was very pregnant, and the roads were rough and dusty. Perhaps she rode on a donkey while Joseph walked alongside, but either way, every bump and hill was uncomfortable. They traveled along winding roads, through valleys, past other travelers, sleeping wherever they could find shelter at night.\n\nFinally, weary and footsore, they arrived in Bethlehem. The little town was packed with people who had also come for the census. Joseph went from inn to inn, knocking on doors, but the answer was always the same: "No room. We\'re full. Sorry." Door after door closed in their faces.\n\nMary was exhausted, and the baby was coming soon. Where would they go? What would they do? Joseph must have felt desperate, knocking on every door in town while his wife needed a safe place to rest.' },
            { title: 'Born in a Manger', text: 'Finally, someone offered them the only available space — a stable. It might have been a cave carved into a hillside, or a small wooden shelter behind an inn. Either way, it was where animals were kept. It smelled of hay and animals. Cows, donkeys, and sheep stood in their stalls, watching quietly.\n\nIt wasn\'t a palace. It wasn\'t a hospital. It wasn\'t even a proper house. But it was shelter, and it was where the most important birth in history took place.\n\nThat night, in that humble stable, Mary gave birth to her firstborn son. She carefully wrapped Him in strips of cloth called swaddling clothes, binding Him snugly the way mothers did in those days to make a baby feel safe and warm. Then she gently laid baby Jesus in a manger — a feeding trough for animals. The hay was soft, and the wooden manger held Him safely.\n\nThe King of Kings — the Creator of the universe, the One who flung the stars across the sky and spoke the mountains into existence — entered the world as a tiny, helpless baby, born in a stable and laid in a feed box. Not in a palace with trumpets and fanfare, but in the humblest place imaginable. God chose to come to earth this way to show that He is close to the poor, the humble, and the overlooked.' },
            { title: 'Angels and Shepherds', text: 'That same night, out in the dark fields near Bethlehem, a group of shepherds was watching over their flocks. They were ordinary working men — low on the social ladder, smelling of sheep, sitting around a small fire to keep warm. Nobody important, as far as the world was concerned.\n\nBut God chose these humble shepherds to be the very first people to hear the news that would change the world.\n\nSuddenly, an angel of the Lord appeared before them, and the glory of the Lord — a brilliant, overwhelming light — shone all around them, turning the dark night brighter than day. The shepherds were absolutely terrified. They fell to the ground, shielding their eyes.\n\nBut the angel said, "Do not be afraid! I bring you good news that will cause great joy for all the people. Today, in the town of David, a Savior has been born to you. He is the Messiah, the Lord! This will be a sign to you: you will find a baby wrapped in cloths and lying in a manger."\n\nAnd then — as if one angel wasn\'t amazing enough — the entire sky exploded with light and sound as a vast army of angels appeared, filling the heavens from horizon to horizon! Thousands upon thousands of angels, singing in a chorus so beautiful that no human music has ever come close:\n\n"Glory to God in the highest heaven, and on earth peace to those on whom His favor rests!"\n\nThe music echoed across the hills and valleys, the most magnificent sound the world had ever heard. Then, as quickly as they had appeared, the angels were gone, and the shepherds were left standing in the dark, quiet field, their hearts pounding.\n\nThey looked at each other with wide, amazed eyes. "Let\'s go to Bethlehem right now!" they said. "Let\'s see this thing that has happened, which the Lord has told us about!" They ran — leaving their sheep right there in the field — and hurried to Bethlehem.' },
            { title: 'The Shepherds Find Jesus', text: 'The shepherds searched the town until they found Mary, Joseph, and the baby, lying in the manger — exactly as the angel had described. They knelt down, these rough, weather-worn men, and gazed at the tiny baby with awe and wonder. This was the Savior? This little infant? The Messiah they had heard about in synagogue their whole lives?\n\nYes. This was Him.\n\nThe shepherds told Mary and Joseph about the angels and the incredible message. Everyone who heard their story was amazed, but Mary treasured all these things, pondering them in her heart. She held her newborn close, knowing that He was no ordinary child.\n\nThe shepherds went back to their flocks that night, but they were transformed. They went glorifying and praising God for everything they had heard and seen. They told everyone they met about the baby in the manger — becoming the very first evangelists, the first people to spread the good news about Jesus.\n\nLater, wise men from the East saw a special star and traveled many miles to bring the child gifts — gold, frankincense, and myrrh — gifts fit for a king. They bowed down and worshipped Him. Even these wealthy, educated scholars from a faraway land recognized that this baby was the King of all kings.\n\nAnd so the story of Jesus began — not with power and glory as the world expected, but with humility and love. A teenage mother, a faithful carpenter, a manger, some shepherds, and a star. God had entered the world as one of us, to walk among us, to show us His love, and ultimately to save us. It was the greatest gift ever given.' }
        ],
        moral: 'God sent Jesus into the world because He loves every single person. Jesus came as a humble baby to show that God cares about everyone — the poor, the forgotten, the overlooked. Christmas is a celebration of God\'s greatest gift: love wrapped in human skin.',
        keyVerse: { text: 'For unto you is born this day in the city of David a Savior, who is Christ the Lord.', ref: 'Luke 2:11' }
    },
    {
        id: 'good-samaritan',
        title: 'The Good Samaritan',
        icon: '❤️',
        testament: 'new-testament',
        reference: 'Luke 10:25-37',
        snippet: 'Jesus tells a story about who our true neighbor really is.',
        sections: [
            { title: 'A Tricky Question', text: 'One day, while Jesus was teaching, a lawyer — an expert in religious law — stood up and asked Him a question. But he wasn\'t asking because he genuinely wanted to learn. He was testing Jesus, trying to trap Him with a clever question.\n\n"Teacher," the lawyer said, "what must I do to inherit eternal life?"\n\nJesus, who always knew what was in people\'s hearts, turned the question back on him. "What is written in the Law? How do you read it?"\n\nThe lawyer answered confidently, reciting words he had memorized since childhood: "Love the Lord your God with all your heart, with all your soul, with all your strength, and with all your mind. And love your neighbor as yourself."\n\n"You have answered correctly," Jesus said. "Do this and you will live."\n\nBut the lawyer wasn\'t satisfied. He wanted to justify himself — to prove that he was already doing enough to earn eternal life. So he asked a follow-up question, and it\'s a question that would lead to one of the most famous stories Jesus ever told:\n\n"And who is my neighbor?"\n\nYou see, in those days, religious leaders had very strict ideas about who counted as a "neighbor." They meant people like them — fellow Jews, people from their synagogue, their own community. Certainly not foreigners, not sinners, and definitely not Samaritans. Samaritans and Jews had hated each other for centuries.\n\nJesus answered the lawyer\'s question with a story.' },
            { title: 'A Man Attacked on the Road', text: '"A man was going down from Jerusalem to Jericho," Jesus began.\n\nEveryone listening knew that road. It was a famously dangerous path — a winding, narrow road that dropped steeply through rocky desert wilderness for about seventeen miles. The road twisted through dark ravines and behind huge boulders — perfect hiding places for robbers. People called it the "Way of Blood" because so many travelers were attacked on it.\n\n"Robbers attacked the man," Jesus continued. "They stripped him of his clothes, beat him, and went away, leaving him half dead by the side of the road."\n\nPicture this poor man — beaten, bleeding, lying in the dust under the hot sun, too weak to call for help. His clothes were gone, which meant that anyone passing by couldn\'t even tell what nationality or social class he was. He was just a human being in desperate need.\n\nEvery second mattered. Without help, this man would die. And as it happened, someone was coming down the road.' },
            { title: 'Those Who Passed By', text: '"A priest happened to be going down the same road," Jesus said.\n\nA priest! Of all people, surely a priest would stop. Priests were the spiritual leaders of the community. They served in the temple, offered sacrifices to God, and taught people about God\'s love and compassion. If anyone would help a man in need, it would be a priest.\n\nBut the priest saw the bleeding man lying in the road and — passed by on the other side. He crossed to the far edge of the road, averted his eyes, and kept walking. Maybe he was late for a service at the temple. Maybe he was afraid the robbers were still nearby. Maybe he didn\'t want to touch a bloody body because it would make him ritually "unclean" according to religious rules. Whatever his excuse, he walked away from a dying man.\n\nThe lawyer and the crowd listening to Jesus must have shifted uncomfortably. A priest? Walking past?\n\n"Then a Levite came to the place," Jesus continued.\n\nA Levite was a temple assistant — another deeply religious person whose whole life was devoted to God\'s service. When the Levite saw the injured man, he actually walked closer to look at him. He could see the blood, the bruises, the man\'s shallow breathing. He assessed the situation.\n\nAnd then he, too, passed by on the other side.\n\nTwo religious leaders. Two men who spent their lives talking about God\'s love. Neither one stopped to help. The dying man was still lying in the road, his hope fading with each passing minute.\n\nJesus paused. His listeners leaned in. Who would help the man? Another religious leader? A wealthy merchant? A soldier?' },
            { title: 'The Samaritan Stops', text: '"But a Samaritan, as he traveled, came where the man was, and when he saw him, he took pity on him."\n\nA Samaritan! A gasp might have gone through the crowd. Jews and Samaritans despised each other. They wouldn\'t eat together, talk to each other, or even walk through each other\'s territory. If anyone had a reason to keep walking, it was the Samaritan. This beaten man was probably Jewish — one of the people who looked down on Samaritans and treated them as outcasts.\n\nBut the Samaritan didn\'t see an enemy lying in the road. He saw a human being who was suffering. And his heart was moved with compassion.\n\nThe Samaritan got off his donkey and knelt beside the injured man. He opened his own supplies — oil and wine, which were the ancient world\'s first aid kit — and gently cleaned and disinfected the man\'s wounds. He tore strips of cloth and carefully bandaged each cut and bruise. He spoke softly to the man, letting him know that help had arrived.\n\nThen, with great effort, the Samaritan lifted the injured man onto his own donkey. This meant the Samaritan himself had to walk — through dangerous territory, leading his donkey slowly and carefully so the wounded man wouldn\'t fall. Every step meant the Samaritan was making himself vulnerable. Every minute on that dangerous road put his own life at risk.\n\nThe Samaritan brought the man to an inn — a place where travelers could rest and recover. He cared for the man all through the night, checking on his wounds, giving him water, making sure he was comfortable.' },
            { title: 'Going Above and Beyond', text: 'The next morning, the Samaritan had to continue his journey. But he didn\'t just leave the man at the inn and wish him luck. He took out two silver coins — two denarii, which was about two days\' wages for a worker — and gave them to the innkeeper.\n\n"Look after him," the Samaritan said. "And when I return, I will reimburse you for any extra expense you have."\n\nThink about the generosity of this. The Samaritan gave his own medicine, his own bandages, his own donkey, his own time, his own money, and his own promise to come back and pay more if needed. He didn\'t just do the minimum — he went far above and beyond.\n\nHe didn\'t know the injured man\'s name. He didn\'t know if the man was rich or poor, good or bad, Jewish or Gentile. He didn\'t ask for thanks or recognition. He simply saw a person in need and did everything in his power to help.\n\nThis is what true love looks like in action.' },
            { title: 'The Question That Changes Everything', text: 'Jesus finished His story and turned to the lawyer. "Which of these three do you think was a neighbor to the man who fell into the hands of robbers?"\n\nThe answer was so obvious that even the lawyer — who probably didn\'t want to say the word "Samaritan" — had to admit it: "The one who had mercy on him."\n\nJesus said six simple words that still echo through the centuries: "Go and do likewise."\n\nWith this story, Jesus shattered every boundary people put up between themselves and others. He showed that being a "neighbor" isn\'t about living next door to someone, or being the same nationality, or attending the same church. Being a neighbor means seeing people who are hurting and actually doing something to help — no matter who they are.\n\nThe priest knew all about God but walked past. The Levite served in the temple but walked past. The Samaritan — the outcast, the one nobody expected — was the one who showed God\'s love in action.\n\nJesus\' message is clear: love is not just something you feel or talk about. Love is something you do. It\'s stopping when everyone else keeps walking. It\'s kneeling beside someone who needs help, even when it costs you something. It\'s treating every person — regardless of their background, nationality, or beliefs — as someone who matters deeply to God.' }
        ],
        moral: 'Being a good neighbor means helping anyone who needs it, even if they are different from us. True love isn\'t just words — it\'s action. Kindness has no boundaries, and compassion should have no limits.',
        keyVerse: { text: 'Love your neighbor as yourself.', ref: 'Luke 10:27' }
    },
    {
        id: 'prodigal-son',
        title: 'The Prodigal Son',
        icon: '🏠',
        testament: 'new-testament',
        reference: 'Luke 15:11-32',
        snippet: 'A son leaves home and wastes everything, but his father welcomes him back with open arms.',
        sections: [
            { title: 'A Father and Two Sons', text: 'Jesus told this story to a crowd of people — including some religious leaders who complained that Jesus spent too much time with "sinners." The Pharisees and teachers of the law muttered, "This man welcomes sinners and eats with them." So Jesus told them a story that would reveal the very heart of God.\n\n"There was a man who had two sons," Jesus began. The father was wealthy, with a large estate — fields, vineyards, servants, and livestock. He loved both of his sons dearly and had worked his whole life to provide for them.\n\nThe older son was responsible and dutiful. He worked hard on the farm, followed the rules, and never caused his father trouble. The younger son was restless. He looked out at the wide world beyond the farm and dreamed of adventure, excitement, and freedom. He was tired of the quiet, daily routine of home.\n\nOne day, the younger son did something almost unthinkable. He went to his father and said, "Father, give me my share of the estate — now."\n\nIn that culture, this request was deeply disrespectful. Essentially, the younger son was saying, "I wish you were dead. I want my inheritance now, while you\'re still alive, because I can\'t wait any longer." It was like a slap in the face, a rejection of everything the father had given him.\n\nThe father\'s heart must have broken. But amazingly, he didn\'t argue, lecture, or refuse. He divided his property between his two sons, giving the younger one his full share. The father knew he couldn\'t force his son to stay. Love doesn\'t hold people prisoner — even when it knows they\'re about to make a terrible mistake.' },
            { title: 'Far from Home', text: 'Not long after receiving his fortune, the younger son packed up everything he owned. He converted his inheritance into money — probably selling off land and livestock at low prices because he was in a hurry — and headed for a distant country, as far from home as he could get.\n\nAt first, everything was wonderful. The younger son had more money than he had ever seen. He bought expensive clothes, ate at the finest places, threw lavish parties, and surrounded himself with "friends" who were happy to help him spend his wealth. Everyone wanted to be around him. Every night was a celebration. He felt free, important, and alive.\n\nBut money doesn\'t last forever — especially when you\'re spending it as fast as you can with no plan to earn more.\n\nDay by day, the pile of coins shrank. The expensive clothes started to wear out. The "friends" who had crowded around him when he was buying drinks began to drift away as the money disappeared. When the last coin was spent and the younger son had nothing left, he looked around and discovered he was completely, utterly alone. Not one of his "friends" came to help. Not one offered him a meal or a place to stay.\n\nAnd then, to make everything worse, a severe famine struck the entire land. Food became scarce and expensive. The younger son — who had once been rich — was now penniless and starving in a foreign country, with no one who cared about him at all.' },
            { title: 'Feeding the Pigs', text: 'Desperate and hungry, the younger son went to a local farmer and begged for any kind of work. The farmer sent him to his fields to feed pigs.\n\nFor a Jewish young man, this was the absolute bottom. Pigs were considered unclean animals in Jewish culture. No respectable Jewish person would ever go near them, let alone spend their days slopping through the mud, pouring slop into troughs, breathing in the horrible smell, and watching swine eat.\n\nBut there the younger son was, standing knee-deep in a pigpen, so hungry that he stared at the carob pods he was feeding the pigs and wished he could eat them himself. The pods were tough, bitter, and meant for animals — but nobody offered him anything better.\n\nCan you imagine the contrast? Just months ago, he was at banquet tables overflowing with the finest food. Now he envied the pigs. Just months ago, he was surrounded by laughing friends. Now his only companions grunted and squealed.\n\nFinally, standing in that miserable pigpen, the younger son did something he should have done a long time ago. The Bible says "he came to his senses." It was as if he had been sleepwalking through life and suddenly woke up.\n\n"How many of my father\'s hired servants have food to spare," he said to himself, "and here I am starving to death! I will go back to my father and say to him: Father, I have sinned against heaven and against you. I am no longer worthy to be called your son. Make me like one of your hired servants."\n\nHe didn\'t think he deserved to come back as a son. He had given up that right when he took the money and left. But maybe — just maybe — his father would let him work as a servant. At least the servants had food to eat.' },
            { title: 'The Long Walk Home', text: 'So the younger son began the long, humbling journey home. Every step brought him closer to his father — and to the moment he dreaded most. What would his father say? Would he be angry? Would he turn him away? Would he humiliate him in front of the servants?\n\nThe son rehearsed his speech over and over as he walked: "Father, I have sinned against heaven and against you. I am no longer worthy to be called your son. Make me like one of your hired servants." He practiced the words until he knew them by heart.\n\nHe was dirty, thin, and ragged. His fine clothes were long gone, replaced by the stinking rags of a pig farmer. His feet were blistered. His stomach was empty. He looked nothing like the proud, handsome young man who had strutted away from home months ago.\n\nBut here is the most beautiful part of the entire story. While the son was still a long way off — while he was just a tiny figure on the horizon — his father saw him.\n\nThink about what that means. The father had been watching. Every day, perhaps multiple times a day, the old man had walked to the road and looked into the distance, hoping to see his boy coming home. He never stopped watching. He never stopped hoping. He never stopped loving.\n\nAnd when he finally saw that familiar figure in the distance — thinner, dirtier, stumbling — the father didn\'t wait. He didn\'t stand with his arms crossed. He didn\'t send a servant to fetch the boy. The Bible says the father was "filled with compassion for him." He hiked up his robes — something a dignified man in that culture would never do — and ran. He ran down the road toward his son.' },
            { title: 'The Father\'s Embrace', text: 'The father reached his son, threw his arms around him, and kissed him again and again. The son was filthy and smelled of pigs, but the father didn\'t care. He held his boy tightly, tears streaming down his face.\n\nThe son started his rehearsed speech: "Father, I have sinned against heaven and against you. I am no longer worthy to be called your son—"\n\nBut the father wasn\'t listening to the speech. He was already calling to his servants with excitement in his voice: "Quick! Bring the best robe and put it on him!" The best robe — the father\'s own finest garment, a symbol of honor and restoration. "Put a ring on his finger!" A ring — a sign of authority, belonging, and family identity. "And sandals on his feet!" Sandals — because servants went barefoot, but sons wore shoes. Every gift was the father\'s way of saying: "You are not a servant. You are my son. You were always my son."\n\n"Bring the fattened calf and kill it," the father continued. "Let\'s have a feast and celebrate! For this son of mine was dead and is alive again. He was lost and is found!"\n\nThe house erupted with joy. Music started playing, people started dancing, the smell of cooking filled the air, and laughter rang out through the estate. The father couldn\'t contain his happiness. His boy was home.' },
            { title: 'The Older Brother', text: 'Meanwhile, the older son had been working in the fields all day. As he approached the house, he heard music and dancing. He called one of the servants and asked what was going on.\n\n"Your brother has come home!" the servant said. "And your father has killed the fattened calf because he has him back safe and sound."\n\nThe older brother was furious. He refused to go inside. His father came out and pleaded with him, but the older brother exploded: "Look! All these years I\'ve been slaving for you and never disobeyed your orders. Yet you never gave me even a young goat so I could celebrate with my friends. But when this son of yours — " notice he didn\'t say "my brother" — "who has squandered your property, comes home, you kill the fattened calf for him!"\n\nThe older brother\'s anger reveals something important. He had been doing all the right things on the outside, but his heart was full of resentment. He saw himself as a slave, not a son. He kept score. He compared. He felt entitled.\n\nThe father\'s response was gentle and profound: "My son, you are always with me, and everything I have is yours. But we had to celebrate and be glad, because this brother of yours was dead and is alive again. He was lost and is found."\n\nJesus ended the story right there — leaving the listeners to decide how the older brother responded. Would he go inside and join the celebration? Would he welcome his brother home? Or would he stand outside, bitter and angry?\n\nThe question was aimed straight at the Pharisees who criticized Jesus for welcoming sinners. They were like the older brother — dutiful on the outside, but unable to rejoice when lost people were found.\n\nThe message of this story is stunning: God is like the father — always watching, always hoping, always ready to run to us with open arms. No matter how far we\'ve wandered, no matter how badly we\'ve messed up, the Father is waiting to welcome us home. Not as servants. As sons and daughters.' }
        ],
        moral: 'No matter how far we wander or how many mistakes we make, God is always waiting to welcome us back with open arms. His love is unconditional and His forgiveness has no limit.',
        keyVerse: { text: 'For this son of mine was dead and is alive again; he was lost and is found.', ref: 'Luke 15:24' }
    },
    {
        id: 'feeding-five-thousand',
        title: 'Feeding the Five Thousand',
        icon: '🍞',
        testament: 'new-testament',
        reference: 'John 6:1-14',
        snippet: 'Jesus feeds a huge crowd with just five loaves and two fish.',
        sections: [
            { title: 'A Crowd That Wouldn\'t Leave', text: 'It had been an exhausting time for Jesus and His disciples. They had been traveling, teaching, and healing people without a break. Jesus suggested they take a boat across the Sea of Galilee to find a quiet place to rest.\n\nBut when they reached the other shore, they discovered that the quiet retreat they hoped for wasn\'t going to happen. A massive crowd had followed them — walking all the way around the lake on foot. By the time Jesus stepped out of the boat, thousands of people were already there, waiting for Him.\n\nJesus could have been frustrated. He was tired and needed rest. But when He saw the crowd, the Bible says He "had compassion on them, because they were like sheep without a shepherd." His heart went out to them. These people were hungry for truth, for healing, for hope. And Jesus gave it to them.\n\nHe spent the entire day teaching them about God\'s kingdom and healing those who were sick. He touched blind eyes and they could see. He healed crippled legs and they could walk. He cured diseases and soothed suffering. The people hung on His every word, amazed by His wisdom and power.\n\nHours passed. The sun began to sink toward the western hills, painting the sky orange and gold. The crowd — over five thousand men, plus women and children, probably totaling fifteen to twenty thousand people — was still there, sitting on the grassy hillside. And they were getting very, very hungry.' },
            { title: 'An Impossible Problem', text: 'The disciples came to Jesus as the shadows lengthened. "This is a remote place," they said, "and it\'s already getting late. Send the crowds away so they can go to the villages and buy themselves some food."\n\nIt was a practical suggestion. There was no way to feed this many people out here in the middle of nowhere. Better to send everyone off to find food on their own.\n\nBut Jesus said something that stopped His disciples cold: "They do not need to go away. You give them something to eat."\n\nThe disciples stared at Him. Had He lost His mind? Philip did some quick mental math and said, "It would take more than half a year\'s wages to buy enough bread for each one to have just a bite!" Even if they had that much money — which they didn\'t — there was nowhere out here to buy that much food.\n\nJesus was testing them. He already knew what He was going to do. He wanted to see if they would trust Him with an impossible situation — or if they would only see the problem.\n\n"How many loaves do you have?" Jesus asked. "Go and see."\n\nThe disciples fanned out through the crowd, asking if anyone had brought food. The situation looked hopeless.' },
            { title: 'A Boy\'s Lunch', text: 'Andrew, Simon Peter\'s brother, came back with the only food they could find. "Here is a boy with five small barley loaves and two small fish," he reported. Then he added, almost apologetically, "But how far will they go among so many?"\n\nFive loaves and two fish. That was it. The loaves were small — not big bakery loaves, but little round circles of bread, more like pita bread or dinner rolls. And the fish were small — probably dried or pickled sardines, the kind of humble food a poor family would pack for their child\'s lunch.\n\nImagine being that boy. He was probably young — maybe eight or ten years old. His mother had lovingly packed him a simple lunch that morning. It was nothing special — just a poor family\'s everyday food. And now Andrew was bringing him to stand before Jesus, the great teacher that thousands of people had come to hear.\n\nDid the boy hesitate? Did he think, "But this is all I have"? Or did he simply hand over his lunch, trusting that Jesus would do something good with it?\n\nWhatever the boy thought, he gave everything he had. Five loaves. Two fish. It was a tiny offering — laughably small compared to the need. But he gave it to Jesus and that made all the difference.' },
            { title: 'The Miracle on the Hill', text: 'Jesus said, "Have the people sit down." The disciples organized the crowd into groups — groups of fifty and groups of a hundred — spreading across the green hillside like a patchwork quilt. The people sat down on the soft grass, wondering what was about to happen.\n\nThen Jesus took those five small loaves and two tiny fish in His hands, looked up to heaven, and gave thanks. He blessed the food and began to break it into pieces, handing the pieces to His disciples to distribute to the crowd.\n\nAnd then the miracle happened. Jesus broke the bread — and there was more. He broke off another piece — and there was more still. The bread kept coming. The fish kept multiplying. The disciples\' baskets stayed full no matter how much they gave away. They went from group to group, handing out bread and fish, and the supply never ran out.\n\nPicture the scene: twelve disciples weaving through a crowd of thousands, their baskets overflowing. People reaching up with eager hands, receiving bread and fish, taking a bite and looking at each other in wonder. "Where is this all coming from? There was only a boy\'s lunch!" Laughter and amazement rippled through the crowd.\n\nEveryone ate. Not just a nibble. Not just a taste. The Bible says they all "ate and were satisfied." Every single person — every man, woman, child, from the healthiest to the sickest, from the richest to the poorest — ate until they were completely full. Fifteen to twenty thousand stomachs, satisfied by five loaves and two fish.' },
            { title: 'Twelve Baskets Left Over', text: 'When everyone had finished eating, Jesus said something surprising: "Gather the pieces that are left over. Let nothing be wasted."\n\nThe disciples went back through the crowd, collecting the uneaten food. And when they were done, they had filled twelve baskets with leftover bread and fish. Twelve full baskets — more food was left over than they had started with!\n\nTwelve baskets for twelve disciples. It was as if Jesus was giving each of His followers a personal reminder: "I can provide more than enough. Trust me."\n\nThe people were astonished. They had just witnessed something that defied every law of nature. Five loaves and two fish had fed thousands of people with twelve baskets to spare. They began saying to one another, "Surely this is the Prophet who is to come into the world!"\n\nBut in all the excitement, let\'s not forget the boy. An unnamed child, carrying a humble lunch his mother had packed, had the courage to offer it to Jesus. He didn\'t say, "It\'s too small." He didn\'t say, "It won\'t make a difference." He simply gave what he had.\n\nAnd Jesus turned that small, willing gift into one of the greatest miracles in all of scripture. That\'s what God does — He takes what we offer, no matter how small or insignificant it seems, and He multiplies it beyond anything we could imagine. The only thing He needs from us is the willingness to give.' }
        ],
        moral: 'When we offer what we have to God — even if it seems small and insignificant — He can do amazing, miraculous things with it. No gift is too small for God to use. What matters is not the size of what we give, but the willingness of our hearts.',
        keyVerse: { text: 'Here is a boy with five small barley loaves and two small fish, but how far will they go among so many?', ref: 'John 6:9' }
    },
    {
        id: 'jesus-walks-on-water',
        title: 'Jesus Walks on Water',
        icon: '🌊',
        testament: 'new-testament',
        reference: 'Matthew 14:22-33',
        snippet: 'Jesus walks across a stormy lake and teaches Peter about faith.',
        sections: [
            { title: 'Alone on the Mountain', text: 'Right after the miracle of feeding the five thousand, the crowd was so amazed that they wanted to make Jesus their king by force. But that wasn\'t the kind of kingdom Jesus had come to build. He needed to get away.\n\nJesus told His disciples to get into the boat and go ahead of Him to the other side of the Sea of Galilee. Then He sent the crowd away and went up on a mountainside — alone — to pray. The sun set, and darkness crept across the land. Jesus was up on the mountain in the stillness of the night, talking with His Father.\n\nMeanwhile, the disciples were out on the open water. They had expected a routine crossing — maybe an hour or two of rowing. But as they got farther from shore, the wind began to pick up. The calm surface of the lake started to chop and churn.\n\nThe Sea of Galilee is surrounded by hills, and cool air from the surrounding plateaus can rush down through the valleys and hit the warm lake surface with sudden, violent force. What starts as a breeze can become a deadly storm in minutes.\n\nThat night, the storm hit hard. The wind howled. The waves grew higher and higher, crashing over the sides of the boat. The disciples — several of whom were experienced fishermen who had spent their lives on this lake — were straining at the oars, fighting with all their strength against the wind. They had been rowing for hours and were still in the middle of the lake, making almost no progress. They were exhausted, soaked, and frightened.' },
            { title: 'A Figure on the Waves', text: 'It was now the fourth watch of the night — somewhere between three and six o\'clock in the morning. The disciples had been battling the storm for most of the night. They were at the end of their strength, their arms aching, their eyes stinging from salt spray.\n\nAnd then, through the dim, gray predawn light, they saw something that made their blood run cold. A figure was moving toward them across the surface of the water. Not swimming. Not in a boat. Walking. Walking on top of the churning, wave-tossed sea as easily as walking down a road.\n\nThe disciples screamed in terror. "It\'s a ghost!" they cried out. In the darkness, with the storm raging around them and their nerves already frayed, they were convinced they were seeing an apparition. Some of them cried. Others huddled in the bottom of the boat. Fear gripped every heart.\n\nBut then a familiar voice cut through the wind and the waves — calm, clear, and strong:\n\n"Take courage! It is I. Don\'t be afraid."\n\nIt was Jesus. Walking on the water. In the middle of the storm. Coming to them.\n\nThink about what this means. Jesus didn\'t come after the storm. He came during it. He didn\'t wait until things were calm and safe and easy. He walked right into the chaos, right into the wind and waves, right into the darkness, to reach His friends when they needed Him most.' },
            { title: 'Peter Steps Out', text: 'Peter — impulsive, passionate, brave Peter — heard Jesus\' voice and felt something surge in his heart. While the other disciples stayed huddled in the boat, Peter called out through the storm:\n\n"Lord, if it\'s You, tell me to come to You on the water!"\n\nWhat a request! Peter wasn\'t content to just watch the miracle from a safe distance. He wanted to experience it. He wanted to walk where Jesus walked, even if it meant stepping out of the boat into a raging storm.\n\nJesus said one word: "Come."\n\nPeter swung his legs over the side of the boat. He looked at the churning water below him — water that should have swallowed him up the instant he put his weight on it. Then he looked at Jesus. And he stepped out.\n\nHis foot hit the surface of the water — and it held! Peter stood on the sea. He was standing on water! He took one step, then another, then another. The waves sloshed around his feet but held firm beneath him, as solid as stone. Peter was walking on the water toward Jesus.\n\nFor those incredible moments, Peter experienced something no ordinary human had ever done. He walked on water. Not because of his own power, but because Jesus said "Come" and Peter trusted Him enough to step out of the boat.\n\nThe other eleven disciples watched from the boat, mouths hanging open. Peter was actually doing it.' },
            { title: 'Sinking and Saved', text: 'But then something changed.\n\nPeter felt the wind slam against his face. A massive wave rolled past him. He looked down at the dark, churning water beneath his feet. He saw how far he was from the boat. He heard the roar of the storm.\n\nAnd Peter took his eyes off Jesus.\n\nThe instant he focused on the storm instead of the Savior, the impossible became impossible again. Fear rushed in. Doubt flooded his mind. And Peter began to sink.\n\nHis feet broke through the surface. The cold water rushed up his legs, his waist, his chest. Panic seized him. Peter did the only thing he could do — he cried out with all his heart: "Lord, save me!"\n\nImmediately — not after a pause, not after a lecture, not after making Peter wait — immediately, Jesus reached out His hand and caught Peter. Strong, steady, unshakeable. Jesus pulled him up out of the water and held him.\n\n"You of little faith," Jesus said gently. "Why did you doubt?"\n\nNotice that Jesus didn\'t say "You of no faith." Peter had enough faith to get out of the boat! He had enough faith to walk on water! He just didn\'t have enough faith to keep walking when the storm got scary. And honestly, how many of us would?\n\nBut here\'s the beautiful thing: when Peter cried out, Jesus didn\'t let him drown. He didn\'t say, "Well, you should have trusted more." He reached out His hand immediately and saved him. That\'s who Jesus is. He meets us in our doubt, catches us when we fall, and lifts us back up.' },
            { title: 'The Storm Stops', text: 'Jesus and Peter climbed into the boat together. The moment Jesus stepped into the boat, the wind simply stopped. Just like that. The howling gale that had battered them all night — gone. The churning waves — calm. The darkness began to give way to the first golden light of dawn. The sea was as smooth as glass.\n\nThe disciples sat in the boat, stunned. Dripping wet, exhausted, overwhelmed by everything they had just witnessed. They had watched Jesus walk across a stormy sea. They had watched Peter walk on water. They had watched Jesus rescue Peter from sinking. And now they had watched Jesus silence a storm with His mere presence.\n\nOne by one, the disciples did the only thing that made sense. They fell down and worshipped Him. "Truly You are the Son of God," they said.\n\nThis story teaches us something profound about faith. Peter\'s faith wasn\'t perfect — he doubted, he got scared, he sank. But Peter was the only one who got out of the boat. Eleven disciples stayed where it was safe. Peter stepped into the impossible. And even when he failed, Jesus was right there to catch him.\n\nFaith isn\'t about being perfect. It\'s about keeping our eyes on Jesus even when the storms of life are raging around us. And when we do take our eyes off Him — when we focus on our fears and start to sink — all we have to do is cry out, "Lord, save me!" And He will. Every time. Immediately. Without hesitation.' }
        ],
        moral: 'When we keep our eyes on Jesus and trust Him, we can do incredible things. But when we focus on our fears, we start to sink. The good news is that Jesus is always there to catch us when we call out to Him.',
        keyVerse: { text: 'Take courage! It is I. Don\'t be afraid.', ref: 'Matthew 14:27' }
    },
    {
        id: 'easter',
        title: 'The Resurrection of Jesus',
        icon: '✝️',
        testament: 'new-testament',
        reference: 'Matthew 26–28, Luke 22–24, John 19–20',
        snippet: 'Jesus gives His life for the world and rises again three days later.',
        sections: [
            { title: 'The Last Supper', text: 'It was the night before the darkest day in history. Jesus gathered His twelve disciples around a long table in an upper room in Jerusalem for a special Passover meal — a celebration that remembered how God had rescued the Israelites from Egypt long ago.\n\nBut this meal was different. Jesus knew that in just a few hours, He would be arrested, put on trial, and killed. He knew it was coming, and He had chosen to face it — not because He had to, but because He loved the world so much.\n\nDuring the meal, Jesus took bread, gave thanks to God, broke it, and gave it to His disciples. "Take and eat," He said. "This is My body, given for you." Then He took a cup of wine and said, "This cup is the new covenant in My blood, which is poured out for you for the forgiveness of sins. Do this in remembrance of Me."\n\nThe disciples didn\'t fully understand what Jesus was saying. How could they? He was telling them that He was about to give His own life — His body and His blood — to save them and the entire world.\n\nJesus also knelt on the floor that night and washed His disciples\' feet — a job usually done by the lowest servant. He was showing them that true leadership means serving others. "I have set you an example," He said. "You should do as I have done for you."\n\nAfter supper, Jesus went with His disciples to a quiet garden called Gethsemane. There, He prayed so intensely that His sweat fell like drops of blood. "Father, if it is possible, let this cup pass from Me," He prayed. "Yet not My will, but Yours be done." Jesus was fully human, and He was in anguish about what was coming. But He chose obedience. He chose love.' },
            { title: 'The Arrest and Trial', text: 'While Jesus was still praying, a crowd arrived with torches, swords, and clubs — led by Judas, one of Jesus\' own twelve disciples. Judas had betrayed Jesus for thirty pieces of silver. He walked up to Jesus and kissed Him on the cheek — a signal to the soldiers that this was the man they were looking for.\n\nJesus was arrested and dragged through a series of trials that lasted through the night. First before the Jewish high priest, then before the council of religious leaders called the Sanhedrin, then before the Roman governor Pontius Pilate, then before King Herod, and then back to Pilate. The trials were unjust and illegal in many ways — witnesses lied, rules were broken, and the verdict was decided before the trial began.\n\nThe religious leaders accused Jesus of blasphemy — claiming to be God. They spit in His face, blindfolded Him, and struck Him. Soldiers mocked Him, pressed a crown made of sharp thorns onto His head, and whipped Him with a brutal Roman scourge.\n\nMeanwhile, Peter — the same bold Peter who had walked on water — followed Jesus to the high priest\'s courtyard. A servant girl recognized him. "You were with Jesus," she said. But Peter denied it. Three times Peter was asked, and three times he said, "I don\'t know the man." When a rooster crowed, Peter remembered that Jesus had predicted this, and Peter went outside and wept bitterly.\n\nPilate examined Jesus and found no crime worthy of death. "I find no basis for a charge against this man," he said. But the crowd, stirred up by the religious leaders, shouted, "Crucify Him! Crucify Him!" Pilate, afraid of a riot, washed his hands and handed Jesus over to be crucified.' },
            { title: 'The Cross', text: 'Jesus was forced to carry a heavy wooden cross through the streets of Jerusalem. The rough wood dug into His already-torn back. He stumbled under the weight, and a man named Simon from Cyrene was pulled from the crowd to help carry the cross.\n\nThey brought Jesus to a hill called Golgotha — "the Place of the Skull." There, Roman soldiers nailed Jesus\' hands and feet to the cross and lifted it upright. The pain was indescribable — crucifixion was designed to be the most agonizing form of execution ever invented.\n\nTwo criminals were crucified alongside Jesus, one on His right and one on His left. The religious leaders mocked Him. "He saved others," they sneered, "but He can\'t save Himself! If you\'re the Son of God, come down from the cross!" The soldiers gambled for His clothes. People passing by hurled insults.\n\nBut even on the cross, Jesus showed who He really was. He looked down at the people who had beaten Him, mocked Him, and nailed Him to the wood, and He prayed: "Father, forgive them, for they do not know what they are doing."\n\nOne of the criminals beside Him mocked Him too. But the other criminal rebuked the first and said, "We deserve our punishment, but this man has done nothing wrong." Then he turned to Jesus and said, "Jesus, remember me when You come into Your kingdom." And Jesus — hanging in agony, struggling to breathe — said, "Truly I tell you, today you will be with Me in paradise."\n\nFrom noon until three in the afternoon, darkness covered the entire land. The sun itself seemed to hide its face. Then Jesus cried out in a loud voice, "It is finished!" — meaning the work of salvation was complete. He bowed His head and breathed His last breath.\n\nAt that moment, the thick curtain in the temple — a massive veil that separated people from God\'s holiest place — was torn in two from top to bottom. The earth shook. Rocks split apart. Even the Roman centurion who had overseen the execution was shaken. "Surely this man was the Son of God," he said.\n\nJesus\' body was taken down from the cross by a wealthy man named Joseph of Arimathea, who laid it in his own new tomb carved out of rock. A huge stone was rolled across the entrance, and Roman soldiers were posted to guard it. Jesus was dead, and His followers\' hearts were shattered.' },
            { title: 'The Darkest Saturday', text: 'Saturday was the longest, most hopeless day the disciples had ever experienced. Their teacher, their leader, their friend — the one they believed was the Messiah — was dead and buried.\n\nThe disciples hid behind locked doors, terrified that the same authorities who killed Jesus would come for them next. Some wept. Some sat in stunned silence. Some wondered if everything they had believed was wrong. Where was the kingdom Jesus promised? Where was the victory? Where was God?\n\nMary, Jesus\' mother, grieved for her son. The other women who had followed Jesus sat together, preparing burial spices and perfumes to properly anoint His body when the Sabbath was over. It was all they could do.\n\nTo the world, it looked like the story was over. Evil had won. Death had the final word. Hope was buried in a tomb behind a sealed stone.\n\nBut God was not finished.' },
            { title: 'The Empty Tomb', text: 'Very early on Sunday morning, before the sun had fully risen, a group of women — including Mary Magdalene — made their way to the tomb. They carried the burial spices they had prepared, and they worried about one practical problem: "Who will roll the stone away from the entrance for us?" The stone was enormous — far too heavy for them to move.\n\nBut when they arrived, they stopped in their tracks. The stone had already been rolled away! The tomb was open.\n\nAn earthquake had shaken the ground. An angel of the Lord had descended from heaven, rolled away the stone, and was sitting on it. His appearance was like lightning, and his clothes were white as snow. The Roman guards were so terrified that they had fainted and lay on the ground like dead men.\n\nThe angel spoke to the women: "Do not be afraid! I know that you are looking for Jesus, who was crucified. He is not here — He has risen, just as He said! Come and see the place where He lay."\n\nThe women stepped trembling into the tomb. It was empty. The strips of linen that had wrapped Jesus\' body were lying there, neatly folded. But Jesus was gone.\n\nHe was not there because death could not hold Him. The grave could not contain Him. The stone could not keep Him. Jesus Christ, the Son of God, had risen from the dead!' },
            { title: 'Jesus Is Alive!', text: 'The women ran from the tomb — trembling, bewildered, overflowing with a strange mixture of fear and incredible joy. They had to tell the disciples.\n\nMary Magdalene, tears streaming down her face, came back to the garden near the tomb. Through her tears, she saw a figure standing nearby. She thought He was the gardener.\n\n"Woman, why are you crying?" He asked. "Who is it you are looking for?"\n\n"Sir," she said, "if you have carried Him away, tell me where you have put Him, and I will get Him."\n\nThen Jesus said one word — her name: "Mary."\n\nShe knew that voice. She would know it anywhere. "Rabboni!" she cried — "Teacher!" — and she fell at His feet. Jesus was alive. He was real. He was standing right there.\n\nThat same day, Jesus appeared to two followers walking on the road to Emmaus. He walked with them, talked with them, and opened the scriptures to them. When He broke bread with them at supper, their eyes were opened and they recognized Him.\n\nThat evening, Jesus appeared to the disciples hiding in the locked room. "Peace be with you," He said, showing them His hands and His side. The disciples were overjoyed — it was really Him! Thomas, who wasn\'t there, refused to believe until he could see for himself. A week later, Jesus appeared again and said to Thomas, "Put your finger here; see My hands. Stop doubting and believe." Thomas fell to his knees: "My Lord and my God!"\n\nOver the next forty days, Jesus appeared to more than five hundred people at different times and places. He ate fish with His disciples on the shore of the Sea of Galilee. He reinstated Peter, asking him three times, "Do you love Me?" — once for each time Peter had denied Him. He taught them about His kingdom and prepared them for the mission ahead.\n\nThen, on a hillside outside Jerusalem, Jesus gave His final instruction: "Go into all the world and make disciples of all nations, baptizing them and teaching them everything I have commanded you. And surely I am with you always, to the very end of the age."\n\nAs the disciples watched, Jesus was taken up into the sky and a cloud hid Him from their sight. Two angels appeared and said, "This same Jesus, who has been taken from you into heaven, will come back in the same way you have seen Him go."\n\nThe resurrection of Jesus is the most important event in all of history. It proved that Jesus truly was who He said He was — the Son of God. It showed that death itself had been defeated. And it gave a promise to every person who believes in Him: because He lives, we can live too. Not just now, but forever.\n\nThe stone was rolled away. The tomb was empty. Death lost its sting. And the greatest story ever told doesn\'t end with a grave — it ends with the words that have echoed through two thousand years of history:\n\nHe is risen. He is risen indeed.' }
        ],
        moral: 'The resurrection shows that God\'s love is more powerful than anything — even death itself. Jesus willingly gave His life out of love for the whole world, and His rising again gives hope and eternal life to everyone who believes in Him.',
        keyVerse: { text: 'He is not here; he has risen, just as he said.', ref: 'Matthew 28:6' }
    },
    {
        id: 'tower-of-babel',
        title: 'The Tower of Babel',
        icon: '🏗️',
        testament: 'old-testament',
        reference: 'Genesis 11:1-9',
        snippet: 'People try to build a tower to reach heaven, but God has other plans.',
        sections: [
            { title: 'One Language, One People', text: 'After the great flood, Noah\'s descendants began to multiply and spread across the earth. At this time, everyone in the world spoke the same language and used the same words. There were no barriers between people — everyone could understand each other perfectly.\n\nAs people migrated eastward, they found a wide, flat plain in the land of Shinar — the region that would later become Babylon. The soil was rich, the land was fertile, and the people decided to settle there. They discovered how to make bricks by baking clay in fire, and they used tar as mortar to hold the bricks together. With these new building techniques, they felt they could build anything.' },
            { title: 'A Tower to the Heavens', text: 'The people gathered together and said, "Come, let us build ourselves a city, with a tower that reaches to the heavens, so that we may make a name for ourselves. Otherwise we will be scattered over the face of the whole earth."\n\nThis wasn\'t just about architecture. The people were driven by pride. They wanted to make themselves famous — to prove they were powerful enough to reach heaven on their own, without God. They wanted to stay together in one place and build a monument to their own greatness, rather than spreading across the earth as God had told them to do.\n\nThe tower rose higher and higher, brick by brick. It was probably a massive stepped pyramid — a ziggurat — reaching toward the sky. The people worked day and night, pouring their energy into this monument to human pride. They felt unstoppable. They felt like they didn\'t need God at all.' },
            { title: 'God Comes Down', text: 'But the Lord came down to see the city and the tower the people were building. The Bible says God "came down" — which is an almost humorous detail. The tower that the people thought reached to the heavens was so small from God\'s perspective that He had to come down just to see it!\n\nGod saw what was happening and said, "If as one people speaking the same language they have begun to do this, then nothing they plan to do will be impossible for them." God wasn\'t threatened by the tower. He was concerned about the direction of humanity\'s heart. United in pride and rebellion, there would be no limit to the trouble they would cause.\n\nSo God did something remarkable. He confused their language. Suddenly, the workers couldn\'t understand each other. One person would ask for bricks and the other would hear gibberish. Orders were misunderstood. Arguments broke out. The construction site became a scene of total chaos — people waving their arms, shouting in languages no one else could comprehend.\n\nWork on the tower ground to a halt. People naturally grouped together with others who spoke the same language, and these groups began to drift apart, moving away from the unfinished tower to settle in different parts of the earth — exactly as God had originally intended.\n\nThe city was called Babel — which sounds like the Hebrew word for "confused" — because that is where the Lord confused the language of the whole world. The great tower, that proud monument to human ambition, was left unfinished, a crumbling reminder that human pride always falls short of God\'s plans.' },
            { title: 'The Lesson of Babel', text: 'The Tower of Babel teaches us that pride — thinking we don\'t need God — always leads to confusion and failure. The people wanted to make a name for themselves, but God is the one who gives us our true identity and purpose.\n\nInterestingly, many centuries later, God reversed the confusion of Babel in a beautiful way. On the day of Pentecost, the Holy Spirit came upon Jesus\' followers, and they suddenly spoke in many different languages so that people from every nation could hear and understand the good news about God\'s love. What pride scattered, God\'s Spirit brought back together.\n\nThe tower the people built crumbled and was forgotten. But the name of God endures forever. True greatness doesn\'t come from building monuments to ourselves — it comes from humbly trusting God and following His plan for our lives.' }
        ],
        moral: 'Pride and trying to do things without God leads to confusion. True greatness comes from humility and trusting in God\'s plan rather than our own ambitions.',
        keyVerse: { text: 'That is why it was called Babel — because there the Lord confused the language of the whole world.', ref: 'Genesis 11:9' }
    },
    {
        id: 'jacob-esau',
        title: 'Jacob and Esau',
        icon: '👬',
        testament: 'old-testament',
        reference: 'Genesis 25-33',
        snippet: 'Twin brothers struggle with jealousy and deception, but ultimately find forgiveness.',
        sections: [
            { title: 'The Twin Brothers', text: 'Isaac, the son of Abraham, married a beautiful woman named Rebekah. For many years they had no children, and Isaac prayed earnestly to God. God answered his prayer, and Rebekah became pregnant — with twins!\n\nEven before they were born, the two babies struggled and kicked inside their mother. God told Rebekah, "Two nations are in your womb, and two peoples will be separated. The older will serve the younger."\n\nThe first baby was born red and hairy all over, so they named him Esau. The second baby came out gripping Esau\'s heel, so they named him Jacob, which means "he grasps the heel" — a phrase that also meant "deceiver."\n\nAs the boys grew up, they became very different. Esau was an outdoorsman — a skilled hunter who loved the open fields. He was rugged, impulsive, and lived for the moment. Jacob was quiet and thoughtful, preferring to stay close to home among the tents. Their father Isaac favored Esau because he enjoyed eating the wild game Esau brought home, while their mother Rebekah favored Jacob.' },
            { title: 'The Birthright and the Blessing', text: 'One day, Esau came home from hunting, exhausted and famished. Jacob was cooking a pot of delicious red stew. "Give me some of that stew!" Esau demanded. "I\'m starving!"\n\nJacob saw his opportunity. "First, sell me your birthright," he said. The birthright was the special privilege of the firstborn son — it meant a double share of the inheritance and the role of family leader.\n\nEsau, thinking only about his immediate hunger, said carelessly, "What good is a birthright to me if I\'m about to die of hunger?" He swore an oath and sold his birthright for a bowl of stew. Esau valued instant pleasure over his God-given blessing.\n\nYears later, their elderly father Isaac was nearly blind and felt he was nearing death. He called Esau and asked him to hunt some wild game, prepare his favorite meal, and then receive the family blessing — a powerful, once-in-a-lifetime pronouncement that would determine the family\'s future.\n\nRebekah overheard and hatched a plan. She dressed Jacob in Esau\'s clothes, covered his smooth skin with goatskins so he would feel hairy like Esau, and prepared a meal for Jacob to bring to his father. Jacob went in, pretending to be Esau. Isaac was suspicious — "The voice is Jacob\'s, but the hands are Esau\'s" — but he was deceived and gave Jacob the blessing meant for the firstborn.\n\nWhen Esau returned and discovered what had happened, he let out a loud and bitter cry. He begged for a blessing too, but the primary blessing could not be taken back. Esau was furious and vowed to kill Jacob.' },
            { title: 'Jacob Runs Away', text: 'Jacob fled for his life, heading north to his uncle Laban\'s household in Haran. On the way, exhausted and alone, he stopped for the night and used a stone as a pillow. That night, God gave Jacob an extraordinary dream.\n\nHe saw a stairway — a ladder — reaching from earth all the way up to heaven, with angels going up and down on it. At the top stood the Lord Himself, who spoke: "I am the Lord, the God of your father Abraham and the God of Isaac. I will give you and your descendants the land on which you are lying. Your descendants will be like the dust of the earth. All peoples on earth will be blessed through you. I am with you and will watch over you wherever you go."\n\nJacob woke up in awe. "Surely the Lord is in this place, and I was not aware of it!" he said. He named the place Bethel — "House of God" — and made a vow to follow the Lord.\n\nJacob went on to live with Uncle Laban for twenty years. He fell in love with Laban\'s daughter Rachel and worked seven years to marry her — but Laban tricked him and gave him the older daughter Leah instead! Jacob — the deceiver — had been deceived. He worked another seven years for Rachel. During those years, Jacob had twelve sons who would become the twelve tribes of Israel.' },
            { title: 'Wrestling with God', text: 'After twenty years, God told Jacob to return home. But Jacob was terrified — Esau was coming to meet him with four hundred men! Jacob was sure his brother was coming for revenge.\n\nThe night before the meeting, Jacob sent his family across a stream and stayed behind alone. In the darkness, a mysterious man appeared and wrestled with Jacob all night long. They grappled until dawn, and the man touched Jacob\'s hip, wrenching it out of socket. But Jacob held on and said, "I will not let you go unless you bless me!"\n\nThe man asked, "What is your name?" When Jacob said his name — which meant "deceiver" — the man said, "Your name will no longer be Jacob, but Israel, because you have struggled with God and with humans and have overcome." Jacob realized he had been wrestling with God Himself. He named the place Peniel, saying, "I saw God face to face, and yet my life was spared."' },
            { title: 'Two Brothers Reunited', text: 'The next morning, Jacob limped forward to meet Esau. He bowed low to the ground seven times as he approached his brother, trembling with fear.\n\nBut Esau didn\'t attack. He didn\'t shout. He didn\'t draw a weapon. Instead, Esau ran to Jacob, threw his arms around his neck, and kissed him. Both brothers wept — tears of relief, tears of regret, tears of forgiveness. Twenty years of bitterness and anger melted away in that embrace.\n\n"Who are all these people with you?" Esau asked, looking at Jacob\'s large family.\n\n"They are the children God has graciously given your servant," Jacob replied.\n\nJacob offered Esau gifts — large flocks of animals — as a peace offering. At first Esau refused: "I already have plenty, my brother. Keep what you have." But Jacob insisted: "Please accept this gift, for to see your face is like seeing the face of God, now that you have received me so kindly."\n\nThe two brothers who had been separated by deception, jealousy, and anger were reunited by forgiveness and grace. Jacob — now Israel — had been transformed from a deceiver into a man who wrestled with God and found blessing. And Esau had been transformed from a man of revenge into a man of extraordinary forgiveness.' }
        ],
        moral: 'Deception and jealousy cause terrible pain, but forgiveness can heal even the deepest wounds. God can transform anyone — even a deceiver — into someone who walks with Him.',
        keyVerse: { text: 'Your name will no longer be Jacob, but Israel, because you have struggled with God and with humans and have overcome.', ref: 'Genesis 32:28' }
    },
    {
        id: 'balaam-donkey',
        title: 'Balaam\'s Donkey',
        icon: '🫏',
        testament: 'old-testament',
        reference: 'Numbers 22-24',
        snippet: 'God uses a talking donkey to stop a prophet from making a terrible mistake.',
        sections: [
            { title: 'A King\'s Fear', text: 'The Israelites were traveling through the wilderness toward the Promised Land, and they had already defeated several powerful armies along the way. When Balak, the king of Moab, saw the massive Israelite camp spreading across the plains near his kingdom, he was absolutely terrified.\n\n"These people will lick up everything around us, as an ox licks up the grass of the field!" Balak said. He knew his army couldn\'t defeat the Israelites in battle — God was clearly on their side.\n\nSo Balak came up with a different plan. He sent messengers to a famous prophet named Balaam, who lived far away near the Euphrates River. "A people has come out of Egypt and they cover the face of the land," Balak\'s message said. "Come and put a curse on these people, because they are too powerful for me. Perhaps then I will be able to defeat them." Balak sent rich rewards and promised great honor if Balaam would come.' },
            { title: 'God Says No', text: 'That night, God spoke to Balaam. "Do not go with them. You must not put a curse on those people, because they are blessed."\n\nBalaam told the messengers to go home. But Balak wasn\'t giving up. He sent even more distinguished officials with promises of even greater riches. "I will reward you handsomely and do whatever you say," Balak pleaded. "Please come and curse these people for me."\n\nBalaam replied, "Even if Balak gave me all the silver and gold in his palace, I could not do anything great or small to go beyond the command of the Lord my God." But that night, God told Balaam he could go — but only if he spoke exactly the words God gave him.\n\nBalaam saddled his donkey the next morning and set off with the Moabite officials.' },
            { title: 'The Donkey Sees the Angel', text: 'But God was angry because Balaam\'s heart was drawn to the riches Balak promised. So the angel of the Lord stood in the road with a drawn sword to block Balaam\'s path.\n\nBalaam couldn\'t see the angel — but his donkey could! The donkey saw the terrifying angel standing in the road, holding a flashing sword, and she swerved off the road into a field. Balaam was furious and beat the donkey to get her back on the road.\n\nThen the angel stood in a narrow path between two vineyard walls. The donkey, trying to squeeze past, pressed against the wall and crushed Balaam\'s foot. Balaam beat her again.\n\nFinally, the angel stood in a place so narrow that there was no room to pass at all. The donkey simply lay down on the ground. Balaam was livid and struck the donkey with his staff.\n\nThen God did something astonishing — He opened the donkey\'s mouth and she spoke! "What have I done to you to make you beat me three times?" the donkey said.\n\nBalaam was so angry he answered the donkey without even pausing to realize how strange this was. "You\'ve made a fool of me! If I had a sword, I\'d kill you right now!"\n\nThe donkey replied, "Am I not your own donkey, which you have always ridden? Have I been in the habit of doing this to you?"\n\n"No," Balaam admitted.\n\nThen God opened Balaam\'s eyes, and he saw the angel of the Lord standing in the road with a drawn sword. Balaam fell facedown in terror. The angel said, "Why have you beaten your donkey three times? I have come to oppose you because your path is reckless. The donkey saw me and turned away three times. If she had not, I would certainly have killed you by now, but I would have spared her."' },
            { title: 'Blessings Instead of Curses', text: 'Balaam continued to Moab, but now he understood — he could only speak the words God put in his mouth. King Balak took him to a high place where he could see the Israelite camp spread across the plain below.\n\nBalak built altars and offered sacrifices, hoping Balaam would curse Israel. But every time Balaam opened his mouth, blessings poured out instead of curses!\n\n"How can I curse those whom God has not cursed?" Balaam declared. "How can I denounce those whom the Lord has not denounced? From the top of the rocks I see them — a people blessed by God!"\n\nBalak was furious. "I brought you to curse my enemies, and you\'ve blessed them instead!" He took Balaam to another location, hoping for different results. But again, Balaam blessed Israel. And a third time. And even a fourth!\n\n"God is not human, that He should lie," Balaam proclaimed. "He has blessed, and I cannot change it."\n\nBalak sent Balaam away in disgust, having paid a fortune for blessings on his enemies. God had turned every intended curse into a blessing — and even used a donkey to deliver His message. No one, no matter how powerful or wealthy, can go against God\'s plans.' }
        ],
        moral: 'God protects His people, and no one can curse what God has blessed. Sometimes God uses the most unexpected things — even a donkey — to get our attention and keep us on the right path.',
        keyVerse: { text: 'God is not human, that he should lie, nor a human being, that he should change his mind.', ref: 'Numbers 23:19' }
    },
    {
        id: 'battle-of-jericho',
        title: 'The Battle of Jericho',
        icon: '🎺',
        testament: 'old-testament',
        reference: 'Joshua 5:13-6:27',
        snippet: 'The walls of a mighty city come tumbling down when God\'s people follow His unusual battle plan.',
        sections: [
            { title: 'The Promised Land at Last', text: 'After forty years of wandering in the wilderness, the Israelites were finally ready to enter the Promised Land — the land God had promised to Abraham, Isaac, and Jacob generations ago. Moses had died on a mountaintop, looking out over the land he would never enter. Now Joshua, Moses\' faithful assistant, was the new leader.\n\nGod spoke to Joshua: "Be strong and courageous. Do not be afraid. I will be with you wherever you go." With those words ringing in his ears, Joshua led the people across the Jordan River — which God miraculously dried up, just as He had parted the Red Sea — and into the land of Canaan.\n\nBut standing directly in their path was Jericho — one of the oldest and most heavily fortified cities in the world. Its walls were massive — some historians believe the outer walls were six feet thick and the inner walls were twelve feet thick, with houses built on top. The gates were barred shut. Nobody went in, and nobody came out. The people of Jericho had heard about the Israelites and their God, and they were terrified.' },
            { title: 'God\'s Unusual Battle Plan', text: 'Joshua was probably studying the walls, trying to figure out how to attack, when he looked up and saw a man standing before him with a drawn sword. "Are you for us or for our enemies?" Joshua asked.\n\n"Neither," the man replied. "I have come as commander of the army of the Lord." Joshua fell facedown in reverence — this was no ordinary soldier. This was the Lord Himself.\n\nGod gave Joshua the most unusual battle plan in military history. No battering rams. No siege ladders. No tunneling under the walls. Instead: "Have the armed men march around the city once a day for six days. Seven priests shall carry trumpets of rams\' horns in front of the ark. On the seventh day, march around the city seven times, with the priests blowing the trumpets. When you hear a long blast on the trumpets, have the whole army give a loud shout, and the wall of the city will collapse."\n\nTo any military commander, this plan would sound insane. March in circles and blow horns? That\'s how you defeat the most fortified city in the region? But Joshua had learned to trust God completely.' },
            { title: 'The March', text: 'The next morning, the Israelites began. The armed guard went first, then seven priests carrying ram\'s horn trumpets, then the Ark of the Covenant — the sacred box that represented God\'s presence — and finally the rest of the army. They marched around the entire city once, with the trumpets blowing, and then returned to camp. That was it. No attack. No shout. Joshua had told the people, "Do not give a war cry, do not raise your voices, do not say a word until the day I tell you to shout."\n\nImagine being a soldier on the walls of Jericho, watching this bizarre scene. Thousands of people, marching silently around your city, blowing horns, and then going back to camp. What were they doing? Were they crazy?\n\nDay two — the same thing. March around once. Go back to camp. Day three — the same. Day four. Day five. Day six. Every day, the silent procession circled the city while the people of Jericho watched, confused and increasingly afraid. The tension was unbearable. What was going to happen?\n\nFor six days, the Israelites obeyed God\'s instructions exactly, even though they probably didn\'t understand the plan. That\'s what faith looks like — trusting God even when His instructions don\'t make obvious sense.' },
            { title: 'The Walls Come Down', text: 'On the seventh day, the Israelites rose at dawn. This time, they didn\'t march around once — they marched around seven times. One lap. Two. Three. Four. Five. Six. On the seventh lap, the priests blew a long blast on the trumpets.\n\nJoshua commanded, "Shout! For the Lord has given you the city!"\n\nAnd the people shouted. Every man, woman, and child in the Israelite camp raised their voice in the mightiest shout the world had ever heard — a roar of faith and praise that echoed off the mountains.\n\nAnd the walls of Jericho collapsed. Those massive, ancient, seemingly indestructible walls — walls that had stood for centuries — crumbled and fell flat to the ground. Not from battering rams. Not from explosives. Not from any human weapon. They fell because God brought them down.\n\nThe Israelites charged straight into the city and captured it completely. Only Rahab — a woman who had earlier helped Israelite spies and put her faith in God — was saved along with her family, because the spies had promised to protect her.\n\nThe battle of Jericho wasn\'t won by military strength or clever tactics. It was won by obedience and faith. God didn\'t need a great army with powerful weapons. He needed people who would trust Him enough to follow His plan — even when that plan was to walk in circles and shout.' }
        ],
        moral: 'When we trust God and obey His instructions — even when they don\'t seem to make sense — He will do amazing things. Victory comes from faith and obedience, not from our own strength.',
        keyVerse: { text: 'By faith the walls of Jericho fell, after the army had marched around them for seven days.', ref: 'Hebrews 11:30' }
    },
    {
        id: 'gideon',
        title: 'Gideon\'s Army',
        icon: '🏺',
        testament: 'old-testament',
        reference: 'Judges 6-7',
        snippet: 'God uses the smallest army imaginable to win an impossible battle.',
        sections: [
            { title: 'Israel in Trouble Again', text: 'After Joshua\'s great victories, the Israelites settled in the Promised Land. But they kept forgetting about God and worshipping idols. Every time they turned away from God, He allowed their enemies to oppress them. Every time they cried out for help, God sent a judge — a leader — to rescue them.\n\nDuring one of these dark periods, the Midianites invaded. For seven years, they swept across the land like a plague of locusts, destroying crops, stealing livestock, and leaving the Israelites starving. The Israelites were so terrified that they hid in caves and mountain shelters. The once-proud nation was reduced to cowering in holes in the ground.\n\nFinally, the people cried out to God for help. And God chose an unlikely hero — a young man named Gideon, who was secretly threshing wheat in a winepress, hiding from the Midianites.\n\nAn angel appeared and said, "The Lord is with you, mighty warrior!"\n\nGideon looked around incredulously. "Mighty warrior? Me?  If the Lord is with us, why has all this happened? Where are all His miracles?" Gideon didn\'t feel mighty at all. He felt weak, scared, and forgotten. He came from the weakest clan, and he was the least important person in his family.\n\nBut God said, "Go in the strength you have and save Israel. Am I not sending you?"' },
            { title: 'Testing God with Fleece', text: 'Gideon was still unsure. He asked God for signs to confirm that He was really calling him. First, Gideon put a wool fleece on the threshing floor and asked God to make the fleece wet with dew while the ground around it stayed dry. The next morning, Gideon wrung out enough water from the fleece to fill a bowl — while the ground was completely dry.\n\nStill nervous, Gideon asked for one more sign — the opposite: dry fleece, wet ground. God patiently granted this too. The next morning, the fleece was bone dry while the ground was soaked with dew.\n\nGod was incredibly patient with Gideon\'s doubts. He didn\'t scold him or choose someone else. He met Gideon right where he was — fearful and unsure — and gently built his faith step by step.\n\nFinally convinced, Gideon sent out a call for soldiers. Thirty-two thousand men responded — a good-sized army to face the Midianites, whose forces filled the valley below "thick as locusts," with camels "as numerous as sand on the seashore."' },
            { title: 'Too Many Soldiers', text: 'But God said something shocking: "You have too many men. I cannot deliver Midian into their hands, or Israel would boast that their own strength has saved them."\n\nToo many? They were already massively outnumbered! But God wanted the victory to be so clearly miraculous that no one could take credit for it.\n\nGod told Gideon, "Anyone who is afraid may go home." Twenty-two thousand men left. Gideon was left with only ten thousand.\n\n"Still too many," God said. He told Gideon to take the men down to the water to drink. Those who knelt down to drink were sent home. Those who cupped the water in their hands and lapped it — staying alert and watchful — were kept. Only three hundred men remained.\n\nThree hundred men against tens of thousands. It was absurd by any human calculation. But God doesn\'t need large numbers to win battles. He needs faithful hearts.' },
            { title: 'Trumpets, Torches, and Jars', text: 'That night, God sent Gideon to spy on the Midianite camp. Gideon overheard a soldier telling his friend about a dream: "A round loaf of barley bread came tumbling into the Midianite camp, struck a tent, and it collapsed!" His friend replied, "This can be nothing other than the sword of Gideon! God has given the Midianites into his hands!"\n\nEncouraged, Gideon returned and divided his three hundred men into three groups. He gave each man a trumpet, an empty clay jar, and a torch hidden inside the jar. No swords. No shields. Just trumpets, jars, and torches.\n\nIn the middle of the night, the three groups surrounded the enemy camp. At Gideon\'s signal, every man blew his trumpet, smashed his jar, held up his blazing torch, and shouted, "A sword for the Lord and for Gideon!"\n\nThe noise was deafening — three hundred trumpets blasting, three hundred jars shattering, three hundred men shouting. The Midianites woke from deep sleep to find themselves surrounded by lights and noise on every side. In the confusion and panic, they turned on each other with their swords, fighting in the darkness, unable to tell friend from foe.\n\nThe entire Midianite army fled in terror. God had won the battle with three hundred men, some trumpets, and some clay pots. No great army. No advanced weapons. Just obedience and trust in a God who specializes in the impossible.' }
        ],
        moral: 'God doesn\'t need big numbers or great strength to accomplish His purposes. He uses ordinary, even fearful, people who trust Him. When God is on your side, you are never outnumbered.',
        keyVerse: { text: 'The Lord said to Gideon, "With the three hundred men I will save you and give the Midianites into your hands."', ref: 'Judges 7:7' }
    },
    {
        id: 'samson',
        title: 'Samson the Strong',
        icon: '💪',
        testament: 'old-testament',
        reference: 'Judges 13-16',
        snippet: 'The strongest man who ever lived learns that true strength comes from God.',
        sections: [
            { title: 'A Special Child', text: 'Once again, the Israelites had turned away from God, and He allowed the Philistines to rule over them for forty years. But God had a plan. An angel appeared to a woman from the tribe of Dan and told her she would have a special son. "No razor may be used on his head," the angel said, "because the boy is to be a Nazirite, dedicated to God from the womb. He will take the lead in delivering Israel from the Philistines."\n\nThe boy was named Samson, and as he grew, the Spirit of the Lord began to stir in him. When God\'s Spirit came upon Samson, he was given supernatural strength — strength beyond anything the world had ever seen.' },
            { title: 'Feats of Incredible Strength', text: 'Samson\'s strength was legendary. Once, a young lion attacked him, and Samson tore it apart with his bare hands as if it were a young goat. On another occasion, he caught three hundred foxes, tied torches to their tails, and released them into the Philistine grain fields, burning their crops.\n\nWhen the Philistines came after him, Samson picked up the jawbone of a donkey and struck down a thousand soldiers single-handedly. Another time, he was trapped inside a Philistine city. They locked the gates, planning to kill him in the morning. But Samson got up in the middle of the night, ripped the city gates right out of the ground — posts, bars, and all — hoisted them onto his shoulders, and carried them to the top of a hill.\n\nBut Samson had a weakness. Despite his physical strength, he was weak when it came to making wise choices. He was proud, impulsive, and often followed his own desires rather than God\'s plan. His strength came from God, but Samson often acted as if it came from himself.' },
            { title: 'Samson and Delilah', text: 'Samson fell in love with a Philistine woman named Delilah. The Philistine rulers saw their opportunity. They each offered Delilah a fortune in silver if she could discover the secret of Samson\'s incredible strength.\n\nDelilah pleaded with Samson night after night. "If you really loved me, you\'d tell me your secret," she said. Three times Samson gave her false answers, and three times the Philistines tried to capture him based on those lies, and three times he broke free easily.\n\nBut Delilah kept pressing. She nagged and pleaded day after day until Samson was "sick to death" of it. Finally, he told her the truth: "No razor has ever been used on my head because I have been a Nazirite dedicated to God since before I was born. If my head were shaved, my strength would leave me."\n\nDelilah lulled Samson to sleep on her lap, and a man shaved off the seven braids of his hair. Then she cried, "Samson, the Philistines are upon you!" Samson woke up and thought, "I\'ll break free as I did before." But this time was different. The Bible gives one of the saddest sentences in scripture: "He did not know that the Lord had left him."\n\nThe Philistines seized him, gouged out his eyes, bound him in bronze chains, and put him to work grinding grain in prison — the mightiest man in the world, now blind and enslaved.' },
            { title: 'Samson\'s Final Act', text: 'But in prison, something important happened. Samson\'s hair began to grow back. And more importantly, Samson\'s heart began to turn back to God. The pride that had driven him his whole life was finally broken.\n\nThe Philistines held a great celebration in their temple to honor their god Dagon for delivering Samson into their hands. Three thousand people packed the temple and the roof. They brought Samson out to mock and entertain them — the once-mighty champion, now blind and stumbling.\n\nSamson asked the servant leading him to place him between the two main pillars that supported the temple. Then, for the first time in his life, Samson prayed a truly humble prayer: "Sovereign Lord, remember me. Please, God, strengthen me just once more."\n\nSamson pushed with all his might against the two pillars. He pushed, and the pillars cracked, and the entire temple came crashing down — killing Samson and all the Philistines inside. In his death, Samson defeated more enemies than he had in his entire life.\n\nSamson\'s story is both inspiring and cautionary. God gave him incredible gifts, but Samson wasted much of his life following his own desires. Yet even at the end, when Samson finally turned back to God with a humble heart, God heard his prayer and used him one last time.' }
        ],
        moral: 'True strength comes from God, not from ourselves. When we waste our God-given gifts through pride, we suffer. But it\'s never too late to turn back to God — He always listens to a humble heart.',
        keyVerse: { text: 'Sovereign Lord, remember me. Please, God, strengthen me just once more.', ref: 'Judges 16:28' }
    },
    {
        id: 'ruth-naomi',
        title: 'Ruth and Naomi',
        icon: '🌾',
        testament: 'old-testament',
        reference: 'Ruth 1-4',
        snippet: 'A young woman\'s loyalty and love brings hope to her grieving mother-in-law.',
        sections: [
            { title: 'Loss and Heartbreak', text: 'During a time of famine in Israel, a man named Elimelech took his wife Naomi and their two sons to live in the land of Moab, where food was more plentiful. There, the two sons married Moabite women — Orpah and Ruth.\n\nBut then tragedy struck, one blow after another. First, Elimelech died. Then, after about ten years, both sons died as well. Naomi was left alone in a foreign land with no husband, no sons, and no way to support herself. In the ancient world, a widow without sons was in a desperate situation — no income, no protection, no future.\n\nNaomi heard that the famine in Israel had ended, so she decided to return home to Bethlehem. She urged her daughters-in-law to go back to their own families in Moab, where they might find new husbands and rebuild their lives. "May the Lord show you kindness, as you have shown kindness to your dead husbands and to me," she said through her tears.\n\nOrpah kissed Naomi goodbye and went back. But Ruth refused to leave.' },
            { title: 'Ruth\'s Beautiful Promise', text: 'Ruth clung to Naomi and said words that have echoed through the centuries as one of the most beautiful declarations of loyalty ever spoken:\n\n"Don\'t urge me to leave you or to turn back from you. Where you go I will go, and where you stay I will stay. Your people will be my people and your God my God. Where you die I will die, and there I will be buried. May the Lord deal with me, be it ever so severely, if even death separates you and me."\n\nRuth was giving up everything — her homeland, her family, her culture, her gods — to stay with an elderly, grieving woman who had nothing to offer her. She was choosing love and faithfulness over comfort and security.\n\nThe two women traveled together to Bethlehem. When they arrived, the whole town buzzed with excitement. "Can this be Naomi?" people asked. Naomi said, "Don\'t call me Naomi (which means \'pleasant\'). Call me Mara (which means \'bitter\'), because the Almighty has made my life very bitter. I went away full, but the Lord has brought me back empty."\n\nBut Naomi wasn\'t truly empty. She had Ruth — and God was about to show them both that He had a beautiful plan.' },
            { title: 'Gleaning in the Fields', text: 'It was barley harvest season. Ruth went out to glean — to gather the leftover grain that harvesters dropped — in order to find food for herself and Naomi. God\'s law said that farmers should leave some grain in the fields for the poor and foreigners to collect.\n\nAs it "happened" — though nothing truly happens by accident when God is at work — Ruth ended up gleaning in a field belonging to a wealthy, kind man named Boaz. He was a relative of Naomi\'s deceased husband.\n\nBoaz noticed Ruth working diligently among the gleaners. He asked his workers about her, and they told him she was the Moabite woman who had come back with Naomi. Boaz was impressed by Ruth\'s loyalty and faith.\n\nHe approached Ruth and said, "Stay in my field. Don\'t go to any other field. I\'ve told my men not to touch you. When you are thirsty, drink from the water jars my men have filled." Ruth fell at his feet in surprise. "Why have I found such favor in your eyes? I\'m a foreigner!"\n\nBoaz replied, "I\'ve been told all about what you have done for your mother-in-law — how you left your father and mother and homeland to come to a people you did not know. May the Lord repay you fully for what you have done. May you be richly rewarded by the Lord, the God of Israel, under whose wings you have come to take refuge."\n\nBoaz even told his workers to purposely leave extra grain for Ruth to find. She went home that evening carrying far more grain than any gleaner would normally collect.' },
            { title: 'A Beautiful Ending', text: 'Naomi recognized God\'s hand at work. She knew that Boaz was a close relative — a "kinsman-redeemer" who had the right, under Israelite law, to marry Ruth and carry on the family name. Naomi guided Ruth through the customs of the day, and Ruth humbly approached Boaz at the threshing floor, asking him to fulfill his role as kinsman-redeemer.\n\nBoaz was honored and delighted. He said, "All the people of my town know that you are a woman of noble character." He went through the proper legal process, and Ruth and Boaz were married.\n\nGod blessed them with a son named Obed. And here is the most amazing part of the story: Obed became the father of Jesse, who became the father of King David — and from David\'s line, many generations later, Jesus Christ was born.\n\nNaomi, who had called herself "bitter" and "empty," held her grandson in her arms while the women of Bethlehem rejoiced around her. "Praise be to the Lord," they said. "Your daughter-in-law, who loves you and is better to you than seven sons, has given him birth."\n\nRuth — a foreign woman, a poor widow, a gleaner of leftover grain — became part of the royal line that led to Jesus. God took her small acts of faithfulness and wove them into the greatest story ever told.' }
        ],
        moral: 'Loyalty, kindness, and faithfulness are never wasted. God sees our acts of love and can use them in ways we never imagined. No one is too ordinary or too foreign for God\'s great plan.',
        keyVerse: { text: 'Where you go I will go, and where you stay I will stay. Your people will be my people and your God my God.', ref: 'Ruth 1:16' }
    },
    {
        id: 'samuel-called',
        title: 'God Calls Samuel',
        icon: '👂',
        testament: 'old-testament',
        reference: '1 Samuel 1-3',
        snippet: 'A young boy hears God\'s voice calling him in the middle of the night.',
        sections: [
            { title: 'Hannah\'s Prayer', text: 'Before Samuel was born, his mother Hannah was heartbroken because she had no children. Year after year, she prayed and wept at the tabernacle — the tent where people worshipped God — begging the Lord for a child.\n\nOne day, Hannah prayed so intensely, with her lips moving but no sound coming out, that the old priest Eli thought she was drunk. "Stop drinking!" he scolded her.\n\n"I\'m not drunk, sir," Hannah replied through her tears. "I am a woman who is deeply troubled. I have been pouring out my soul to the Lord."\n\nEli saw her sincerity and said, "Go in peace, and may the God of Israel grant you what you have asked of Him."\n\nGod answered Hannah\'s prayer, and she gave birth to a son. She named him Samuel, which sounds like the Hebrew for "heard by God." True to a solemn vow she had made, when Samuel was old enough — probably around three years old — Hannah brought him to the tabernacle to serve God under Eli\'s care.\n\nImagine how hard that was for Hannah. She had wanted this child more than anything in the world, and now she was giving him back to God. But she trusted the Lord. Each year, she made Samuel a new little robe and brought it to him when she came to worship. And God blessed Hannah with five more children.' },
            { title: 'The Boy in the Temple', text: 'Young Samuel grew up in the tabernacle, helping the elderly priest Eli. He learned to light the lamps, open the doors each morning, and assist with the sacred duties. He wore a small linen robe, just like a priest, and everyone who saw him could tell there was something special about this boy.\n\nBut these were dark times in Israel. Eli\'s own two sons, Hophni and Phinehas, were also priests — but they were wicked men who stole from the offerings and treated God\'s house with contempt. Eli knew about their behavior but was too weak to stop them.\n\nThe Bible says something sad about this period: "In those days the word of the Lord was rare; there were not many visions." God had been largely silent. The people had drifted far from Him, and even the priests didn\'t truly know the Lord.\n\nBut God was about to break the silence — and He chose to speak to a boy.' },
            { title: 'A Voice in the Night', text: 'One night, Samuel was lying down in the tabernacle near the Ark of God. The lamp of God had not yet gone out — it was that quiet, sacred time in the deep of night.\n\nSuddenly, a voice called: "Samuel!"\n\nSamuel jumped up and ran to Eli. "Here I am! You called me."\n\n"I didn\'t call you," Eli said, puzzled. "Go back and lie down."\n\nSamuel went back and lay down. Again the voice came: "Samuel!"\n\nSamuel ran to Eli again. "Here I am. You called me."\n\n"I didn\'t call, my son," Eli said. "Go back and lie down."\n\nThe Bible explains: "Samuel did not yet know the Lord; the word of the Lord had not yet been revealed to him." Samuel had grown up in the tabernacle, had served God his whole young life, but had never heard God speak directly to him before.\n\nA third time, the voice called: "Samuel!"\n\nOnce more, Samuel went to Eli. And this time, old Eli finally understood what was happening. His eyes widened. "Go and lie down," he told Samuel, "and if He calls you, say, \'Speak, Lord, for your servant is listening.\'"\n\nSamuel went back and lay down, his heart surely pounding. Then the Lord came and stood there, calling as before: "Samuel! Samuel!"\n\nAnd young Samuel answered: "Speak, for your servant is listening."' },
            { title: 'A Prophet for Israel', text: 'God gave Samuel a difficult message that night — a message of judgment against Eli\'s family because of the wickedness of his sons and Eli\'s failure to restrain them. It was a heavy burden for a young boy to carry.\n\nThe next morning, Samuel was afraid to tell Eli what God had said. But Eli insisted: "What did He say to you? Do not hide it from me." So Samuel told him everything, holding nothing back. Eli bowed his head and said, "He is the Lord; let Him do what is good in His eyes."\n\nFrom that night on, God continued to speak to Samuel, and Samuel grew up to become one of the greatest prophets in Israel\'s history. "The Lord was with Samuel as he grew up, and He let none of Samuel\'s words fall to the ground." Everyone from Dan in the north to Beersheba in the south recognized that Samuel was a true prophet of the Lord.\n\nSamuel served Israel faithfully for his entire life. He anointed both King Saul and King David. He judged the nation, called the people back to God, and spoke the Lord\'s words with courage and integrity. It all started with a boy lying in the dark, hearing a voice, and having the courage to say, "Speak, Lord, for your servant is listening."' }
        ],
        moral: 'God speaks to people of all ages — even children. What matters is having a heart that is willing to listen and obey. When God calls, the best response is, "Speak, Lord, for your servant is listening."',
        keyVerse: { text: 'Speak, Lord, for your servant is listening.', ref: '1 Samuel 3:10' }
    },
    {
        id: 'david-jonathan',
        title: 'David and Jonathan',
        icon: '🤝',
        testament: 'old-testament',
        reference: '1 Samuel 18-20',
        snippet: 'The prince and the shepherd boy forge the greatest friendship in the Bible.',
        sections: [
            { title: 'An Unlikely Friendship', text: 'After young David defeated the giant Goliath, he was brought before King Saul. Standing nearby was Jonathan, Saul\'s eldest son — the prince of Israel. By all rights, Jonathan should have seen David as a rival. David was becoming wildly popular, and the people were singing, "Saul has slain his thousands, and David his tens of thousands." Jonathan was the heir to the throne, and David was the one who might take it from him.\n\nBut instead of jealousy, something extraordinary happened. The Bible says, "Jonathan became one in spirit with David, and he loved him as himself." Jonathan saw David\'s courage, his faith in God, and his humble heart, and he recognized a kindred spirit.\n\nJonathan took off his own royal robe — the prince\'s robe — and gave it to David. He also gave David his tunic, his sword, his bow, and his belt. These weren\'t just gifts. In that culture, giving someone your robe, weapons, and belt was a symbolic act — it meant, "I am giving you my position, my authority, my future." Jonathan, the prince, was acknowledging that God had chosen David to be the next king, and he was okay with it.\n\nThis is one of the most selfless acts in all of scripture. Jonathan chose friendship and God\'s will over his own ambition.' },
            { title: 'Saul\'s Jealousy', text: 'While Jonathan loved David, King Saul grew to hate him. Saul was jealous of David\'s popularity, afraid of David\'s growing influence, and tormented by the knowledge that God had rejected him as king and chosen David instead.\n\nSaul\'s jealousy turned murderous. Twice he hurled a spear at David while David was playing the harp to soothe Saul\'s troubled mind. David dodged both times. Saul then tried to arrange David\'s death by sending him on dangerous military missions, hoping the Philistines would kill him. But God protected David, and he only became more successful and more beloved by the people.\n\nJonathan was caught in the middle between his father and his best friend. He loved them both. He tried desperately to make peace, pleading with Saul: "Father, don\'t wrong David. He hasn\'t wronged you. What he\'s done has benefited you greatly. He risked his life when he killed Goliath, and the Lord won a great victory for all Israel. You saw it and were glad. Why would you sin against an innocent man by killing him?"\n\nFor a time, Saul listened and swore not to harm David. But the jealousy always returned, darker and more dangerous each time.' },
            { title: 'The Arrow Signal', text: 'David came to Jonathan in fear, saying, "What have I done? What is my crime? Why is your father trying to kill me?"\n\nJonathan found it hard to believe his father would actually go through with it. So they devised a plan. David would hide in a field during a feast day. Jonathan would sit at the table with Saul and feel out his intentions. Then Jonathan would come to the field and shoot arrows.\n\n"If I tell the boy who fetches the arrows, \'The arrows are on this side of you,\' then come out, because it is safe," Jonathan explained. "But if I say, \'The arrows are beyond you,\' then you must go, because the Lord has sent you away."\n\nAt the feast, when Saul noticed David\'s empty seat, he demanded to know where David was. Jonathan made an excuse. Saul exploded in fury, hurling insults at Jonathan and even throwing a spear at his own son! In that terrible moment, Jonathan knew — his father was determined to kill David.\n\nThe next morning, Jonathan went to the field with a young boy. He shot an arrow and called out, "Isn\'t the arrow beyond you? Hurry! Go quickly! Don\'t stop!" The boy collected the arrows and was sent away, not knowing what the signal meant.' },
            { title: 'A Tearful Goodbye', text: 'After the boy left, David came out from his hiding place. The two friends faced each other, knowing this was likely goodbye. David bowed three times to the ground before Jonathan.\n\nThen they embraced and wept together. David wept the most. These two young men — one a prince, one a fugitive — held each other and cried because the jealousy and hatred of one man was tearing them apart.\n\nJonathan said, "Go in peace, for we have sworn friendship with each other in the name of the Lord, saying, \'The Lord is witness between you and me, and between your descendants and my descendants forever.\'" It was a covenant of eternal friendship, sealed before God.\n\nDavid went into hiding, spending years as a fugitive in caves and deserts while Saul hunted him. The two friends only saw each other one more time, when Jonathan found David in the wilderness and "helped him find strength in God." Jonathan told David, "Don\'t be afraid. My father Saul will not lay a hand on you. You will be king over Israel, and I will be second to you."\n\nTragically, Jonathan died in battle alongside his father on Mount Gilboa. When David heard the news, he was devastated. He wrote a lament that included the famous words: "How the mighty have fallen! I grieve for you, Jonathan my brother. You were very dear to me. Your love for me was wonderful, more wonderful than that of women."\n\nDavid never forgot his promise to Jonathan. When he became king, he searched for any surviving members of Jonathan\'s family and found Jonathan\'s son Mephibosheth, who was crippled. David brought him to the palace, gave him all of Saul\'s land, and said, "You will always eat at my table." A promise kept. A friendship honored. Forever.' }
        ],
        moral: 'True friendship means putting others before yourself, standing by your friends in hard times, and keeping your promises — even when it costs you dearly. The best friendships are built on shared faith and selfless love.',
        keyVerse: { text: 'Jonathan became one in spirit with David, and he loved him as himself.', ref: '1 Samuel 18:1' }
    },
    {
        id: 'solomon-wisdom',
        title: 'Solomon\'s Wisdom',
        icon: '👑',
        testament: 'old-testament',
        reference: '1 Kings 3',
        snippet: 'A young king asks God for wisdom and receives the greatest gift of all.',
        sections: [
            { title: 'A Young King', text: 'After King David died, his son Solomon became king of Israel. Solomon was young — perhaps only around twenty years old — and the weight of an entire kingdom was suddenly on his shoulders. Israel was a powerful nation, with complex politics, powerful neighbors, and millions of people looking to their king for leadership.\n\nSolomon loved the Lord and followed the ways of his father David. One night, God appeared to Solomon in a dream at Gibeon, where the great altar stood. And God made an extraordinary offer — the kind of offer that comes once in the history of the world:\n\n"Ask for whatever you want Me to give you."\n\nAnything. Imagine being offered anything by the Creator of the universe. What would you ask for? Wealth? Power? Fame? A long life? Victory over all your enemies? The possibilities were limitless.\n\nSolomon\'s answer reveals why God chose him.' },
            { title: 'The Wisest Request', text: 'Solomon said, "Lord my God, You have made Your servant king in place of my father David. But I am only a little child and do not know how to carry out my duties. Your servant is here among the people You have chosen, a great people, too numerous to count. So give Your servant a discerning heart to govern Your people and to distinguish between right and wrong. For who is able to govern this great people of Yours?"\n\nSolomon didn\'t ask for money, power, or revenge. He asked for wisdom — the ability to lead God\'s people well, to know right from wrong, and to make just decisions. He called himself "a little child" — not because he was physically small, but because he recognized how much he didn\'t know.\n\nGod was deeply pleased with Solomon\'s request. "Since you have asked for this and not for long life or wealth for yourself, nor have you asked for the death of your enemies, but for discernment in administering justice — I will do what you have asked. I will give you a wise and discerning heart, so that there will never have been anyone like you, nor will there ever be."\n\nAnd then God added a bonus: "Moreover, I will give you what you have not asked for — both wealth and honor — so that in your lifetime you will have no equal among kings."' },
            { title: 'The Two Mothers', text: 'Solomon\'s wisdom was soon put to the test. Two women came before the king with a terrible dispute. They lived in the same house, and both had recently given birth to baby boys. During the night, one woman\'s baby had died. She secretly switched her dead baby with the other woman\'s living child.\n\nNow both women stood before Solomon, each claiming the living baby was hers. There were no witnesses, no evidence, and no way to run a DNA test. One woman was telling the truth and the other was lying — but which was which?\n\nThe whole court fell silent, waiting to see what the young king would do. This was impossible.\n\nSolomon said, "Bring me a sword." A sword was brought. "Cut the living child in two and give half to one and half to the other."\n\nThe court gasped. The real mother\'s heart was torn apart with love for her child. She cried out, "Please, my lord, give her the living baby! Don\'t kill him!" She would rather give up her son than see him harmed.\n\nBut the other woman said coldly, "Neither of us shall have him. Cut him in two."\n\nSolomon pointed to the first woman. "Give the living baby to her. She is his mother." He knew that a true mother\'s love would sacrifice anything — even her own rights — to save her child.\n\nWord of this judgment spread throughout Israel. The people were amazed and held Solomon in deep respect, "because they saw that he had wisdom from God to administer justice." Solomon went on to build the magnificent temple in Jerusalem, write thousands of proverbs and songs, and lead Israel through its golden age of peace and prosperity.' }
        ],
        moral: 'Wisdom is more valuable than wealth, power, or fame. When we humbly ask God for wisdom to help others and do what is right, He is delighted to give it — and often adds blessings we didn\'t even ask for.',
        keyVerse: { text: 'Give your servant a discerning heart to govern your people and to distinguish between right and wrong.', ref: '1 Kings 3:9' }
    },
    {
        id: 'elijah-baal',
        title: 'Elijah and the Prophets of Baal',
        icon: '🔥',
        testament: 'old-testament',
        reference: '1 Kings 18',
        snippet: 'One prophet stands alone against 450 false prophets in a dramatic contest on a mountaintop.',
        sections: [
            { title: 'Israel Worships a False God', text: 'King Ahab was one of the worst kings in Israel\'s history, and much of his wickedness came from his wife, Queen Jezebel, a foreign princess who worshipped a false god called Baal. Jezebel brought hundreds of Baal prophets into Israel and killed many of God\'s true prophets. Under their influence, most of the people of Israel turned away from God and began worshipping Baal — the supposed god of storms and rain.\n\nGod sent the prophet Elijah to King Ahab with a bold message: "As the Lord, the God of Israel, lives — the God I serve — there will be no rain or dew in the next few years except at my word." And just like that, the rain stopped. For three and a half years, not a single drop of rain fell on Israel. The land dried up, crops failed, rivers shrank, and the people suffered terribly.\n\nThe irony was brutal — the people had turned to Baal, the so-called rain god, and now there was no rain. Baal was powerless. But the people still didn\'t turn back to the true God.' },
            { title: 'The Challenge on Mount Carmel', text: 'After three years of drought, God sent Elijah to confront Ahab. "You\'re the one causing trouble in Israel!" Ahab accused when he saw Elijah.\n\n"I haven\'t caused trouble," Elijah replied. "You and your family have, by abandoning the Lord and following Baal." Then Elijah issued a challenge: gather all the people on Mount Carmel, along with the 450 prophets of Baal and the 400 prophets of Asherah.\n\nThe stage was set for one of the most dramatic showdowns in history. Thousands of people gathered on the mountainside. On one side, 450 prophets of Baal. On the other, one man — Elijah, alone.\n\nElijah stepped forward and addressed the crowd: "How long will you waver between two opinions? If the Lord is God, follow Him; but if Baal is God, follow him." The people said nothing.\n\nElijah proposed a test. "Get two bulls. Let the prophets of Baal take one, cut it up, and put it on wood — but don\'t light the fire. I\'ll prepare the other bull the same way. Then you call on your god, and I\'ll call on the Lord. The god who answers by fire — He is God."\n\n"This is a good idea!" the people agreed.' },
            { title: 'Baal\'s Silence', text: 'The prophets of Baal went first. They prepared their bull and placed it on the altar. From morning until noon, they called out, "Baal, answer us!" They danced around the altar, shouted, and chanted. But nothing happened. No response. No fire. No voice. Nothing.\n\nAt noon, Elijah began to mock them. "Shout louder! Surely he is a god! Perhaps he is deep in thought, or busy, or traveling. Maybe he is sleeping and must be awakened!"\n\nThe prophets of Baal became more frantic. They shouted louder, slashed themselves with swords and spears until blood flowed, and worked themselves into a prophetic frenzy. They continued their desperate performance all afternoon — but there was no response, no one answered, no one paid attention.\n\n450 prophets. Hours of screaming. Blood. Frenzy. And absolute, total silence from Baal. Because Baal wasn\'t real. You can shout at a statue all day long, and it will never answer.' },
            { title: 'Fire from Heaven', text: 'Then Elijah called the people closer. He rebuilt the altar of the Lord using twelve stones — one for each tribe of Israel. He dug a trench around it, arranged the wood, and placed the bull on top.\n\nThen he did something unexpected. "Fill four large jars with water and pour them on the offering and the wood." They did. "Do it again." They did. "Do it a third time." They poured water until it ran down the altar, filled the trench, and soaked everything completely. Elijah was making this as hard as possible — there could be no accusations of trickery.\n\nThen Elijah stepped forward and prayed a simple, quiet prayer — no screaming, no dancing, no blood: "Lord, the God of Abraham, Isaac, and Israel, let it be known today that You are God in Israel and that I am Your servant. Answer me, Lord, answer me, so these people will know that You, Lord, are God, and that You are turning their hearts back again."\n\nImmediately — at that very instant — fire fell from heaven. But this was no ordinary fire. It burned up the sacrifice, the wood, the stones, the soil, and even licked up the water in the trench! Everything was consumed.\n\nThe people fell on their faces and cried out, "The Lord — He is God! The Lord — He is God!" \n\nThe contest was over. There was no debate, no ambiguity, no question. The living God had answered with fire, and 450 prophets of a dead idol had been proven powerless. And then, after three and a half years, Elijah prayed, and God sent the rain flooding back across the land.' }
        ],
        moral: 'There is only one true God, and He is worth following with all our hearts. False gods — whether ancient idols or modern distractions — will always fail us. But the living God answers when we call.',
        keyVerse: { text: 'The Lord — He is God! The Lord — He is God!', ref: '1 Kings 18:39' }
    },
    {
        id: 'fiery-furnace',
        title: 'The Fiery Furnace',
        icon: '🔥',
        testament: 'old-testament',
        reference: 'Daniel 3',
        snippet: 'Three young men refuse to bow to an idol and are thrown into a blazing furnace — but they are not alone.',
        sections: [
            { title: 'The Golden Statue', text: 'King Nebuchadnezzar of Babylon was the most powerful ruler in the world. He built an enormous golden statue — ninety feet tall and nine feet wide — and set it up on the plain of Dura. Then he summoned every important official in his kingdom to attend the statue\'s dedication.\n\nA herald proclaimed in a booming voice: "When you hear the sound of the horn, flute, zither, lyre, harp, pipes, and all kinds of music, you must fall down and worship the golden image. Whoever does not fall down and worship will immediately be thrown into a blazing furnace."\n\nThe music played. Every official, governor, and dignitary fell to the ground in worship — every single person except three young Jewish men: Shadrach, Meshach, and Abednego.' },
            { title: 'The Brave Refusal', text: 'These three were among the Jewish captives brought to Babylon years earlier, along with their friend Daniel. They had risen to positions of authority in the kingdom, but they had never forgotten who they truly served. The God of Israel had commanded, "You shall have no other gods before Me" and "You shall not bow down to any idol."\n\nSome jealous officials noticed and reported them to the king. Nebuchadnezzar was furious. He summoned the three men and gave them one more chance: "Is it true that you do not worship my gods? When you hear the music, if you bow down, very good. But if you do not, you will be thrown into the blazing furnace. Then what god will be able to rescue you from my hand?"\n\nTheir answer is one of the bravest statements in all of scripture: "King Nebuchadnezzar, we do not need to defend ourselves before you in this matter. If we are thrown into the blazing furnace, the God we serve is able to deliver us. But even if He does not, we want you to know, Your Majesty, that we will not serve your gods or worship the image of gold you have set up."' },
            { title: 'Into the Flames', text: 'Nebuchadnezzar was so enraged that his face twisted with fury. He ordered the furnace heated seven times hotter than usual — so hot that the soldiers who threw the three men into the furnace were killed by the heat.\n\nShadrach, Meshach, and Abednego fell into the roaring flames, bound hand and foot.\n\nThen Nebuchadnezzar leaped to his feet in amazement. "Weren\'t there three men we tied up and threw into the fire?" he asked his advisors.\n\n"Certainly, Your Majesty."\n\n"Look! I see four men walking around in the fire, unbound and unharmed, and the fourth looks like a son of the gods!"\n\nInside the furnace, the three men were walking around freely. The ropes that bound them had burned away, but their bodies, their hair, and even their clothes were completely untouched. And walking beside them was a mysterious fourth figure — an angel, or perhaps God Himself — protecting them in the heart of the inferno.' },
            { title: 'Out of the Fire', text: 'Nebuchadnezzar approached the door of the furnace and shouted, "Shadrach, Meshach, and Abednego, servants of the Most High God, come out!"\n\nThe three men walked out of the furnace. Every official crowded around them in astonishment. The fire had not harmed their bodies. Not a hair on their heads was singed. Their robes were not scorched. They didn\'t even smell like smoke.\n\nNebuchadnezzar declared, "Praise be to the God of Shadrach, Meshach, and Abednego, who has sent His angel and rescued His servants! They trusted in Him and were willing to give up their lives rather than serve or worship any god except their own God." He then promoted the three men to even higher positions.\n\nThe three men didn\'t know if God would save them — but they chose to obey Him regardless. That is the deepest kind of faith: trusting God not because of what He will do for you, but because He is worthy of your trust no matter what happens.' }
        ],
        moral: 'True courage means standing up for what is right even when it costs everything. God is always with us in our trials — and even if He doesn\'t remove the fire, He walks through it with us.',
        keyVerse: { text: 'The God we serve is able to deliver us... But even if he does not, we will not serve your gods.', ref: 'Daniel 3:17-18' }
    },
    {
        id: 'zacchaeus',
        title: 'Zacchaeus the Tax Collector',
        icon: '🌳',
        testament: 'new-testament',
        reference: 'Luke 19:1-10',
        snippet: 'A dishonest little man climbs a tree to see Jesus — and his life is changed forever.',
        sections: [
            { title: 'The Hated Tax Man', text: 'In the city of Jericho lived a man named Zacchaeus. He was a chief tax collector and was very wealthy. But nobody liked him.\n\nIn those days, tax collectors worked for the Roman Empire — the foreign power that occupied Israel. They were allowed to collect extra money on top of what Rome required and keep it for themselves. Most tax collectors became rich by cheating their own people. They were considered traitors and sinners — the most despised members of society.\n\nZacchaeus was the worst of them all. He wasn\'t just a tax collector — he was the chief tax collector. He had grown very wealthy by taking more than he should from ordinary people who were already struggling. Nobody invited him to dinner. Nobody wanted to be his friend. He had all the money he could want, but he was deeply lonely and empty inside.' },
            { title: 'Up in the Sycamore Tree', text: 'One day, Jesus was passing through Jericho, and huge crowds gathered along the road to see Him. Zacchaeus desperately wanted to see Jesus too — he had heard about this Teacher who was different from everyone else, who didn\'t turn people away.\n\nBut there was a problem: Zacchaeus was very short, and the crowd was too thick for him to see over. Nobody was going to make room for the hated tax collector.\n\nSo Zacchaeus did something undignified — something a wealthy, important man would never normally do. He ran ahead of the crowd and climbed up into a sycamore-fig tree beside the road. There he sat, perched in the branches like a child, just to catch a glimpse of Jesus.\n\nWhen Jesus reached that spot, He looked up. Of all the faces in the crowd, Jesus looked directly at the little man hiding in the tree. And He called him by name.\n\n"Zacchaeus! Come down immediately. I must stay at your house today."' },
            { title: 'A Changed Heart', text: 'Zacchaeus nearly fell out of the tree with joy. He scrambled down and welcomed Jesus gladly into his home.\n\nThe crowd was outraged. "He has gone to be the guest of a sinner!" they muttered. Of all the good, respectable people in Jericho, Jesus chose to visit the home of the town\'s most notorious cheat.\n\nBut something extraordinary happened in that house. In the presence of Jesus, Zacchaeus\'s heart was completely transformed. He stood up and announced: "Look, Lord! Here and now I give half of my possessions to the poor. And if I have cheated anybody out of anything, I will pay back four times the amount."\n\nThis was astonishing. Zacchaeus didn\'t just promise to stop cheating — he committed to generous, radical restitution. Half his fortune to the poor. Four times repayment to anyone he had wronged. This was a man whose whole life had been about taking, and now he couldn\'t give fast enough.\n\nJesus smiled and said, "Today salvation has come to this house. For the Son of Man came to seek and to save the lost."\n\nJesus didn\'t wait for Zacchaeus to clean up his life first. He met him right where he was — up in a tree, desperate and despised — and loved him into transformation.' }
        ],
        moral: 'No one is too far gone for God\'s love. Jesus came to seek and save the lost — and when we truly encounter Him, our hearts and our actions are transformed.',
        keyVerse: { text: 'For the Son of Man came to seek and to save the lost.', ref: 'Luke 19:10' }
    },
    {
        id: 'parable-sower',
        title: 'The Parable of the Sower',
        icon: '🌱',
        testament: 'new-testament',
        reference: 'Matthew 13:1-23',
        snippet: 'Jesus tells a story about seeds and soil that reveals the different ways people respond to God\'s word.',
        sections: [
            { title: 'A Farmer Goes Out to Sow', text: 'Jesus sat beside the Sea of Galilee, and such a large crowd gathered around Him that He got into a boat and sat in it while the people stood on the shore. Then He told them a story — a parable — about a farmer.\n\n"A farmer went out to sow his seed. As he was scattering the seed, some fell along the path, and the birds came and ate it up. Some fell on rocky places, where it did not have much soil. It sprang up quickly because the soil was shallow. But when the sun came up, the plants were scorched, and they withered because they had no root. Other seed fell among thorns, which grew up and choked the plants. Still other seed fell on good soil, where it produced a crop — a hundred, sixty, or thirty times what was sown."\n\nThen Jesus added, "Whoever has ears, let them hear."' },
            { title: 'The Meaning Revealed', text: 'Later, the disciples asked Jesus privately, "Why do you speak to the people in parables?"\n\nJesus explained the meaning:\n\nThe seed along the path represents someone who hears the message about God\'s kingdom but doesn\'t understand it. The evil one comes and snatches away what was sown in their heart — like birds eating seeds off a hard path.\n\nThe seed on rocky ground represents someone who hears the word and immediately receives it with joy. But since they have no root — no depth of commitment — when trouble or persecution comes because of the word, they quickly fall away.\n\nThe seed among thorns represents someone who hears the word, but the worries of this life and the attraction of wealth choke the word, making it unfruitful. They get so busy and distracted that God\'s message gets crowded out.\n\nBut the seed on good soil represents someone who hears the word, understands it, and produces a crop — yielding thirty, sixty, or even a hundred times what was sown. This person lets God\'s word take deep root in their heart, and their life bears beautiful fruit.' },
            { title: 'What Kind of Soil Are You?', text: 'The parable of the sower is really about us. Each type of soil represents a different response to God\'s word:\n\nThe hard path is a closed heart — someone who refuses to listen at all.\n\nThe rocky ground is a shallow heart — excited at first but with no staying power when things get hard.\n\nThe thorny ground is a crowded heart — where God gets pushed aside by worries, money, and busy schedules.\n\nThe good soil is an open, deep, and focused heart — someone who truly listens, understands, and lets God\'s word change their life from the inside out.\n\nThe wonderful news is that soil can change. A hard heart can be softened. A shallow heart can grow deeper. A crowded heart can be cleared. God is patient, and He keeps sowing His seeds of love and truth, hoping they will find good soil in our hearts.\n\nThe question Jesus is asking each of us is simple: What kind of soil will you be?' }
        ],
        moral: 'How we receive God\'s word matters. When we listen with an open heart, understand it, and let it take root, it produces an abundant harvest of goodness in our lives.',
        keyVerse: { text: 'But the seed falling on good soil refers to someone who hears the word and understands it, producing a crop.', ref: 'Matthew 13:23' }
    },
    {
        id: 'calming-storm',
        title: 'Jesus Calms the Storm',
        icon: '⛈️',
        testament: 'new-testament',
        reference: 'Mark 4:35-41',
        snippet: 'A terrifying storm threatens to sink the disciples\' boat, but Jesus has power over nature itself.',
        sections: [
            { title: 'Setting Sail', text: 'It had been a long day of teaching by the Sea of Galilee. Jesus had spoken to enormous crowds, telling parables and sharing the good news of God\'s kingdom. As evening came, He was exhausted.\n\n"Let us go over to the other side," Jesus told His disciples. So they left the crowd and got into a boat to cross the Sea of Galilee — a large lake surrounded by hills and notorious for sudden, violent storms.\n\nJesus, completely worn out from the day, went to the back of the boat, put His head on a cushion, and fell fast asleep. The gentle rocking of the boat and the lapping of the waves didn\'t trouble Him at all. He slept the deep, peaceful sleep of someone with perfect trust in His Father.' },
            { title: 'The Furious Storm', text: 'Without warning, a furious squall swept down on the lake. The wind screamed across the water, turning gentle waves into towering walls of water that crashed over the sides of the boat. Within minutes, the boat was being tossed around like a toy, filling with water, threatening to sink.\n\nThese weren\'t inexperienced men — several of the disciples were professional fishermen who had spent their lives on this very lake. They knew storms. They knew boats. And they knew this storm was going to kill them. They bailed water desperately, fought the sails, and wrestled with the oars, but nothing helped. The storm was too powerful.\n\nAnd through all of this — the howling wind, the crashing waves, the shouts of terrified men — Jesus slept. Peacefully. Soundly. In the middle of a storm that was about to drown them all.\n\nFinally, in absolute desperation, the disciples woke Him up. "Teacher, don\'t you care if we drown?!"' },
            { title: 'Peace, Be Still', text: 'Jesus got up, looked at the raging storm, and spoke three words: "Quiet! Be still!"\n\nInstantly — not gradually, not slowly — the wind died down completely. The waves flattened. The lake became perfectly calm, like glass. One moment, a terrifying hurricane. The next, absolute peace. The contrast was breathtaking.\n\nThen Jesus turned to His disciples and asked, "Why are you so afraid? Do you still have no faith?"\n\nThe disciples were terrified — but now they were afraid of something even bigger than the storm. They looked at each other and whispered, "Who is this? Even the wind and the waves obey Him!"\n\nThat question is the whole point of the story. Who is this man who commands the forces of nature and they obey instantly? This is no ordinary teacher, no ordinary prophet. This is someone with authority over creation itself.\n\nThe storms in our lives can feel overwhelming — problems, fears, and worries that threaten to swamp us. But the same Jesus who calmed the Sea of Galilee is with us in every storm. Sometimes He calms the storm. Sometimes He calms us. But He is never asleep to our needs — He is always in the boat with us.' }
        ],
        moral: 'Jesus has power over every storm — in nature and in our lives. Even when things seem out of control, we can trust Him because nothing is beyond His authority.',
        keyVerse: { text: 'He got up, rebuked the wind and said to the waves, "Quiet! Be still!" Then the wind died down and it was completely calm.', ref: 'Mark 4:39' }
    },
    {
        id: 'last-supper',
        title: 'The Last Supper',
        icon: '🍞',
        testament: 'new-testament',
        reference: 'Luke 22:7-38',
        snippet: 'Jesus shares a final meal with His disciples and gives them something to remember Him by forever.',
        sections: [
            { title: 'Preparing the Passover', text: 'The festival of Passover was approaching — the most important celebration in the Jewish calendar, remembering how God had freed the Israelites from slavery in Egypt. Jesus knew this Passover would be different from any other. He knew that in just a few hours, He would be betrayed, arrested, and crucified. This would be His last meal with His beloved friends.\n\nJesus sent Peter and John ahead: "Go and make preparations for us to eat the Passover." They found a large upper room in Jerusalem, furnished and ready, just as Jesus had described, and they prepared the traditional Passover meal.\n\nThat evening, Jesus arrived with His twelve disciples. They reclined around the table — thirteen men sharing bread, wine, and conversation in the warm glow of oil lamps. The mood was intimate but weighted with emotion. Jesus said to them, "I have eagerly desired to eat this Passover with you before I suffer."' },
            { title: 'A Servant King', text: 'During the meal, Jesus did something that stunned everyone. He got up from the table, wrapped a towel around His waist, poured water into a basin, and began to wash His disciples\' feet.\n\nIn that culture, washing feet was the lowest task — the job of the lowest servant in the household. Roads were dusty and people wore sandals, so feet were dirty. No self-respecting person would wash someone else\'s feet, let alone a teacher, a rabbi, the one they called Lord and Master.\n\nPeter protested: "Lord, are You going to wash my feet? No, You shall never wash my feet!"\n\nJesus replied, "Unless I wash you, you have no part with Me."\n\nPeter immediately swung to the other extreme: "Then, Lord, not just my feet but my hands and my head as well!"\n\nAfter He had finished, Jesus said, "Do you understand what I have done for you? You call me Teacher and Lord, and rightly so, for that is what I am. Now that I, your Lord and Teacher, have washed your feet, you also should wash one another\'s feet. I have set you an example that you should do as I have done for you."' },
            { title: 'The Bread and the Cup', text: 'Then Jesus took bread, gave thanks, broke it, and gave it to His disciples. "Take and eat; this is My body given for you. Do this in remembrance of Me."\n\nThen He took a cup of wine, gave thanks, and offered it to them. "Drink from it, all of you. This cup is the new covenant in My blood, which is poured out for many for the forgiveness of sins. Do this, whenever you drink it, in remembrance of Me."\n\nIn that simple, profound act, Jesus transformed the ancient Passover meal into something entirely new. The bread represented His body, which would be broken on the cross. The wine represented His blood, which would be poured out to forgive the sins of the world. Every time Christians share bread and wine together — communion, the Lord\'s Supper, the Eucharist — they remember that night and the incredible sacrifice Jesus was about to make.\n\nAt the table that night, Jesus also revealed that one of the twelve would betray Him. The disciples were devastated. "Surely not I, Lord?" they asked one by one. It was Judas Iscariot, who slipped away into the darkness to betray Jesus for thirty pieces of silver.\n\nBefore they left that upper room, Jesus gave His disciples a new commandment: "Love one another. As I have loved you, so you must love one another. By this everyone will know that you are My disciples — if you love one another."' }
        ],
        moral: 'True greatness is found in serving others, not in being served. Jesus showed us that love means sacrifice — giving yourself for the people you love.',
        keyVerse: { text: 'A new command I give you: Love one another. As I have loved you, so you must love one another.', ref: 'John 13:34' }
    },
    {
        id: 'pentecost',
        title: 'The Day of Pentecost',
        icon: '🕊️',
        testament: 'new-testament',
        reference: 'Acts 2:1-41',
        snippet: 'The Holy Spirit comes upon the disciples with wind, fire, and the power to speak in every language.',
        sections: [
            { title: 'Waiting in Jerusalem', text: 'After Jesus rose from the dead and spent forty days with His disciples, He ascended to heaven. But before He left, He gave them a promise: "Do not leave Jerusalem, but wait for the gift My Father promised. In a few days you will be baptized with the Holy Spirit. You will receive power when the Holy Spirit comes on you, and you will be My witnesses to the ends of the earth."\n\nSo about 120 believers gathered together in an upper room in Jerusalem, praying and waiting. They didn\'t know exactly what was going to happen or when. They just knew Jesus had told them to wait. So they waited — for ten days.\n\nThen came the Jewish festival of Pentecost — also called the Feast of Weeks — when Jews from every nation came to Jerusalem to celebrate. The city was packed with people from all over the known world, speaking dozens of different languages.' },
            { title: 'Wind and Fire', text: 'Suddenly, a sound like the blowing of a violent wind came from heaven and filled the whole house where the believers were sitting. It wasn\'t actually wind — it was the sound of wind, the unmistakable roar of something powerful approaching.\n\nThen they saw something astonishing. What appeared to be tongues of fire separated and came to rest on each person in the room. Every single believer — all 120 of them — had a flame hovering above their head.\n\nAnd then the Holy Spirit filled them all. They began to speak in other languages — not gibberish, but actual languages they had never learned. The Spirit gave them the ability to speak in the native tongues of people from every corner of the world.\n\nRemember the Tower of Babel, where God confused the languages and scattered the people? At Pentecost, God reversed Babel. Instead of one language becoming many to scatter people, many languages were given to gather people together and unite them with the good news about Jesus.' },
            { title: 'Peter\'s Sermon', text: 'The noise drew a massive crowd. People from every nation were bewildered — they could each hear the believers speaking in their own language! "Are not all these who are speaking Galileans? Then how is it that each of us hears them in our native language?"\n\nSome mocked and said, "They\'ve had too much wine!"\n\nThen Peter — the same Peter who had denied knowing Jesus three times just weeks earlier — stood up boldly before the crowd. Filled with the Holy Spirit, this fisherman delivered one of the greatest sermons in history.\n\n"These people are not drunk — it\'s only nine in the morning! No, this is what was spoken through the prophet Joel: \'In the last days, God says, I will pour out My Spirit on all people.\'"\n\nPeter went on to tell the crowd about Jesus — His miracles, His death on the cross, and His resurrection from the dead. "God has raised this Jesus to life, and we are all witnesses of it," Peter declared.\n\nThe crowd was cut to the heart. "What shall we do?" they asked.\n\nPeter replied, "Repent and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of your sins. And you will receive the gift of the Holy Spirit."\n\nThat day, about three thousand people believed and were baptized. The church was born — not in a palace or a temple, but in an upper room, among ordinary people filled with an extraordinary Spirit. And from that day forward, the message of Jesus began to spread across the entire world.' }
        ],
        moral: 'God gives His Spirit to empower ordinary people to do extraordinary things. The same Spirit that transformed timid disciples into bold witnesses is available to everyone who believes.',
        keyVerse: { text: 'You will receive power when the Holy Spirit comes on you; and you will be my witnesses.', ref: 'Acts 1:8' }
    }
];

let currentStoryFilter = 'all';

function initializeStories() {
    renderStoriesGrid();
    initializeStoriesFilter();
}

function initializeStoriesFilter() {
    const filterBtns = document.querySelectorAll('.stories-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStoryFilter = btn.dataset.filter;
            renderStoriesGrid();
        });
    });
}

function renderStoriesGrid() {
    const grid = document.getElementById('stories-grid');
    const detail = document.getElementById('story-detail');
    if (!grid) return;

    // Show grid, hide detail
    grid.style.display = '';
    document.querySelector('.stories-filter').style.display = '';
    document.querySelector('.stories-subtitle').style.display = '';
    if (detail) detail.hidden = true;

    const filtered = currentStoryFilter === 'all'
        ? BIBLE_STORIES
        : BIBLE_STORIES.filter(s => s.testament === currentStoryFilter);

    grid.innerHTML = filtered.map(story => `
        <div class="story-card" data-story-id="${story.id}" tabindex="0" role="button" aria-label="Read ${escapeHTML(story.title)}">
            <div class="story-card-icon">${story.icon}</div>
            <span class="story-card-testament">${story.testament === 'old-testament' ? 'Old Testament' : 'New Testament'}</span>
            <h3 class="story-card-title">${escapeHTML(story.title)}</h3>
            <p class="story-card-snippet">${escapeHTML(story.snippet)}</p>
            <span class="story-card-ref">${escapeHTML(story.reference)}</span>
        </div>
    `).join('');

    // Attach click handlers
    grid.querySelectorAll('.story-card').forEach(card => {
        const handler = () => openStoryDetail(card.dataset.storyId);
        card.addEventListener('click', handler);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
        });
    });
}

function openStoryDetail(storyId) {
    const story = BIBLE_STORIES.find(s => s.id === storyId);
    if (!story) return;

    const grid = document.getElementById('stories-grid');
    const detail = document.getElementById('story-detail');
    const content = document.getElementById('story-detail-content');
    const backBtn = document.getElementById('story-back-btn');

    // Hide grid, show detail
    grid.style.display = 'none';
    document.querySelector('.stories-filter').style.display = 'none';
    document.querySelector('.stories-subtitle').style.display = 'none';
    detail.hidden = false;

    // Find prev/next stories in the current filter
    const filtered = currentStoryFilter === 'all'
        ? BIBLE_STORIES
        : BIBLE_STORIES.filter(s => s.testament === currentStoryFilter);
    const idx = filtered.findIndex(s => s.id === storyId);
    const prevStory = idx > 0 ? filtered[idx - 1] : null;
    const nextStory = idx < filtered.length - 1 ? filtered[idx + 1] : null;

    content.innerHTML = `
        <div class="story-detail-header">
            <div class="story-detail-icon">${story.icon}</div>
            <h3 class="story-detail-title">${escapeHTML(story.title)}</h3>
            <p class="story-detail-ref">${escapeHTML(story.reference)}</p>
        </div>

        ${story.sections.map(sec => `
            <div class="story-section">
                <h4 class="story-section-title">${escapeHTML(sec.title)}</h4>
                ${sec.text.split('\n\n').map(p => `<p>${escapeHTML(p)}</p>`).join('')}
            </div>
        `).join('')}

        <div class="story-moral">
            <p class="story-moral-title">Lesson to Remember</p>
            <p>${escapeHTML(story.moral)}</p>
        </div>

        ${story.keyVerse ? `
            <div class="story-key-verse">
                <blockquote>"${escapeHTML(story.keyVerse.text)}"</blockquote>
                <cite>— ${escapeHTML(story.keyVerse.ref)}</cite>
            </div>
        ` : ''}

        <div class="story-nav-btns">
            <button class="btn btn-secondary" id="story-prev-btn" ${prevStory ? '' : 'disabled'}>← Previous Story</button>
            <button class="btn btn-secondary" id="story-next-btn" ${nextStory ? '' : 'disabled'}>Next Story →</button>
        </div>
    `;

    // Nav buttons
    const prevBtn = document.getElementById('story-prev-btn');
    const nextBtn = document.getElementById('story-next-btn');
    if (prevStory) prevBtn.addEventListener('click', () => { openStoryDetail(prevStory.id); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    if (nextStory) nextBtn.addEventListener('click', () => { openStoryDetail(nextStory.id); window.scrollTo({ top: 0, behavior: 'smooth' }); });

    // Back button
    backBtn.onclick = () => renderStoriesGrid();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}



// ========================================
// Prayer Page
// ========================================

const MORNING_PRAYERS = [
    {
        title: 'A Prayer for a New Day',
        verse: 'This is the day the LORD has made; let us rejoice and be glad in it.',
        verseRef: 'Psalm 118:24',
        text: 'Heavenly Father, thank You for the gift of this new day. As the sun rises, let Your light fill my heart with hope and purpose. I did nothing to earn this morning — the air in my lungs, the beat of my heart, the dawn breaking through my window — it is all pure grace from Your hand.\n\nGuide my steps today, Lord. Order my path so that I walk where You want me to walk, speak what You want me to speak, and do what You want me to do. Guard my words — let nothing unwholesome come from my lips, but only what is helpful for building others up according to their needs.\n\nHelp me to be a blessing to everyone I meet today — the barista who makes my coffee, the colleague who frustrates me, the stranger who needs a kind word. Let me carry Your fragrance into every room I enter and leave every person a little more encouraged than I found them.\n\nGive me strength for every challenge that lies ahead, patience in every trial that tests me, and a deep, unshakeable joy that comes not from my circumstances but from knowing that You, the Creator of the universe, are walking beside me every single moment. May everything I do today — the big achievements and the smallest tasks — bring glory to Your name.',
        closing: 'In Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Strength',
        verse: 'I can do all things through Christ who strengthens me.',
        verseRef: 'Philippians 4:13',
        text: 'Lord God, I come before You this morning asking for strength. Not the strength of the world — which is fleeting and unreliable — but Your divine strength, which is made perfect in my weakness. When I am at the end of my rope, that is where Your power begins.\n\nI confess, Lord, that I often try to face life in my own strength. I push through exhaustion, muscle through problems, and pretend I have it all together. But this morning I lay down my self-sufficiency and pick up Your all-sufficiency. I cannot do this day alone, and You never asked me to.\n\nHelp me face this day with courage and faith. When I feel overwhelmed by my responsibilities, remind me that You are bigger than any problem, any deadline, any situation that feels impossible. When I feel alone — truly, deeply alone — remind me that You are Immanuel, God with me, and that You have promised never to leave me nor forsake me.\n\nWhen my body is tired, renew my physical energy. When my mind is cluttered, bring clarity and focus. When my spirit is weary, pour out fresh oil. Fill me with Your Holy Spirit from the top of my head to the soles of my feet so I can live this day fully, freely, and fearlessly for You. I can do all things — not some things, not easy things — ALL things through Christ who strengthens me.',
        closing: 'In the mighty name of Jesus, Amen.'
    },
    {
        title: 'A Prayer for Guidance',
        verse: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to Him, and He will make your paths straight.',
        verseRef: 'Proverbs 3:5-6',
        text: 'Dear Lord, I don\'t always know which way to go or what decisions to make. Life is full of crossroads — some big, some small — and I confess that I often lean on my own understanding instead of seeking Yours first. But I trust that You see what I cannot see, that You know what I do not know, and that Your plans are infinitely better than mine.\n\nThis morning I surrender my plans to You and ask for Your divine guidance. I lay my agenda on Your altar — my schedule, my goals, my carefully crafted to-do list — and I ask You to rearrange whatever needs rearranging. Your will, not mine.\n\nOpen the doors You want me to walk through — even the ones that seem unlikely or uncomfortable — and firmly close the ones that would lead me astray, even if they look appealing from the outside. Sometimes the prettiest door leads to the emptiest room, and the narrow gate leads to abundant life.\n\nGive me ears to hear Your voice above the noise of the world, the opinions of others, and the doubts in my own head. Give me a willing, obedient heart to follow wherever You lead — even when the path is steep, winding, or uncertain. I choose to trust You today, fully and completely, even when I can\'t see the full picture. You are my GPS, my compass, my North Star. Lead on, Lord.',
        closing: 'In Your holy name I pray, Amen.'
    },
    {
        title: 'A Prayer of Gratitude',
        verse: 'Give thanks to the LORD, for He is good; His love endures forever.',
        verseRef: 'Psalm 107:1',
        text: 'Father, before I ask for anything, I want to thank You. In a world that moves so fast, I want to slow down right now and simply say: thank You. Thank You for breath in my lungs — many did not wake up this morning, but I did, and that is not an accident. Thank You for a mind that can think, for eyes that can see, for a heart that can love and be loved.\n\nThank You for the people in my life — for the ones who encourage me, challenge me, and love me even when I\'m hard to love. Thank You for the roof over my head, the clean water I drink without thinking, the food in my kitchen that I so easily take for granted. Millions go without these today, and I have them in abundance.\n\nThank You for the grace that covers me each day — grace I don\'t deserve, grace I can never earn, grace that meets me fresh every single morning. Thank You for salvation through Your Son Jesus, the greatest gift ever given. Thank You for the Holy Spirit living inside me, guiding me, convicting me, and comforting me.\n\nHelp me to live this entire day with a grateful heart. Open my eyes to the small blessings I so often overlook — the warmth of the sun, a child\'s laughter, a text from a friend, the beauty of a tree I pass every day without noticing. Transform my complaints into praise and my worries into worship. Let gratitude be the lens through which I see everything today.',
        closing: 'With a grateful heart, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Peace',
        verse: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.',
        verseRef: 'John 14:27',
        text: 'Prince of Peace, I bring You all my anxieties this morning. Lord, You know the thoughts that have been running circles in my mind — the worries that kept me awake, the fears about the future, the stress of all that lies ahead. My heart has been troubled, and my spirit has been restless. I lay every single one of them at Your feet right now.\n\nThe world offers a counterfeit peace — peace that depends on circumstances, peace that evaporates the moment things go wrong. But Your peace is different. It is supernatural. It doesn\'t make sense on paper. It guards hearts and minds even in the middle of chaos, even when the storm is still raging.\n\nI ask for that peace today, Lord. Fill me with the peace that surpasses all understanding — the kind that makes people look at my life and wonder how I can be so calm in the midst of difficulty. Guard my mind against worry and my heart against fear. When anxious thoughts try to take hold, replace them instantly with the truth of Your Word.\n\nHelp me to breathe deeply and remember that You are in control of all things — every situation, every relationship, every outcome that I\'m stressing about. You have never been surprised, never been panicked, never been uncertain. If the God of the universe is at peace, then I can be at peace too. I receive Your shalom — Your wholeness, Your completeness, Your perfect peace — over every area of my life today.',
        closing: 'I receive Your peace today, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Wisdom',
        verse: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.',
        verseRef: 'James 1:5',
        text: 'All-knowing God, I need Your wisdom today. The world is full of noise and opinions — social media feeds, news headlines, advice from well-meaning friends — but I want to hear Your voice above all others. Human wisdom is limited, biased, and constantly changing. But Your wisdom is pure, peaceable, gentle, and unchanging.\n\nI face decisions today that require more than my own intelligence. Give me discernment to know what is true and what is false, what is essential and what is distraction, what is Your will and what is merely my desire. Help me to pause before reacting, to think before speaking, and to pray before deciding.\n\nGrant me wisdom in my words — let me know when to speak up and when to remain silent, when to offer advice and when to simply listen. Grant me wisdom in my actions — help me to prioritize what truly matters and let go of what doesn\'t. Grant me wisdom in my relationships — let me see people through Your eyes and respond with the compassion and truth that comes only from above.\n\nLord, Your Word promises that You give wisdom generously to all who ask, without finding fault or keeping score. I\'m asking right now. Not for the wisdom of the world, but for the wisdom from heaven — the kind that builds bridges instead of walls, that brings peace instead of conflict, that reflects Your character in everything I do.',
        closing: 'In the name of Jesus, who is our wisdom, Amen.'
    },
    {
        title: 'A Prayer for Courage',
        verse: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.',
        verseRef: 'Joshua 1:9',
        text: 'Mighty God, I confess that sometimes I feel afraid. Afraid of failure — that I\'ll try my best and it still won\'t be enough. Afraid of rejection — that people will see the real me and walk away. Afraid of the unknown — that the future holds pain I\'m not prepared for. These fears don\'t just whisper; some days they shout.\n\nBut Your Word tells me to be strong and courageous — not because of my own power, talent, or preparation, but because You are with me. Wherever I go, whatever I face, You are already there. You\'ve gone ahead of me into every meeting, every conversation, every situation that makes my palms sweat. The outcome is already in Your hands.\n\nHelp me to step out in faith today, even when my knees are shaking. Give me the courage to do the right thing even when it\'s hard and nobody is applauding. Give me the courage to speak truth even when it\'s unpopular and might cost me something. Give me the courage to love boldly even when it feels risky and the other person might not love me back.\n\nRemind me that courage is not the absence of fear — it\'s choosing to move forward despite the fear, because I trust the One who walks beside me. David was afraid when he faced Goliath. Moses was afraid when he faced Pharaoh. Esther was afraid when she approached the king. But they all stepped forward, and You met them in their courage. Meet me in mine today, Lord.',
        closing: 'I go forward in Your strength, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Others',
        verse: 'Dear friends, let us love one another, for love comes from God. Everyone who loves has been born of God and knows God.',
        verseRef: '1 John 4:7',
        text: 'Loving Father, today I lift up the people around me — not just those I naturally gravitate toward, but every person You\'ve placed in my orbit. Bless my family with unity, health, and laughter. Bless my friends with encouragement and renewed hope. Bless my neighbors with safety and provision. And bless even those I find difficult to love — the ones who test my patience, challenge my boundaries, and rub me the wrong way.\n\nFor those who are hurting today, bring comfort that goes deeper than words. Sit with them in their pain the way only You can. For those who are lost and searching for meaning, bring direction and purpose. Open their eyes to see that You are the answer they\'ve been looking for. For those who are lonely — surrounded by people but still feeling invisible — bring genuine companionship and remind them they are seen and known.\n\nFor those battling depression, anxiety, addiction, or illness — pour out Your healing power. For those facing financial hardship, provide in miraculous ways. For those whose marriages are crumbling, rebuild what is broken. For those who have lost a loved one, hold them close and remind them that their departed are safe in Your arms.\n\nUse me as Your instrument of love today, Lord. Open my eyes to see the needs of others before they even ask. Give me a willing, generous heart to serve without expecting anything in return. Let me be Your hands, Your feet, and Your voice to a world that desperately needs to know they are loved.',
        closing: 'May Your love flow through me today, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Faithfulness',
        verse: 'His mercies are new every morning; great is Your faithfulness.',
        verseRef: 'Lamentations 3:23',
        text: 'Faithful God, Your mercies are new this morning, and I am overwhelmed with gratitude. Yesterday\'s mistakes are covered by Your grace. Yesterday\'s failures are swallowed up in Your faithfulness. I wake up today to a clean slate — not because I earned it, but because You are the God of second chances, and third chances, and ten-thousandth chances.\n\nEven when I have been unfaithful — when I\'ve broken my promises, when I\'ve drifted from Your presence, when I\'ve chosen my way over Yours — You have remained faithful. Your love has not wavered. Your commitment to me has not weakened. Your grace has not diminished. How can this be? Because Your faithfulness is not based on my performance but on Your character. And Your character never changes.\n\nHelp me to be faithful in the small things today — the things nobody sees, the things nobody applauds. Faithful in my words: let every promise I make be a promise I keep. Faithful in my work: let me give my best even when no one is watching. Faithful in my relationships: let me show up consistently, love persistently, and forgive generously.\n\nLet me live this day in a way that reflects Your faithfulness to me. And when I inevitably stumble — because I will — help me remember that Your mercies will be new again tomorrow morning, just as they were new this morning. Great is Your faithfulness, O God, my Father.',
        closing: 'I trust in Your faithfulness, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Purpose',
        verse: 'For we are God\'s handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.',
        verseRef: 'Ephesians 2:10',
        text: 'Creator God, You made me on purpose and for a purpose. Before I was formed in my mother\'s womb, You knew me. Before I drew my first breath, You had already planned good works for me to walk in. I am not an accident, a cosmic coincidence, or a random collection of atoms. I am Your handiwork — Your masterpiece, Your poema, a poem written by the divine Author of the universe.\n\nHelp me to walk in the good works You have prepared in advance for me. Not the plans I\'ve crafted for myself, not the expectations others have placed on me, not the goals the world says I should chase — but the specific, beautiful, perfectly-fitted calling You designed uniquely for me.\n\nWhen I feel insignificant — like my life doesn\'t make a difference, like I\'m too ordinary to matter — remind me that my life matters deeply to You. The world may measure significance by fame, fortune, or followers, but You measure it by faithfulness, love, and obedience. Every act of kindness, every prayer whispered, every word of encouragement spoken — these are the good works that echo into eternity.\n\nWhen I feel directionless or stuck in a season that seems meaningless, show me the hidden purpose beneath the surface. Let this day be filled with meaningful moments and divine appointments that I might miss if I\'m not paying attention. Open my eyes to see that even the mundane parts of my day are sacred ground where You are working.',
        closing: 'I walk in Your purpose today, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Humility',
        verse: 'He has shown you, O mortal, what is good. And what does the LORD require of you? To act justly and to love mercy and to walk humbly with your God.',
        verseRef: 'Micah 6:8',
        text: 'Lord, the world tells me to promote myself, to build my brand, to boast about my achievements, and to climb over others to get ahead. Social media rewards the loudest voices, the boldest claims, and the most polished image. But You call me to walk humbly — quietly, gently, with open hands instead of clenched fists.\n\nStrip away my pride this morning, Lord. It hides in so many corners of my heart — pride disguised as confidence, pride dressed up as independence, pride masked as competence. Expose it all. Help me see myself clearly — not more than I am, which is arrogance, and not less than You made me to be, which is false humility.\n\nGive me the grace to celebrate others without feeling threatened by their success. Give me the willingness to serve without needing recognition, applause, or a thank-you. Give me the maturity to admit when I\'m wrong rather than defending my ego at the cost of my relationships.\n\nRemind me today that the greatest among us is the servant of all. Jesus, You washed the feet of Your disciples — the King of Kings knelt with a towel and a basin. If You could humble Yourself like that, surely I can humble myself in my daily interactions. Help me to remember that every good thing in my life is a gift from Your hand, not a trophy I earned.',
        closing: 'Teach me humility, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Patience',
        verse: 'Be completely humble and gentle; be patient, bearing with one another in love.',
        verseRef: 'Ephesians 4:2',
        text: 'Patient Father, I confess that patience does not come naturally to me. I live in a world of instant everything — instant coffee, instant messages, instant answers. I want things now. I want results now. I want answers now. And when things don\'t move at my pace, frustration rises in my chest like a wave I can\'t control.\n\nBut You, Lord, are the most patient being in the universe. You waited centuries to fulfill Your promises — from Abraham to Jesus, over two thousand years — and You never once grew impatient. You endured the grumbling of Israel in the wilderness for forty years. You waited patiently for the prodigal son to come home. Your patience with humanity is staggering, and it humbles me.\n\nTeach me to wait well today. Not fidgety, anxious, frustrated waiting — but peaceful, trusting, grace-filled waiting. When the traffic is slow and I\'m running late, fill me with patience. When the line is long and the person ahead of me is taking forever, fill me with patience. When someone repeats themselves for the tenth time, fill me with patience.\n\nMost of all, give me patience with the people who are hardest to be patient with — including myself. Help me to bear with others in love, knowing that You bear with me every single day with infinite patience. Let me extend the same grace I\'ve been given. If You can be patient with me, surely I can be patient with others.',
        closing: 'Give me Your patience, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Kindness',
        verse: 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.',
        verseRef: 'Ephesians 4:32',
        text: 'Gracious God, make me an instrument of Your kindness today. In a world that can be harsh, cynical, and cold, let me be a warm presence — a person who brings light into dark rooms and comfort into heavy hearts.\n\nHelp me to speak gently when I could speak harshly. Help me to listen carefully when I\'d rather rush to give my opinion. Help me to act generously when selfishness would be easier. Kindness costs me nothing, but it can mean everything to someone who is struggling.\n\nOpen my eyes today to the people around me who are carrying invisible burdens. The cashier who looks tired and hasn\'t heard a kind word all day. The coworker who seems stressed and is silently falling apart. The stranger walking past me who desperately needs a smile, a nod, an acknowledgment that they exist. The elderly neighbor who would love a simple conversation. The child who just wants to be noticed.\n\nLord, I know that a single act of kindness can create a ripple effect that reaches further than I\'ll ever know. One encouraging word can save someone\'s day. One thoughtful gesture can restore someone\'s faith in humanity. One moment of compassion can be the bridge that leads someone to You.\n\nLet every interaction today leave someone feeling a little more loved, a little more valued, a little more hopeful — because they crossed paths with me, and through me, they caught a glimpse of You.',
        closing: 'Let Your kindness shine through me, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Work',
        verse: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
        verseRef: 'Colossians 3:23',
        text: 'Lord of all, I dedicate my work to You today. Whether my tasks feel exciting or mundane, groundbreaking or repetitive, meaningful or monotonous — help me to do them all with wholehearted excellence, as if I were doing them directly for You. Because ultimately, I am.\n\nI confess that I sometimes see my work as just a paycheck, just a chore, just something I have to get through. But You see it differently. You are the God who works — You worked six days creating the heavens and the earth, and You call us to work as an act of worship. Whether I\'m writing reports, flipping burgers, teaching students, or mopping floors, my work has dignity because it is offered to You.\n\nBless the work of my hands today, Lord. Give me focus when my mind wanders and I\'m tempted to scroll through my phone. Give me creativity when I\'m stuck on a problem that seems unsolvable. Give me perseverance when I want to quit at 2 PM and there are still hours ahead. Give me integrity when I could cut corners and no one would notice.\n\nHelp me to treat my coworkers, customers, and clients with respect and genuine care. Remind me that the quality of my work is a reflection of my God. I don\'t want to do just enough to get by — I want to go above and beyond, not for human approval, but for Your glory. No honest work is too small when it\'s offered as worship to the King of Kings.',
        closing: 'I work for Your glory today, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Family',
        verse: 'As for me and my household, we will serve the LORD.',
        verseRef: 'Joshua 24:15',
        text: 'Heavenly Father, I lift up my family to You this morning. You know each one intimately — their deepest joys, their hidden struggles, their unspoken fears, their secret needs. You know what makes them laugh, what keeps them awake at night, and what they are too proud to ask for help with. Love them in ways I cannot.\n\nBind us together with cords of love that cannot be broken by distance, disagreements, or the busyness that pulls us apart. In a world where families are under constant attack — from demanding schedules, financial pressure, digital distractions, and cultural confusion — be the anchor that holds us steady.\n\nHeal any hurts that exist between us, Lord. Some wounds are fresh; others are scars from years ago that still ache when pressed. Where there is distance, bring closeness. Where there is unresolved conflict, bring the humility and courage needed for honest conversation. Where there has been betrayal, begin the long work of rebuilding trust. Where there is silence, fill it with words of love.\n\nProtect each member of my family today — physically, emotionally, and spiritually. Guard their minds against lies and their hearts against temptation. Watch over the children; keep them safe from harm and rooted in faith. Strengthen the marriages; keep them passionate, faithful, and Christ-centered. Draw us all closer to You, and in drawing closer to You, draw us closer to each other.',
        closing: 'Bless my family, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Joy',
        verse: 'The joy of the LORD is your strength.',
        verseRef: 'Nehemiah 8:10',
        text: 'God of joy, I choose joy today — not because everything is perfect, but because You are good. Not because life is easy, but because You are faithful.\n\nFill me with a joy that doesn\'t depend on circumstances. A joy that can laugh in the rain, sing in the storm, and smile through tears. The kind of deep, unshakable joy that comes only from knowing You. Let my joy today be contagious and point others to You.',
        closing: 'I choose Your joy today, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Self-Control',
        verse: 'Like a city whose walls are broken through is a person who lacks self-control.',
        verseRef: 'Proverbs 25:28',
        text: 'Holy Spirit, I need Your help with self-control today. In a culture that glorifies indulgence, instant gratification, and the philosophy of \'follow your heart,\' I ask for the countercultural strength to say no when everything in me wants to say yes.\n\nHelp me to control my tongue — that small but powerful member that can set entire forests on fire. Let me think before I speak, weigh my words before I release them, and hold back the comments that wound even when I think I\'m being \'honest.\' Help me choose encouragement over criticism, grace over gossip, and silence over sarcasm.\n\nHelp me to control my appetites — not just food and drink, but the appetite for approval, for entertainment, for scrolling, for spending, for anything that consumes more of me than it should. Help me to choose what is healthy over what is easy, what is nourishing over what is numbing.\n\nHelp me to control my reactions — to respond thoughtfully instead of reacting impulsively, to pause instead of lashing out, to breathe before I fire back an angry email or send a text I\'ll regret. Lord, I know I cannot manufacture self-control on my own — if I could, I would have done it by now. But Your Spirit within me produces the fruit of self-control. So I depend entirely on You today. Fill me afresh, and let Your power reign where my willpower fails.',
        closing: 'Produce Your fruit in me, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Forgiveness',
        verse: 'Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you.',
        verseRef: 'Colossians 3:13',
        text: 'Merciful God, You have forgiven me of so much — more than I can comprehend. Every sin I\'ve ever committed, every failure I\'ve ever stumbled into, every selfish act I\'ve ever chosen — nailed to the cross and paid for in full by the blood of Jesus. My debt was infinite, and You cancelled it. Not partially, not conditionally, but completely.\n\nToday I ask for the grace to extend that same staggering forgiveness to others. And Lord, I won\'t pretend this is easy, because it\'s not. Some wounds run deep. Some betrayals shattered my trust. Some words carved scars that still burn when touched.\n\nI bring before You the people who have hurt me — some recently, some long ago. I name them silently in my heart right now. I don\'t want to carry bitterness anymore, Lord. It\'s too heavy. Bitterness is a poison I drink while hoping the other person gets sick, and I am tired of being poisoned by my own resentment.\n\nHelp me to release them. Not because they deserve it — they may not even be sorry. Not because what they did was okay — it wasn\'t. But because You have released me, and holding onto unforgiveness is a chain that keeps me imprisoned long after the offense is over. Free my heart from resentment so there is room for Your love, Your joy, and Your peace to fill the space that bitterness has occupied for too long.',
        closing: 'I choose to forgive, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Protection',
        verse: 'The LORD is my rock, my fortress and my deliverer; my God is my rock, in whom I take refuge.',
        verseRef: 'Psalm 18:2',
        text: 'Mighty fortress, I take shelter in You this morning. Before I step outside my door and into the unpredictability of this day, I ask You to cover me with Your divine protection — a shield that no weapon, no scheme, and no attack can penetrate.\n\nShield me from physical harm today, Lord. Guard my steps, my travels, my comings and my goings. Whether I am driving, walking, working, or resting, be my ever-present protector. But I ask for more than physical safety.\n\nGuard my mind from lies — the lies of the enemy that whisper I\'m not enough, that I\'ve gone too far, that God could never use someone like me. Guard my heart from temptation — the subtle seductions that start small and end in destruction. Guard my spirit from discouragement — the weight that settles when hope grows thin and faith feels fragile.\n\nPlace Your angels around me and my loved ones today. When the enemy attacks with fear, respond with Your peace. When the enemy attacks with confusion, respond with Your clarity. When the enemy attacks with isolation, respond with Your presence. Remind me throughout this day that greater is He who is in me than he who is in the world.\n\nI put on the full armor of God today — the belt of truth, the breastplate of righteousness, the shoes of the gospel, the shield of faith, the helmet of salvation, and the sword of the Spirit. I am dressed for battle and covered by Your blood.',
        closing: 'I am safe in You, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Generosity',
        verse: 'Give, and it will be given to you. A good measure, pressed down, shaken together and running over.',
        verseRef: 'Luke 6:38',
        text: 'Generous God, everything I have comes from You. Every dollar in my account, every hour in my day, every talent in my toolbox, every relationship in my life — they are all gifts from Your generous hand. I own nothing; I steward everything. Help me to hold it all with open hands instead of clenched fists.\n\nMake me generous today, Lord — and not just with my money, though that matters too. Make me generous with my time — willing to stop my busy schedule to really listen to someone who needs to talk, willing to show up even when it\'s inconvenient. Make me generous with my compliments — quick to notice the good in others and voice it, rather than keeping encouragement locked inside.\n\nMake me generous with my forgiveness — extending grace freely instead of keeping score and holding grudges. Make me generous with my knowledge — sharing what I know to lift others up rather than hoarding information to stay ahead. Make me generous with my home, my food, my resources — willing to share what I have with those who have less.\n\nCure me of the fear of not having enough. That fear is a lie from the enemy, and it shrinks my heart every time I listen to it. Your Word promises that as I give, it will be given back to me — good measure, pressed down, shaken together, and running over. You are never outdone in generosity. Help me to trust that the more I give away, the more I receive — not necessarily in material wealth, but in joy, purpose, and the deep satisfaction of living the way I was designed to live.',
        closing: 'Make me generous like You, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Contentment',
        verse: 'I have learned the secret of being content in any and every situation.',
        verseRef: 'Philippians 4:12',
        text: 'Lord, the world constantly tells me I need more — more money, more success, more followers, more stuff, a bigger house, a newer car, a better job, a different body. The advertisements never stop, the comparisons never end, and the goalpost keeps moving. But Your Word says godliness with contentment is great gain.\n\nTeach me the secret Paul learned — to be content whether I have plenty or whether I have little. Not complacent, which settles for less than Your best. Not lazy, which refuses to grow. But genuinely content — at peace with where I am, grateful for what I have, and trusting You for what\'s ahead.\n\nHelp me to stop the comparison game today. Every time I scroll through social media and feel lacking, remind me that I\'m comparing my behind-the-scenes with someone else\'s highlight reel. Every time I envy what my neighbor has, remind me that I don\'t know what it cost them. Every time I wish I were someone else, remind me that You made me uniquely and on purpose.\n\nInstead of focusing on what I don\'t have, let me count the blessings You have already poured abundantly into my life. I have salvation. I have Your presence. I have purpose. I have people who love me. I have today. And if I have You, Lord, I truly have everything I need. You are enough for me — completely, totally, eternally enough.',
        closing: 'You are my portion, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for the Lost',
        verse: 'The Lord is not slow in keeping his promise. He is patient with you, not wanting anyone to perish, but everyone to come to repentance.',
        verseRef: '2 Peter 3:9',
        text: 'Saving God, my heart breaks for those who don\'t know You yet. Friends I laugh with who have no idea how much You love them. Family members who celebrate holidays but have never met the One the holidays are about. Neighbors who live just feet away from me but are miles away from You. Coworkers who are walking through life without the hope, peace, and purpose that only comes from knowing You personally.\n\nI think of specific people right now, Lord — the ones whose faces flash across my mind. You love them even more than I do. You died for them even when they don\'t yet know it. You are pursuing them right now with the same relentless love that pursued me before I knew You.\n\nSoften their hearts, Lord. Break through the walls of pride, indifference, hurt, and skepticism that keep them from seeing You clearly. Open their eyes to the emptiness of a life without You — the achievement that still feels hollow, the parties that still leave them lonely, the success that still doesn\'t satisfy.\n\nSend people into their lives who will shine Your light — not with judgment, but with genuine love. And use me, Lord. Give me the courage to share my faith naturally, without being preachy or pushy. Give me the wisdom to know when to speak and when to simply love. Let my life be so transformed by Your grace that it makes the gospel irresistible to everyone who watches me.',
        closing: 'Save the lost, Lord, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Integrity',
        verse: 'The integrity of the upright guides them, but the unfaithful are destroyed by their duplicity.',
        verseRef: 'Proverbs 11:3',
        text: 'Righteous God, help me to be the same person in private that I am in public. The same person at home that I am at church. The same person online that I am face to face. Help me to live with such consistent integrity that there is no gap between who I appear to be and who I really am.\n\nIn a world full of spin, half-truths, and carefully crafted images, integrity feels almost countercultural. Everyone curates their best self for the world to see while hiding their true self behind closed doors. But You call me to a different standard — a life of transparency, authenticity, and wholeness.\n\nLet my word be my bond today, Lord. When I say I\'ll do something, let me do it. When I commit to being somewhere, let me be there. When I make a promise, let me keep it — even when it costs me something. Let my character be consistent from the boardroom to the bedroom, from Monday to Sunday.\n\nHelp me to resist the temptation to cut corners when no one is watching, to exaggerate when the truth doesn\'t sound impressive enough, to pretend when honesty feels too vulnerable. I want to be a person others can trust completely — not because I\'m perfect, but because I am anchored to You, the God of absolute truth. Build integrity into the foundation of my character so deeply that even under pressure, it holds.',
        closing: 'Build integrity in me, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer Before Meals',
        verse: 'He gives food to every creature. His love endures forever.',
        verseRef: 'Psalm 136:25',
        text: 'Provider God, thank You for this food before me. In a world where 828 million people go hungry every single day, I do not take this provision for granted. The fact that I have a meal in front of me is not simply due to my hard work or my planning — it is ultimately because of Your faithfulness and generosity.\n\nThank You for the unseen hands that made this meal possible — the farmers who planted and harvested, the workers who packaged and transported, the hands that prepared it. Behind every bite is a chain of provision that begins with You, the God who makes seeds grow and rain fall.\n\nBless this food to nourish my body and strengthen me for Your service. Let it fuel not just my muscles and my mind, but my mission — the work You\'ve called me to do, the people You\'ve called me to love, the life You\'ve called me to live. Every meal is a reminder that You care about the practical, physical details of my life, not just the spiritual ones.\n\nAnd as You fill my physical hunger, fill my spiritual hunger too. Remind me that man does not live by bread alone, but by every word that comes from Your mouth. Let me feast on Your Word today with the same appetite I bring to this table. Let me never forget that You are the source of every good thing — the bread of life, the living water, the provider of all I need.',
        closing: 'Thank You for Your provision, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Health',
        verse: 'Dear friend, I pray that you may enjoy good health and that all may go well with you, even as your soul is getting along well.',
        verseRef: '3 John 1:2',
        text: 'Great Healer, I thank You for my body — fearfully and wonderfully made by Your own hands. Every organ, every cell, every system working in concert is a testament to Your genius as Creator. I don\'t thank You enough for the gift of health, and I confess that I often abuse this body through neglect, poor choices, and taking it for granted.\n\nToday I ask for health and vitality to serve You well. Strengthen my body — my bones, my muscles, my immune system, every part that works silently to keep me alive. Sharpen my mind — give me clarity of thought, strong memory, and the mental energy to face the demands of this day. Renew my spirit — refresh the inner person that grows weary under the weight of life\'s pressures.\n\nHelp me to make wise choices today about what I eat, how I rest, and how I care for the body You have given me. Remind me that my body is a temple of the Holy Spirit — not a trash can to be filled with whatever tastes good, and not a machine to be driven until it breaks down. Help me to steward this temporary dwelling well.\n\nAnd for those I know and love who are battling illness right now, Lord, I ask for Your healing touch. For those waiting on test results, bring peace and favorable outcomes. For those enduring treatments, bring strength and endurance. For those who have received difficult diagnoses, bring supernatural hope. Nothing is impossible for You — You are the same God who healed the blind, cleansed the leper, and raised the dead.',
        closing: 'I trust You with my health, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for the Church',
        verse: 'For where two or three gather in my name, there am I with them.',
        verseRef: 'Matthew 18:20',
        text: 'Head of the Church, I lift up Your bride today — the Church around the world. Pastors who preach faithfully week after week even when they\'re exhausted. Leaders who navigate conflict and carry the burdens of their congregation. Missionaries in unreached nations who have given up comfort to share Your love. Small group leaders who open their homes. Sunday school teachers who pour into children. Worship teams who lead Your people into Your presence. Every believer everywhere who is doing Your work in seen and unseen ways.\n\nRevive Your Church, Lord. There are too many empty pews, too many cold hearts, too much going through the motions. Light a fresh fire in every congregation, every denomination, every house church, every gathering of believers. Bring the kind of revival that doesn\'t just fill buildings but transforms lives, communities, and cities.\n\nUnite where there is division, Lord. The body of Christ has been fractured by theological arguments, political disagreements, racial tensions, and personal pride. Help us remember that we are one body with one Lord, one faith, one baptism. Let the world see our unity and know that Jesus is real because of how we love each other.\n\nEmpower where there is weakness. Fan the flame where it is dimming. Raise up the next generation of leaders, preachers, and servants. Let Your Church be known not for hypocrisy, scandals, arguments, or politics, but for radical love, genuine faith, sacrificial service, and the undeniable power of the Holy Spirit working through imperfect people who serve a perfect God.',
        closing: 'Revive Your Church, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for the Nations',
        verse: 'Ask me, and I will make the nations your inheritance, the ends of the earth your possession.',
        verseRef: 'Psalm 2:8',
        text: 'King of Kings, I lift up the nations of the earth to You this morning. You love every people, every tribe, every tongue. You see every corner of this world — the bustling cities and the forgotten villages, the wealthy nations and the impoverished ones, the peaceful countries and the war-torn regions.\n\nBring peace where there is war, Lord. Right now, conflicts rage across this globe — soldiers fighting, families fleeing, children growing up knowing nothing but the sound of bombs. Intervene, Lord. Soften the hearts of the warmakers. Comfort the hearts of the victims. Bring leaders to the negotiating table and let justice and peace prevail.\n\nBring justice where there is oppression. There are nations where people cannot worship freely, where women are treated as property, where children are forced to work, where the powerful exploit the weak. You see it all, Lord, and it grieves Your heart. Raise up advocates, reformers, and voices of justice in every nation.\n\nRaise up godly leaders who will govern with wisdom and righteousness rather than corruption and self-interest. Put people in positions of power who genuinely care about the welfare of their people and who will honor You in their decisions. And let the knowledge of Your glory cover the earth as the waters cover the sea — let there be no corner of this planet where Your name is not known and Your love is not felt.',
        closing: 'Your kingdom come on earth, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Children',
        verse: 'Let the little children come to me, and do not hinder them, for the kingdom of heaven belongs to such as these.',
        verseRef: 'Matthew 19:14',
        text: 'Father of all, I pray for children everywhere this morning — for babies taking their first breaths, for toddlers discovering the world with wide eyes, for school-age children navigating friendships and learning, for teenagers struggling with identity and purpose. They are precious in Your sight, and every single one of them matters to You.\n\nProtect them from harm, Lord. In a world that has become increasingly dangerous for the innocent, be their shield. Protect them from abuse — physical, emotional, and sexual. Protect them from predators who lurk online and in their communities. Protect them from the lies of this culture that tells them their worth is based on how they look, what they achieve, or how many likes they get.\n\nGive them loving families and safe homes. Every child deserves to feel safe when they walk through their front door. Every child deserves to be told they are loved. For children in broken homes, be the stability they\'re missing. For children in foster care, bring them families who will love them unconditionally. For children raising themselves because their parents are absent, be the Father they need.\n\nHelp them to know You from a young age, Lord. Plant seeds of faith in their hearts before the world has a chance to harden them. Let them grow up knowing they are created on purpose, for a purpose, by a God who adores them. And for those children who are suffering right now — hungry, orphaned, exploited, trafficked, displaced by war, afraid of their own homes — be their defender and their rescuer. Move heaven and earth on their behalf.',
        closing: 'Protect the children, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer of Surrender',
        verse: 'Not my will, but yours be done.',
        verseRef: 'Luke 22:42',
        text: 'Sovereign Lord, these were the words Jesus prayed in the Garden of Gethsemane on the night before He went to the cross — sweating drops of blood, overwhelmed with sorrow to the point of death, yet still choosing Your will over His own comfort. I make these sacred words my own this morning. Not my will, but Yours be done.\n\nI surrender my agenda. I had plans for today — things I want to accomplish, places I want to go, outcomes I\'m hoping for. But if Your plans are different, let Yours prevail. I surrender my timeline. I\'ve been waiting for certain things — a breakthrough, an answer, a change — and the waiting has been hard. But Your timing is perfect, even when it doesn\'t match mine.\n\nI surrender my expectations of how life should look. The career path I imagined. The relationship I thought I\'d have by now. The version of myself I thought I\'d be. If any of these expectations are blocking me from seeing what You\'re actually doing, tear them down. I\'d rather have Your reality than my fantasy.\n\nI don\'t know what today holds, Lord, but I know who holds today. Take the steering wheel of my life. I\'m done trying to drive while asking You for directions. I\'m climbing into the passenger seat and trusting You completely. I trust Your plan more than my own, even when I don\'t understand it. Especially when I don\'t understand it. Because Your ways are higher than my ways and Your thoughts higher than my thoughts.',
        closing: 'Your will be done, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Hope',
        verse: 'May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.',
        verseRef: 'Romans 15:13',
        text: 'God of hope, some mornings the world feels incredibly heavy. The news cycle is relentless — war, disease, injustice, natural disasters, political chaos, economic uncertainty. The problems seem so massive, so impossible, so deeply rooted that hope itself feels foolish. And sometimes it\'s not even the world\'s problems — it\'s my own. My personal struggles feel overwhelming, my prayers feel unanswered, and hope feels like wishful thinking.\n\nBut You are the unshakeable source of hope, Lord. Not the shallow, fingers-crossed kind of hope that the world offers. Not the naive, head-in-the-sand optimism that ignores reality. You offer a deep, anchored, resurrection-powered hope that stares into the darkness and declares with absolute certainty that the light is coming.\n\nFill me with that kind of hope today. The kind that sustained Daniel in the lion\'s den, that kept Paul singing in prison, that held Abraham\'s faith for decades of waiting. The kind that says God is still on His throne, His promises are still true, and the best is yet to come — no matter what today looks like.\n\nLet my hope overflow and splash onto everyone I meet today. Let it be contagious. In a hopeless world, make me a carrier of Your hope — the person who walks into a room and shifts the atmosphere, the person who speaks life when everyone else is speaking death, the person who still believes that God can do the impossible because I\'ve seen Him do it before.',
        closing: 'I overflow with hope, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for My Enemies',
        verse: 'But I tell you, love your enemies and pray for those who persecute you.',
        verseRef: 'Matthew 5:44',
        text: 'Lord Jesus, this is one of the hardest things You ask of me — to pray for those who hurt me, misunderstand me, or work against me. My flesh wants revenge. My pride wants justice on my terms. My wounded heart wants them to feel the same pain they\'ve caused me. But Your Spirit calls me to love, and love is always harder than hate.\n\nSo I pray for them this morning, Lord. Every person who has betrayed my trust, spoken lies about me, excluded me, belittled me, or treated me unfairly — I lift them up to You. Not because I\'m a bigger person, but because You asked me to. And if You can pray "Father, forgive them" from a cross while soldiers mocked You and nails pierced Your flesh, then I have no excuse.\n\nSoften their hearts, Lord. Open their eyes to Your truth. If there is pain driving their behavior — hurt people hurt people — heal the root of their wounds. If they don\'t know You, draw them to salvation. If they do know You, convict them and restore them.\n\nAnd search my own heart, Lord. If I have wronged them unknowingly, reveal it to me so I can make it right. Replace every ounce of bitterness in my heart with compassion, every thread of resentment with grace, every desire for revenge with a prayer for their blessing. Help me to see them the way You see them — not as enemies, but as people You love so much You died for them too.',
        closing: 'I choose love over hate, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Discipline',
        verse: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.',
        verseRef: '2 Timothy 1:7',
        text: 'Father, I confess that discipline does not come naturally to me. I am easily distracted — my phone buzzes and I lose an hour. I am quick to procrastinate — putting off hard things in favor of easy ones. I am prone to taking the path of least resistance, even when I know the harder path leads to better fruit. But You have given me a spirit of self-discipline, and I want to walk in it today.\n\nHelp me today to stay focused on what matters most. Not just what\'s urgent, but what\'s important. Not just what screams the loudest, but what matters most for eternity. Give me the strength to say no to distractions, to social media rabbit holes, to mindless consumption of content that doesn\'t edify me.\n\nGive me the discipline to say yes to the things that align with Your will — time in Your Word, time in prayer, meaningful work, deep relationships, physical care of the body You gave me. Whether it\'s getting up early, eating better, exercising, managing my finances, staying consistent at work, or being faithful in my walk with You — let me be disciplined in the small things, because faithfulness in small things leads to faithfulness in big things.\n\nI know that discipline isn\'t punishment — it\'s training. Every athlete who wins trains hard. Every musician who excels practices daily. And every follower of Christ who bears fruit has developed habits and rhythms of discipline that keep them rooted and growing. Train me, Lord. Build habits of faithfulness into the fabric of my daily life.',
        closing: 'I walk in discipline and purpose, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for the Lonely',
        verse: 'The LORD is close to the brokenhearted and saves those who are crushed in spirit.',
        verseRef: 'Psalm 34:18',
        text: 'Compassionate God, I lift up those who are lonely this morning — the elderly person who hasn\'t had a visitor in weeks and sits in silence watching the clock. The new student eating lunch alone in a crowded cafeteria, surrounded by people yet completely invisible. The widow staring at an empty chair across the dinner table, aching for one more conversation. The person scrolling their phone at 2 AM, wishing someone — anyone — would call.\n\nLoneliness is an epidemic, Lord, and it\'s killing people quietly. Behind polished smiles and "I\'m fine" responses, there are hearts breaking from isolation. People are drowning in a sea of shallow connections and dying for one that\'s real. Social media promises community but often delivers comparison. Technology connects screens but disconnects souls.\n\nDraw close to every lonely heart right now, Lord. Wrap them in Your presence like a warm blanket on a cold night. Remind them that You are the friend who sticks closer than a brother. Whisper to them that they are not forgotten, not invisible, not unwanted. You see them. You know their name. You count their tears.\n\nAnd use me, Father. Open my eyes to the lonely ones around me — the coworker who always eats alone, the neighbor I\'ve never introduced myself to, the person at church sitting by themselves. Give me the courage to reach out, to invite, to sit with, to call, to be present. Let me be the answer to someone\'s prayer for companionship today.',
        closing: 'Use me to comfort the lonely, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Clean Hands and Pure Heart',
        verse: 'Who may ascend the mountain of the LORD? Who may stand in his holy place? The one who has clean hands and a pure heart.',
        verseRef: 'Psalm 24:3-4',
        text: 'Holy God, I want to walk before You today with absolute integrity. In a world that constantly tempts me to compromise, to cut corners, to look the other way, to click on things I shouldn\'t, to entertain thoughts I shouldn\'t — I choose holiness. Not because I\'m strong enough on my own, but because Your grace empowers me.\n\nPurify my heart from hidden motives. Search the depths of my soul and root out everything that doesn\'t belong there — secret sins I\'ve buried, double-mindedness I\'ve justified, impure thoughts I\'ve entertained, selfish ambitions I\'ve disguised as godly goals. Bring it all into the light, because what stays in the dark has power over me, but what comes into the light loses its grip.\n\nWash my hands of anything I have touched that dishonors You. If I\'ve been handling things I shouldn\'t — conversations that are toxic, entertainment that corrupts, relationships that compromise my integrity — give me the courage to let go. Clean hands aren\'t just about innocence; they\'re about intentionality.\n\nRemove from my heart every thought, desire, and ambition that does not glorify Your name. I want to ascend Your holy mountain. I want to stand in Your presence without shame. Not because I am perfect — I am far from it — but because I am surrendered, washed by the blood of Jesus, and committed to walking in purity one choice at a time. Create in me a clean heart, O God, and renew a right spirit within me.',
        closing: 'Create in me a clean heart, O God, Amen.'
    },
    {
        title: 'A Prayer for My Pastor',
        verse: 'Remember your leaders, who spoke the word of God to you. Consider the outcome of their way of life and imitate their faith.',
        verseRef: 'Hebrews 13:7',
        text: 'Lord, I lift up my pastor and church leaders to You this morning. They carry burdens I may never see — the weight of caring for hundreds of souls, each with their own struggles, questions, and crises. The pressure of preparing sermons week after week that are biblically faithful, practically relevant, and spiritually powerful. The challenge of leading imperfect people through imperfect situations with imperfect resources.\n\nRefresh them today, Lord. Ministry is exhausting, and the demands are relentless. People call at all hours. Crises don\'t wait for convenient times. Criticism comes from every direction. And the enemy targets pastors more fiercely than most, because taking down a shepherd scatters the flock.\n\nProtect their marriages and their families. So often, pastors\' families are the ones who suffer most — shared with the entire congregation, scrutinized under a microscope, expected to be perfect. Surround their spouses with encouragement and their children with grace. Let their home be a place of rest, not an extension of the ministry.\n\nGive them wisdom for the difficult decisions they face — staff issues, budget shortfalls, theological disagreements, congregational conflicts. Give them courage to preach truth even when it\'s unpopular, to lead with conviction even when it\'s costly. Shield them from burnout and discouragement, and remind them today that their labor in the Lord is not in vain.',
        closing: 'Strengthen my shepherd, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Creativity',
        verse: 'In the beginning God created the heavens and the earth.',
        verseRef: 'Genesis 1:1',
        text: 'Creator God, You are the Author of all creativity — every color in the spectrum, every melody that moves the soul, every mathematical equation that holds the universe together, every sunset that paints the sky in colors no artist can replicate. Your imagination is infinite, boundless, and endlessly surprising. And You made me in Your image, which means there is a spark of creativity planted deep within me.\n\nUnlock that creativity today, Lord. I don\'t have to be an artist or a musician to be creative. Creativity shows up in problem-solving when I consider a solution no one else has thought of. It shows up in parenting when I find a new way to connect with my child. It shows up in cooking when I look at leftover ingredients and create something beautiful. It shows up in conversation when I find just the right words to encourage a friend.\n\nGive me fresh ideas today. When I hit a wall at work, help me to see through it, around it, or over it. When routine makes life feel gray and repetitive, inject color back into my thinking. When I face challenges that seem impossible, show me innovative solutions that I couldn\'t conjure on my own.\n\nLet my creativity ultimately point others to You, the ultimate Creator. Let the work of my hands, the thoughts of my mind, and the expressions of my heart reflect the beauty and genius of the God who made me. Help me to create not for applause or recognition, but for Your glory and for the flourishing of the people around me.',
        closing: 'Inspire me today, Creator God, Amen.'
    },
    {
        title: 'A Prayer for Financial Wisdom',
        verse: 'The blessing of the LORD brings wealth, without painful toil for it.',
        verseRef: 'Proverbs 10:22',
        text: 'Provider God, I bring my finances before You this morning. You know every detail — my income and my expenses, my debts and my savings, my financial goals and my financial anxieties. Money is one of the most stressful areas of life, and I confess that I don\'t always handle it with the wisdom You desire. But I trust that You are my ultimate provider, and that Your blessing is what truly brings prosperity.\n\nGive me wisdom to manage what You\'ve given me faithfully. I am a steward, not an owner — every dollar that passes through my hands ultimately belongs to You. Help me to budget well, to plan ahead, to avoid impulsive decisions that lead to regret. Give me the discipline to delay gratification when something I want isn\'t something I need right now.\n\nHelp me to be generous, Lord. Generosity is the antidote to greed, and I want to be a river, not a reservoir — letting blessings flow through me to others. Help me to tithe faithfully, to give to those in need cheerfully, and to hold my possessions loosely. Help me to save wisely, not out of fear but out of stewardship. And help me to spend thoughtfully — not wastefully, but also not so frugally that I miss opportunities to enjoy the life You\'ve given me.\n\nFree me from the love of money, which is the root of all kinds of evil, and from the fear of lack, which robs me of peace. Whether I have plenty or little, let me be content, knowing that my true treasure is stored in heaven where moth and rust cannot destroy.',
        closing: 'I trust You as my provider, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Missionaries',
        verse: 'Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.',
        verseRef: 'Matthew 28:19',
        text: 'Lord of the harvest, I pray for missionaries serving in difficult places around the world this morning — those who left their homes, their families, their comfort zones, their careers, and everything familiar to carry the gospel to people who have never heard it. They chose obedience over comfort, and their sacrifice is inspiring.\n\nProtect them physically, Lord. Some serve in dangerous regions where persecution is real, where governments are hostile to the gospel, where their lives are literally at risk for simply speaking Your name. Surround them with Your angels. Shield them from harm. Give them supernatural discernment about when to advance and when to withdraw.\n\nProtect them spiritually as well. The enemy targets missionaries with fierce intensity — loneliness, discouragement, culture shock, doubt, homesickness, marital strain, burnout. Strengthen their inner person. Refresh their passion for the work. Remind them daily why they said yes.\n\nProvide for their needs, Lord. Many missionaries live on support that fluctuates with the economy and the faithfulness of donors. Meet their financial needs, their medical needs, their emotional needs. Sustain their families — their spouses who sacrificed alongside them and their children who are growing up far from extended family. Give them breakthroughs in the communities they serve. And stir up more workers for Your harvest, Lord — including me, whether it\'s across the ocean or across the street.',
        closing: 'Send more workers into the harvest, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Today\'s Conversations',
        verse: 'Let your conversation be always full of grace, seasoned with salt, so that you may know how to answer everyone.',
        verseRef: 'Colossians 4:6',
        text: 'Lord, I will speak hundreds — maybe thousands — of words today. In meetings and in messages, at meals and in passing, through texts and emails and phone calls and face-to-face encounters. Each word has power to build up or tear down. Each sentence can be a gift or a weapon. Proverbs says the tongue has the power of life and death, and I want to choose life today.\n\nGuard my tongue, Lord. Set a watch over my mouth. Before words leave my lips, filter them through three questions: Is it true? Is it kind? Is it necessary? Help me to eliminate careless words that wound, sarcastic jabs disguised as humor, and gossip that I excuse by calling it "prayer requests" or "concern."\n\nLet my words be full of grace and truth today. Help me to listen more than I speak — really listen, not just wait for my turn to talk. Help me to encourage more than I complain, to affirm more than I criticize, to speak life into every person I encounter, especially those who rarely hear anything good about themselves.\n\nWhen I\'m tempted to gossip, hold my tongue. When I\'m tempted to exaggerate, keep me honest. When I\'m in a heated conversation, keep me calm. Give me the right words at the right moments — words of comfort for the hurting, words of challenge for the complacent, words of truth for the confused, and words of hope for the despairing. Let my words taste like salt and shine like light in a flavorless, dark world.',
        closing: 'Season my words with grace, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Endurance',
        verse: 'Let us run with perseverance the race marked out for us, fixing our eyes on Jesus.',
        verseRef: 'Hebrews 12:1-2',
        text: 'Jesus, some mornings I feel like giving up — on a dream that seems to be dying, a relationship that takes more than it gives, a calling that costs more than I expected, or just the relentless grind of daily life. The race feels impossibly long, the finish line seems invisible, and my legs are shaking with exhaustion.\n\nBut You have marked out a specific race for me, and You\'ve gone before me every step of the way. You didn\'t call me to someone else\'s race — shorter, easier, flashier. You called me to mine. And You wouldn\'t have given me this race if You weren\'t going to give me the endurance to finish it.\n\nStrip away every weight that slows me down — doubt that makes me second-guess every step, distraction that pulls my attention from the path, discouragement that whispers "what\'s the point," sin that entangles my feet and trips me up. I don\'t need more speed; I need more endurance. I don\'t need to sprint; I need to persist.\n\nI fix my eyes on You today, Jesus — the author and perfecter of my faith. You who endured the cross for the joy set before You. If You could endure that, I can endure this. One more step, one more day, one more act of faithfulness. Not because I\'m strong, but because You are. Not because the race is easy, but because the One who called me is faithful. I will not give up.',
        closing: 'I will not give up, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Gratitude',
        verse: 'Give thanks in all circumstances; for this is God\'s will for you in Christ Jesus.',
        verseRef: '1 Thessalonians 5:18',
        text: 'Father, before my complaints start, before my requests begin, before my worries take hold of this morning, I want to start with thanks. Pure, unfiltered, heartfelt gratitude. Thank You for the breath in my lungs — the miracle I take for granted with every inhale. Thank You for a brand new day that I didn\'t earn and don\'t deserve. Thank You for salvation — the gift that cost You everything and cost me nothing. Thank You for grace upon grace upon grace.\n\nThank You for the specific blessings of my life — the roof over my head, the food I\'ll eat today, the people who know my name and love me anyway. Thank You for the sunrise I may not notice and the sunset I may forget to watch. Thank You for the small mercies that fill the spaces between the big events — a warm cup of coffee, a stranger\'s smile, a text from a friend, a moment of unexpected laughter.\n\nI know Your will is for me to give thanks in ALL circumstances — not just the mountaintop moments, but the valley seasons too. So I choose gratitude today even for the hard things, trusting that You are weaving every struggle, every setback, and every tear into a tapestry that will ultimately display Your glory and my good. The closed doors were Your protection. The delays were Your timing. The "no" was Your better "yes."\n\nGratitude changes everything, Lord. It shifts my perspective from scarcity to abundance, from self-pity to praise, from anxiety to peace. Today I choose to see through grateful eyes. Let every heartbeat be a thank You, and every breath be praise.',
        closing: 'I am grateful, Lord, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Healing',
        verse: 'He heals the brokenhearted and binds up their wounds.',
        verseRef: 'Psalm 147:3',
        text: 'Healer of body and soul, I bring my pain to You this morning — every part of me that hurts, whether it\'s physical illness that drains my energy, emotional wounds that ache when I least expect it, or spiritual dryness that makes You feel distant. You are Jehovah Rapha, the God who heals, and nothing is beyond Your ability to restore.\n\nTouch every area that is broken, Lord. Heal my body where sickness lingers — the chronic pain I\'ve learned to live with, the diagnosis that scares me, the symptoms I haven\'t told anyone about. You created this body; You know every cell, every nerve, every system. Speak healing to what is diseased and restoration to what is damaged.\n\nHeal my heart where grief and rejection have left scars. Some wounds are old but still tender — the loss I never fully processed, the betrayal I never fully forgave, the rejection that still whispers "you\'re not enough." Go deep, Lord. Don\'t just treat the symptoms; heal the root. Reach the places I\'ve locked away and bring Your gentle, thorough healing to every hidden wound.\n\nHeal my spirit where doubt, disappointment, and disillusionment have taken root. Where I used to burn with passion, I feel cold. Where I used to overflow with faith, I feel empty. Revive what has died within me. I believe You can heal me completely — body, soul, and spirit. And even if healing comes slowly, gradually, one day at a time, I trust Your timing. You are not slow; You are thorough.',
        closing: 'I believe in Your healing power, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Boldness',
        verse: 'For God has not given us a spirit of fear, but of power and of love and of a sound mind.',
        verseRef: '2 Timothy 1:7',
        text: 'Mighty God, I confess that fear often holds me back. Fear of failure — so I don\'t try. Fear of rejection — so I don\'t ask. Fear of the unknown — so I stay where it\'s comfortable. Fear of what people think — so I silence my convictions. But Your Word declares with absolute clarity that You have not given me a spirit of fear. That timidity, that cowardice, that paralyzing anxiety — none of it comes from You.\n\nWhat You have given me is power — the same power that raised Jesus from the dead lives inside of me. You\'ve given me love — the kind of love that casts out fear and compels me to act on behalf of others. You\'ve given me a sound mind — not confusion, not panic, not irrational dread, but clarity and wisdom.\n\nReplace my timidity with holy boldness today, Lord. Give me the courage to speak up when everyone is silent, to stand out when the crowd is going the wrong way, to step out in faith even when the path ahead is unclear and the odds seem impossible. Not reckless boldness that ignores wisdom, but Spirit-empowered boldness that trusts God beyond what I can see.\n\nLet me be bold like Peter at Pentecost, preaching fearlessly to the same crowd that crucified his Lord. Like Esther, who walked into the king\'s court uninvited because she knew her people needed her. Like Paul, who preached the gospel in chains when most people would have given up. Fill me with that same fire today.',
        closing: 'I walk in boldness and not fear, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Unity in My Home',
        verse: 'How good and pleasant it is when God\'s people live together in unity!',
        verseRef: 'Psalm 133:1',
        text: 'Father, my home is where I am most real — where the mask comes off, where my best self and my worst self both show up, and where the people I love the most sometimes bear the brunt of my stress, exhaustion, and frustration. Arguments flare, misunderstandings multiply, and busy schedules pull us in different directions until we\'re living under the same roof but disconnected in our hearts.\n\nBring unity to my home today, Lord. Not the fake kind where we pretend everything is fine while resentment simmers beneath the surface, but the real kind — where we are honest with each other, quick to apologize, and eager to reconcile. The kind where love isn\'t just a word on a wall plaque but a daily practice of putting someone else first.\n\nHelp us to be quick to listen and slow to anger. Help us to put down our phones and look each other in the eyes. Help us to laugh together, eat together, pray together, and enjoy each other\'s company. Let our home be filled with the fragrance of kindness and the warmth of grace.\n\nWhether I live alone, with family, with a spouse, or with roommates — make my home a sanctuary of Your presence. A place where people feel safe, loved, accepted, and refreshed. A place where the atmosphere itself whispers, "God lives here." Let peace rule in every room and love fill every conversation.',
        closing: 'Let peace rule in my home, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for the Oppressed',
        verse: 'Learn to do right; seek justice. Defend the oppressed. Take up the cause of the fatherless; plead the case of the widow.',
        verseRef: 'Isaiah 1:17',
        text: 'God of justice, I pray for those who are oppressed, marginalized, and voiceless around the world. Victims of human trafficking who are trapped in unspeakable conditions and have lost all hope of rescue. Communities living under tyranny where speaking out means imprisonment or death. The poor who are systematically exploited by unjust systems — paid unfairly, housed poorly, denied basic dignities.\n\nYou are not silent about injustice, Lord. All throughout Scripture, You champion the cause of the weak, the poor, the orphan, and the widow. You are a God who sees, who hears, and who acts. Injustice may appear to have the upper hand, but it never has the last word — You do.\n\nRise up and defend the defenseless, Lord. Break the chains of those who are enslaved. Expose the corrupt systems that profit from human suffering. Strengthen the organizations, advocates, and activists who are fighting for justice on the front lines. Give them resources, protection, and breakthroughs.\n\nAnd use me as an instrument of Your justice, Lord. Open my eyes to the injustice around me — not just across the world, but in my own community. The person being bullied. The worker being exploited. The family being overlooked. Give me the courage to speak up when staying silent would be easier, to stand with the marginalized when it costs me something, and to use whatever influence I have to make the world more just.',
        closing: 'Let justice roll like a river, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer Before Reading Scripture',
        verse: 'Open my eyes that I may see wonderful things in your law.',
        verseRef: 'Psalm 119:18',
        text: 'Holy Spirit, I am about to open Your Word. But before my eyes scan the page, before my fingers turn to the passage, I need You to open the eyes of my heart. Without You, these are just ancient words on a page. With You, they become living, active, sharper than any double-edged sword, able to penetrate the deepest parts of who I am.\n\nHelp me to see wonderful things I\'ve never noticed before — even in verses I\'ve read a hundred times. Show me a fresh angle, a deeper meaning, a personal application that hits home today. Speak to me personally through this ancient text, Lord. You inspired every word, and You know exactly what I need to hear right now.\n\nMake the words come alive — not as dry information to file away, but as living transformation that changes how I think, how I speak, how I treat people, how I make decisions. Don\'t let me read casually, Lord. Don\'t let me read out of obligation or routine. Let every chapter, every verse, every phrase land with the weight and wonder it deserves.\n\nGive me ears to hear what You are saying to me today, and then give me the faith and the courage to obey what I hear. I don\'t want to be a hearer of the Word only, but a doer. Let Your Word take root in the soil of my heart and bear fruit that lasts.',
        closing: 'Speak, Lord, Your servant is listening, Amen.'
    },
    {
        title: 'A Prayer for Neighbors',
        verse: 'Love your neighbor as yourself.',
        verseRef: 'Mark 12:31',
        text: 'Lord, You command me to love my neighbor — not just the ones I like, not just the ones who are easy to love, not just the ones who look and think and believe like me. Every person You have placed near me is my neighbor. The co-worker I struggle with. The person next door I barely know. The stranger I pass on the street without making eye contact. The difficult relative. The awkward acquaintance. All of them.\n\nGive me Your eyes to see them, Lord. When I look at people, I often see inconveniences, interruptions, or strangers. But when You look at them, You see beloved children made in Your image, each one carrying their own story, their own pain, their own dreams. Help me to see people the way You do — as infinitely valuable and deeply loved.\n\nGive me Your heart to love them. Not with distant, theoretical love that talks about compassion but never acts on it, but with hands-and-feet, roll-up-your-sleeves, show-up-at-the-door love. The kind that notices when someone is struggling and does something about it.\n\nShow me one practical way I can be a good neighbor today — a kind word to the cashier who looks exhausted, a helping hand to the elderly neighbor with groceries, an invitation to coffee for the new person who doesn\'t know anyone yet, a listening ear for the friend going through a hard season. Let my neighborhood, my office, my school, my community be better because I live in it.',
        closing: 'Help me love my neighbor well, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Revival',
        verse: 'Will you not revive us again, that your people may rejoice in you?',
        verseRef: 'Psalm 85:6',
        text: 'Lord God, we are in desperate need of revival — in our hearts, in our churches, in our communities, in our nations. We have drifted far from You, and the evidence is everywhere. Churches are emptying while anxiety is increasing. Morality is crumbling while entertainment is booming. We call evil good and good evil. We have exchanged Your truth for comfortable lies and Your presence for religious rituals.\n\nBut You are the God who revives dry bones and ignites cold hearts. You\'ve done it before throughout history — under Josiah, under Ezra, at Pentecost, in the Great Awakenings, in revival movements across the globe. You can do it again. And we need it more than ever.\n\nStart with me, Lord. Revival doesn\'t begin in a stadium or a conference — it begins in one surrendered heart. Revive my prayer life that has grown lukewarm. Revive my passion for Your Word that has faded into routine. Revive my love for the lost that has cooled into indifference. Revive my hunger for holiness that has been replaced by tolerance of sin.\n\nAnd then let the fire spread — from my heart to my home, from my home to my church, from my church to my community, from my community to my nation, from my nation to the nations of the earth. Let revival sweep across the land like wildfire, not manufactured by human effort or marketing, but ignited by Your Holy Spirit in raw, undeniable, life-transforming power.',
        closing: 'Revive us again, O Lord, Amen.'
    },
    {
        title: 'A Prayer of Delight',
        verse: 'Delight yourself in the LORD, and he will give you the desires of your heart.',
        verseRef: 'Psalm 37:4',
        text: 'Gracious God, this morning I choose to delight in You — not in my circumstances, which change daily. Not in my achievements, which can be here today and forgotten tomorrow. Not in what I have or don\'t have, which the world says should define my happiness. But in You alone. You are the source of true, deep, unshakeable delight that doesn\'t depend on anything external.\n\nTeach me what it means to truly delight in You, Lord. To find joy in Your presence the way a child finds joy in a parent\'s arms. To treasure Your Word the way a miner treasures gold. To crave time with You the way I crave the things I love most in this world. I want to delight in who You are — Your faithfulness, Your creativity, Your humor, Your power, Your gentleness, Your wisdom.\n\nAs I delight in You, align my desires with Yours. This is the beautiful paradox of this verse — when I truly delight in You, my desires change. The things I used to chase don\'t matter as much anymore. The things You care about become the things I care about. Naturally, effortlessly, my heart begins to want what Your heart wants.\n\nRemove the desires that don\'t honor You and plant new ones that bring You glory. I don\'t just want You to give me what I want — I want You to change what I want until my deepest desires are perfectly aligned with Your perfect will. I trust that as I seek You first, everything else will fall into its proper place.',
        closing: 'You are my delight, Lord, Amen.'
    },
    {
        title: 'A Prayer for Obedience',
        verse: 'If you love me, keep my commands.',
        verseRef: 'John 14:15',
        text: 'Lord Jesus, obedience is not popular in a world that celebrates autonomy, that glorifies doing whatever feels right, that worships personal freedom above all else. "Follow your heart" is the mantra of our culture. But You call me to a radically different standard — not blind obedience born of fear that says "I have to," but loving obedience born of relationship that says "I want to, because I love You."\n\nToday, help me to obey You in the small things that no one sees — the private choices, the inner thoughts, the moments when I could get away with cutting corners. And help me to obey You in the big things that everyone notices — the public stands, the costly decisions, the moments that define my character.\n\nWhen Your Word contradicts my desires, give me the strength to choose Your way over my feelings. Feelings change with the weather; Your Word stands forever. When the crowd goes one direction and You call me another, give me the courage to follow You alone, even if it means walking a lonely road.\n\nMy obedience is my love letter to You, Jesus. It\'s how I say "I love You" with my life, not just my lips. It\'s the proof that my faith is real, not just theoretical. Help me to remember that obedience isn\'t the price I pay for Your love — it\'s the response to love I\'ve already received. You obeyed the Father all the way to the cross because You loved me. The least I can do is obey You in my everyday life because I love You back.',
        closing: 'I choose obedience out of love, in Jesus\' name, Amen.'
    }
];

const EVENING_PRAYERS = [
    {
        title: 'A Prayer of Rest',
        verse: 'Come to me, all you who are weary and burdened, and I will give you rest.',
        verseRef: 'Matthew 11:28',
        text: 'Dear Lord, the day is done and I come to You tired but grateful. Thank You for carrying me through every moment of this day — the moments that made me smile and the moments that made me sigh. The victories I celebrated and the battles that exhausted me. The conversations that encouraged me and the ones that drained me. You were in all of it, and I am still standing because of Your faithfulness.\n\nAs I lay down tonight, quiet my racing thoughts. My mind wants to replay the day — the mistakes I made, the things I should have said differently, the tasks I didn\'t finish. Turn off the mental noise, Lord. Silence the inner critic. Still the anxiety that tries to follow me to bed like an unwanted companion.\n\nCalm my restless heart. I\'ve been striving all day — pushing, achieving, managing, performing. But now it\'s time to stop. To simply be. To rest in the truth that my worth is not based on what I accomplished today but on who I am in You: beloved, accepted, enough.\n\nReplace my weariness with Your supernatural rest — the kind that doesn\'t just recharge my body but refreshes my soul. Replace my worries with Your peace — the kind that doesn\'t make sense but guards my heart anyway. Watch over me and my loved ones through the night hours. Be our shield and our comfort until the morning light returns.',
        closing: 'I rest in You tonight, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer of Reflection',
        verse: 'Search me, God, and know my heart; test me and know my anxious thoughts.',
        verseRef: 'Psalm 139:23',
        text: 'Heavenly Father, as this day ends, I invite You to search my heart with Your gentle, penetrating light. Not to condemn me, but to correct me. Not to shame me, but to shape me. Show me where I fell short today — where I chose selfishness over love, where I chose impatience over grace, where I chose fear over faith, where I chose comfort over obedience.\n\nI think back through the hours of this day. The morning rush where I was too hurried to be kind. The midday stress where I snapped at someone who didn\'t deserve it. The evening scroll through my phone when I could have been present with the people right in front of me. The opportunities to encourage that I let pass. The moments to pray that I filled with noise instead.\n\nI confess my sins and shortcomings, Lord — the ones I\'m aware of and the ones I\'ve been blind to. I bring them to You openly, knowing that You are faithful and just to forgive me. Thank You that Your mercy never runs out, that it\'s fresh and available right now, at the end of this imperfect day.\n\nHelp me to learn from today so I can love better tomorrow. Don\'t let my failures define me; let them refine me. Show me the patterns I need to change, the habits I need to break, and the attitudes I need to adjust. And give me the grace to try again when the sun rises.',
        closing: 'I rest in Your forgiveness, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Protection',
        verse: 'He who watches over Israel will neither slumber nor sleep.',
        verseRef: 'Psalm 121:4',
        text: 'Almighty God, as darkness falls outside my window, I trust in Your unfailing protection. The night can feel vulnerable — strange sounds amplified in the silence, shadows that seem to move, and the general unease that comes when the world goes dark. But You are the God who never sleeps, the guardian who never takes a break, the watchman who never abandons His post.\n\nPost Your angels around my home tonight, Lord. Station them at every door, every window, every entry point. Protect my family from physical harm — from break-ins and fires, from accidents and illness, from anything that would threaten our safety while we are at our most vulnerable.\n\nProtect my mind from anxiety and fear. The nighttime is when worries grow largest and darkest, when problems that seemed manageable during the day feel impossible in the silence. Guard my thoughts. Don\'t let the enemy use the nighttime hours to torment me with worst-case scenarios and spiraling fears.\n\nProtect my dreams from darkness. Let my subconscious be guarded territory — off limits to nightmares, to disturbing images, to spiritual attacks that come while I\'m asleep and defenseless. Instead, fill my sleep with Your peace. Let me rest under the shadow of Your wings, completely safe and totally secure in Your unfailing love. You are my fortress, my refuge, my strong tower. Nothing can touch me without passing through You first.',
        closing: 'Under Your wings I find refuge, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer of Surrender',
        verse: 'Into your hands I commit my spirit; deliver me, LORD, my faithful God.',
        verseRef: 'Psalm 31:5',
        text: 'Lord Jesus, these were the words You spoke from the cross — Your final breath spent in an act of total surrender to the Father. And they are my prayer tonight. I have nothing left to give from this day except my complete trust in You.\n\nI surrender everything — my successes and my failures, my moments of faith and my moments of doubt, my hopes for the future and my fears about the unknown. I surrender the conversations that went well and the ones that went sideways. I surrender the things I accomplished and the things still sitting on my to-do list.\n\nI cannot control tomorrow, Lord. I cannot fix everything that\'s broken. I cannot heal every relationship, solve every problem, or guarantee any outcome. And tonight, I\'m tired of trying. So I release my grip on everything I\'ve been holding too tightly — the plans I\'ve been white-knuckling, the people I\'ve been trying to change, the outcomes I\'ve been desperate to force.\n\nI place it all in Your capable, nail-scarred hands. Hands that created the universe, that healed the sick, that broke bread for five thousand, that were stretched out on a cross for me. If I can trust those hands with my eternal salvation, I can trust them with tomorrow\'s worries.',
        closing: 'Into Your hands I commit my spirit, Amen.'
    },
    {
        title: 'A Prayer for Loved Ones',
        verse: 'The LORD bless you and keep you; the LORD make His face shine on you and be gracious to you.',
        verseRef: 'Numbers 6:24-25',
        text: 'Caring Father, as the world grows quiet tonight, I lift up each person I love — one by one, face by face, name by name. You know them intimately, Lord. You know them even better than I do. You formed them in their mothers\' wombs. You numbered their days before one of them came to be. And You love them even more deeply than I ever could, which is staggering to consider.\n\nBless them with peaceful sleep tonight. For the ones tossing and turning with worry, calm their anxious hearts. For the ones battling insomnia, grant them rest. For the little ones afraid of the dark, be their night light and their comfort.\n\nHeal those who are sick — the family member fighting a diagnosis, the friend recovering from surgery, the loved one battling chronic pain that never fully goes away. Touch their bodies with Your healing hand tonight.\n\nComfort those who are grieving. I know people right now who are walking through seasons of devastating loss. Be close to their broken hearts. Catch their tears. Whisper hope into their sorrow. Strengthen those who are struggling — financially, emotionally, spiritually, relationally. Meet them at their point of need. Draw near to those who feel far from You tonight — the prodigals, the doubters, the ones who have walked away. Pursue them with Your relentless love. Surround each one with Your love and protection through the night.',
        closing: 'I entrust them to Your care, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer of Thanksgiving',
        verse: 'Every good and perfect gift is from above, coming down from the Father of the heavenly lights.',
        verseRef: 'James 1:17',
        text: 'Generous God, before I close my eyes tonight, I want to count my blessings. Not because I have to, but because I want to — because gratitude is the best way to end a day. Every good thing in my life comes from You. Every kindness received came through Your orchestration. Every moment of unexpected laughter was a gift You planted in my day. Every provision met was Your faithfulness showing up again.\n\nThank You for today\'s mercies, Lord — both the ones I noticed and the countless ones I missed. The car accident that didn\'t happen. The illness I didn\'t catch. The disaster that was averted behind the scenes. Your unseen mercies probably far outnumber the ones I\'m aware of, and knowing that fills me with awe.\n\nThank You for answers to prayers I didn\'t even know to pray. For doors You closed that I thought I wanted opened. For the "no" that protected me from something I couldn\'t see. For the delay that turned out to be perfect timing. Your wisdom is so far beyond mine that even Your rejections are gifts.\n\nLet gratitude be the last thing on my heart as I drift off to sleep tonight. Not worry. Not regret. Not anxiety about tomorrow. Just gratitude — warm, genuine, overflowing gratitude for a God who gives good gifts to His children.',
        closing: 'With a thankful heart, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Tomorrow',
        verse: 'Do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.',
        verseRef: 'Matthew 6:34',
        text: 'Lord, I confess that my mind has already raced ahead to tomorrow — to the alarm clock that will ring too early, to the tasks waiting on my desk, to the meetings on my calendar, to the problems that are still unsolved, to the unknowns that make my stomach tighten with anxiety. I\'m lying in bed, but my brain is already at work.\n\nBut You tell me clearly, directly, without ambiguity: do not worry about tomorrow. Tomorrow will worry about itself. Each day has enough trouble of its own. You\'re not saying tomorrow won\'t have challenges. You\'re saying I don\'t need to face them tonight. Tonight\'s job is to rest. Tomorrow\'s job is for tomorrow.\n\nSo tonight, I choose — and it is a choice, a deliberate act of my will — to leave tomorrow in Your hands. You have been faithful every single day of my life. Every morning I\'ve opened my eyes, You were already there. Every crisis I\'ve walked into, You had already prepared a way through. Every need I\'ve had, You\'ve met it — maybe not the way I expected, but always at the right time.\n\nI trust You will be faithful again when the sun rises. The same God who handled today\'s challenges will handle tomorrow\'s. Help me to simply rest now — to close my eyes, release my grip on tomorrow, and trust that You\'re already there, preparing the way.',
        closing: 'Tomorrow belongs to You, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Healing',
        verse: 'He heals the brokenhearted and binds up their wounds.',
        verseRef: 'Psalm 147:3',
        text: 'Great Physician, I bring You the wounds of this day — every one of them. The harsh words that stung like a slap, replaying in my mind over and over. The disappointments that ached deep in my chest — the hope deferred that made my heart sick. The exhaustion that has settled deep in my bones, in my muscles, in the very marrow of who I am.\n\nYou are the healer of broken hearts and tired bodies. The God who tenderly binds up wounds with the care of a loving parent bandaging a child\'s scraped knee. You don\'t dismiss my pain or minimize my hurt. You sit with me in it. You weep with me. And then You heal.\n\nTouch every place that hurts tonight, Lord. The physical pain — the headache, the back ache, the chronic condition that never fully lets up. The emotional pain — the rejection that felt personal, the criticism that went deep, the loneliness that ached when I got home to an empty house. The spiritual pain — the distance I feel from You, the prayers that feel like they hit the ceiling, the faith that feels thin tonight.\n\nRestore what has been drained today. My energy. My optimism. My resilience. My joy. Let Your healing power work in me as I sleep — knitting together what is broken, replenishing what is depleted, restoring what the locusts have eaten. Let me wake renewed and whole, ready to face another day because You are the God who heals.',
        closing: 'I receive Your healing touch, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for God\'s Presence',
        verse: 'Where can I go from your Spirit? Where can I flee from your presence?',
        verseRef: 'Psalm 139:7',
        text: 'Ever-present God, sometimes the night feels long and lonely. The house is quiet, the world is asleep, and in the silence, I can feel the weight of my own solitude. But Your Word reminds me with absolute certainty that there is nowhere I can go where You are not already there. Not the highest height nor the deepest depth. Not the brightest day nor the darkest night.\n\nYou are with me in the light when everything is clear and easy and joyful. And You are equally with me in the darkness when the path is unclear, the struggle is real, and the joy has faded. You don\'t leave when things get hard. You don\'t step out when I mess up. You don\'t turn away when I doubt.\n\nYou are with me when I feel strong and confident, and You are with me when I feel broken and small. You are with me when my faith is a roaring fire, and You are with me when it\'s barely a flickering ember. Your presence is not dependent on my performance; it\'s anchored in Your promise.\n\nTonight, let me feel Your presence close — not just know it as a theological fact in my head, but feel it as a tangible reality in my heart. Let the awareness of Your nearness settle over me like a warm blanket. Let me sense You sitting at my bedside, watching over me, never leaving, never sleeping, never letting me go. You are here, Emmanuel — God with me. And that is more than enough.',
        closing: 'You are here, and that is enough. In Jesus\' name, Amen.'
    },
    {
        title: 'The Lord\'s Prayer',
        verse: 'This, then, is how you should pray...',
        verseRef: 'Matthew 6:9',
        text: 'Our Father in heaven, hallowed be Your name. Your name is holy, set apart, worthy of all reverence. In a world that uses Your name carelessly, I choose to honor it with awe and wonder tonight.\n\nYour kingdom come, Your will be done, on earth as it is in heaven. Let Your rule and reign extend into every corner of my life — my home, my work, my relationships, my heart. Whatever Your will is, Lord, let it override mine completely.\n\nGive us today our daily bread. Thank You for providing everything I needed today — food, shelter, breath, strength. I trust You to do the same tomorrow. And forgive us our debts, as we also have forgiven our debtors. I receive Your forgiveness tonight, Lord, and I extend that same forgiveness to everyone who wronged me today. I release them. I set them free.\n\nAnd lead us not into temptation, but deliver us from the evil one. Protect me from the traps the enemy has set. Keep me from the sin that so easily entangles. Deliver me from evil — external and internal, visible and invisible. For Yours is the kingdom and the power and the glory forever. Tonight and always, it all belongs to You.',
        closing: 'Amen.'
    },
    {
        title: 'A Prayer for Renewed Mind',
        verse: 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
        verseRef: 'Romans 12:2',
        text: 'Transforming God, as this day closes I ask You to renew my mind. Today the world poured a lot into my head — news headlines designed to frighten me, advertisements designed to make me feel inadequate, social media designed to make me compare, conversations that planted seeds of negativity. Some of what entered my mind today honored You, and some of it definitely didn\'t.\n\nWash away the negative thoughts that attached themselves to me throughout the day. The self-doubt that whispered "you\'re not good enough." The cynicism that said "nothing ever changes." The anxiety that insisted "everything is falling apart." Those are not from You, and I don\'t want to carry them into sleep.\n\nReplace lies with truth tonight, Lord. For every lie the enemy planted, overwrite it with Your Word. Where he said "you\'re worthless," speak Your truth: "you are fearfully and wonderfully made." Where he said "you\'re alone," speak Your truth: "I will never leave you nor forsake you." Where he said "there\'s no hope," speak Your truth: "I know the plans I have for you, plans to prosper you and not to harm you."\n\nWhile I sleep, let Your Spirit do the deep work of transformation that only You can do. Rewire my thinking. Reshape my perspective. Renew the pathways of my mind so that when I wake up, my thoughts are clearer, sharper, and more aligned with the mind of Christ.',
        closing: 'Renew my mind tonight, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Grace',
        verse: 'But he said to me, "My grace is sufficient for you, for my power is made perfect in weakness."',
        verseRef: '2 Corinthians 12:9',
        text: 'God of all grace, I was not perfect today. Not even close. I said things I shouldn\'t have said — words that were too sharp, too careless, too selfish. I failed to do things I should have done — opportunities to love that I walked past, moments to serve that I ignored, chances to speak up that I let slip away in silence. I fell short of the person I want to be, the person I promised You I would be this morning.\n\nBut Your grace — oh, Your grace. It is sufficient. Not just barely enough, like scraping by with the minimum. Abundantly sufficient. Overflowing. More than enough. Your grace doesn\'t just cover my failures; it swallows them whole. Your grace doesn\'t just forgive my sins; it removes them as far as the east is from the west.\n\nThank You that Your love for me is not based on my performance today. If it were, I\'d be in trouble. Thank You that You don\'t keep a scorecard, tallying up my mistakes and holding them against me. Thank You that tomorrow I get to start fresh — completely fresh, not with yesterday\'s failures hanging over me like a cloud.\n\nI get a clean slate not because I earned it, not because today\'s good deeds outweighed my bad ones, but simply because Your mercies are new every morning. Great is Your faithfulness, Lord. Tonight I rest not in my own righteousness, which is like filthy rags, but in the perfect righteousness of Jesus Christ that covers me completely.',
        closing: 'I rest in Your grace, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Peaceful Sleep',
        verse: 'In peace I will lie down and sleep, for you alone, LORD, make me dwell in safety.',
        verseRef: 'Psalm 4:8',
        text: 'God of peace, I bring You my restless mind tonight. The thoughts that spiral outward like an unraveling thread — one worry connecting to another, then another, until the whole thing feels like an impossible knot. The to-do lists that grow longer every time I think about them, each item demanding attention I don\'t have the energy to give. The conversations I replay over and over in my head, wishing I had said something different, something better, something braver.\n\nSilence the noise, Lord. All of it. The external noise — the notifications, the demands, the world that never stops moving and never stops asking for more. And the internal noise — the inner critic that grades my performance, the anxious planner that tries to solve tomorrow\'s problems tonight, the perfectionist that won\'t let me rest until everything is done (and it\'s never done).\n\nTurn off the mental chatter and replace the static with the still, small voice of Your Spirit whispering, "I\'ve got this. You can rest now. Tomorrow\'s problems are already solved in My mind. Tonight, your only job is to sleep."\n\nGive me the deep, restorative sleep that my body and soul desperately need. Not the light, fitful sleep of a worried mind, but the heavy, peaceful, falling-into-Your-arms kind of sleep that comes from truly trusting that the God of the universe is on duty tonight. In peace — real peace, not just the absence of noise but the presence of Your shalom — I lie down.',
        closing: 'In peace I lie down, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer of Praise',
        verse: 'From the rising of the sun to the place where it sets, the name of the LORD is to be praised.',
        verseRef: 'Psalm 113:3',
        text: 'Worthy God, the sun has set on another day, and I want the last words on my lips before I sleep to be words of praise. Not because today was perfect — it wasn\'t. Not because everything went my way — it didn\'t. But because You are perfect, and You are worthy of praise regardless of what kind of day I had.\n\nI praise You for Your faithfulness that never fails. Through every season of my life — the springs of new beginnings and the winters of waiting, the summers of abundance and the autumns of letting go — You have been unwavering. When everything else shifted, You stayed the same.\n\nI praise You for Your love that never ends. Not the conditional, performance-based love the world offers. Your love is fierce, tender, jealous, gentle, relentless, and absolutely unconditional. Nothing I do can make You love me more. Nothing I do can make You love me less. I praise You for Your power that never weakens — the power that flung stars into space and holds atoms together, the power that parted seas and sealed tombs and raised the dead.\n\nI praise You for Your mercy that never runs dry. I have tested it. I have drained it. I have come back to the well a thousand times, and it\'s still flowing. You are magnificent, Lord — magnificent beyond my ability to articulate. My words will never be enough. But tonight, with whatever breath I have left in this day, I lift my voice in praise to the only One who deserves it.',
        closing: 'All glory and honor to You, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Trust',
        verse: 'When I am afraid, I put my trust in you.',
        verseRef: 'Psalm 56:3',
        text: 'Trustworthy God, tonight I choose trust over worry. This is not a passive, easy choice — it\'s an active, deliberate decision to believe what I know about You over what I feel about my circumstances. I don\'t know what tomorrow holds. I don\'t know if the test results will be good. I don\'t know if the job will come through. I don\'t know if the relationship will heal. I don\'t know if the money will be enough. There are so many unknowns.\n\nBut I know who holds tomorrow, and tonight, that is enough. For every uncertainty that makes my stomach tighten, I trust Your sovereignty — You are in control even when everything feels out of control. For every problem that seems to have no solution, I trust Your wisdom — You see angles and possibilities I can\'t even imagine. For every need that remains unmet tonight, I trust Your provision — You who fed a nation in the wilderness and clothed the lilies of the field.\n\nI look back through my life, Lord, and I cannot find a single instance where You failed me. Not one. There were times I thought You were late, but You were right on time. There were times I thought You had forgotten, but You were working behind the scenes. There were times I thought it was over, but You were just beginning.\n\nYou have never failed me — not once, not ever — and You never will. So I go to sleep tonight wrapped in the confidence that the God who holds the universe holds me, and nothing can pry me from His grip.',
        closing: 'I trust You completely, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Perseverance',
        verse: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.',
        verseRef: 'Galatians 6:9',
        text: 'Steadfast God, today was hard. Really hard. I felt like giving up — on my goals that seem to be taking forever, on my dreams that feel increasingly unrealistic, on that situation that never seems to change, on that person who never seems to hear me. The fight feels long, the progress feels painfully slow, and some days I wonder if any of it even matters.\n\nBut You remind me tonight: do not grow weary in doing good. The harvest is coming. It may not be visible yet — seeds don\'t sprout overnight, trees don\'t bear fruit in a day, and the most meaningful things in life take the longest to build. But underneath the surface, where I can\'t see, roots are growing, foundations are being laid, and Your purposes are advancing.\n\nEvery act of obedience today mattered, even the ones that felt pointless. Every prayer was heard, even the ones that felt like they bounced off the ceiling. Every step forward counted, even the tiny ones that felt insignificant. Every tear was noticed, every sacrifice was recorded, every moment of faithfulness was seen by the God who misses nothing.\n\nGive me the perseverance to keep going tomorrow, Lord. Not because I\'m strong, but because You are. Not because the finish line is in sight, but because the One who set the race is trustworthy. Recharge my batteries tonight. Refuel my motivation. Reignite the fire that has grown dim. Help me wake up with fresh determination, trusting that Your timing is perfect and the harvest is worth the wait.',
        closing: 'I will not give up, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Purity',
        verse: 'Create in me a pure heart, O God, and renew a steadfast spirit within me.',
        verseRef: 'Psalm 51:10',
        text: 'Holy God, as I end this day, I ask You to create a pure heart within me. Not repair the old one, but create something new — fresh, clean, unblemished by the stains of today. David prayed this prayer after his deepest failure, and I pray it tonight after mine.\n\nCleanse me from every impure thought that found a home in my mind today — the lustful glance I didn\'t look away from fast enough, the vengeful fantasy I entertained, the jealous comparison I nurtured instead of releasing. Cleanse me from every selfish motive that drove my actions today — the kindness that was really manipulation, the generosity that was really about being seen, the "service" that was really about building my own reputation.\n\nRoot out every hidden sin I\'ve tried to ignore, minimize, or justify. The things I do when no one\'s watching. The content I consume that I would be ashamed to watch with You sitting next to me. The thoughts I entertain that I would never say out loud. Bring it all into Your light, because sin festers in the dark but loses its power in the light.\n\nI don\'t want to carry any of this into tomorrow. Wash me clean, Lord. Make me new. Restore the joy that sin stole from my walk with You. Let me go to sleep tonight with a clear conscience and a clean heart, ready to wake up tomorrow with a fresh start and a steadfast spirit that is firmly rooted in You.',
        closing: 'Create in me a clean heart, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for the Weary',
        verse: 'He gives strength to the weary and increases the power of the weak.',
        verseRef: 'Isaiah 40:29',
        text: 'Sustaining God, I am weary tonight. Weary in body — my muscles ache, my eyes are heavy, and my energy has been completely spent. Weary in spirit — the spiritual battles of life have drained reserves I didn\'t even know I was using. Weary in soul — that deep, existential tiredness that sleep alone can\'t fix, the kind that makes you wonder how long you can keep going at this pace.\n\nSome days the weight of life feels like more than I can carry. The responsibilities stack up like bricks on my shoulders — bills to pay, people to care for, deadlines to meet, relationships to maintain, problems to solve, expectations to fulfill. And I\'m running on fumes, Lord. I have nothing left to give from today.\n\nBut You promise to give strength to the weary and increase the power of the weak. Not add to what I have, but give entirely new strength. Not patch up my depleted reserves, but fill them fresh. You don\'t ask me to find strength within myself; You invite me to find it in You.\n\nSo I come to You empty tonight, knowing that You love to fill empty vessels. You are not disappointed by my weakness — Your power is made perfect in it. I don\'t need to be strong tonight. I don\'t need to have it all together. I just need to rest in the One who is strong for me. Carry me through the night, Lord. Let me sleep deeply, heal completely, and wake up with the kind of strength that can only come from You.',
        closing: 'I lean on Your strength, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Gratitude',
        verse: 'In everything give thanks; for this is the will of God in Christ Jesus for you.',
        verseRef: '1 Thessalonians 5:18',
        text: 'Good Father, before I sleep tonight, let me remember — let me really stop and remember — how good You have been today. Not in a rushed, obligatory way, but with genuine, slow, savoring gratitude.\n\nThank You for the morning light that woke me — golden and warm and full of promise. Thank You for the breath in my lungs all day long, the quiet miracle that I hardly ever think about. Thank You for food on my table — the taste, the nourishment, the simple pleasure of a good meal. Thank You for clean water to drink, a luxury that billions don\'t have.\n\nThank You for people who love me — the ones who texted to check on me, the ones who made me laugh, the ones who prayed for me without being asked. And thank You even for those who challenged me today, because they made me grow in ways that comfort never could. Iron sharpens iron, and difficult people are sometimes Your most effective tools for shaping my character.\n\nThank You for the small mercies I noticed — the unexpected compliment, the parking spot that opened up, the song on the radio that was exactly what I needed to hear. And thank You for the countless mercies I missed entirely — the dangers I was protected from without knowing, the prayers answered in ways I won\'t recognize until later, the grace that was working behind the scenes all day. Today was a gift, Lord. Every single day is. I don\'t ever want to forget that.',
        closing: 'Thank You for everything, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Marriage and Relationships',
        verse: 'Above all, love each other deeply, because love covers over a multitude of sins.',
        verseRef: '1 Peter 4:8',
        text: 'God of love, I lift up my relationships to You tonight — the ones that bring me deepest joy and the ones that cause me the most pain. For those closest to me — my spouse, my family, my dearest friends — help us love each other better. Not the effortless love of good days, but the intentional, sacrificial, choosing-you-even-when-it\'s-hard kind of love that reflects Your own.\n\nHeal any words spoken in haste today. I may have said something thoughtless, something cutting, something I didn\'t mean but can\'t take back. Let the sting of those words fade and let forgiveness do its healing work. Mend any feelings that were bruised — the unintentional slight, the forgotten promise, the moment of inattention that felt like rejection.\n\nGive us the humility to apologize when we\'re wrong — genuinely, without excuses or "I\'m sorry, but..." Give us the grace to forgive when we\'re hurt — quickly, completely, without keeping a running tally. Love covers a multitude of sins, Lord, and tonight I want to throw the blanket of love over every failure, every shortcoming, every imperfection in my relationships.\n\nKnit our hearts together more tightly, Lord. In a world that tears people apart, make my relationships marked by loyalty, depth, vulnerability, and lasting commitment. Let love be the defining mark of every relationship in my life — love that the world notices, wonders about, and ultimately traces back to You.',
        closing: 'Strengthen our bonds of love, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Spiritual Growth',
        verse: 'But grow in the grace and knowledge of our Lord and Savior Jesus Christ.',
        verseRef: '2 Peter 3:18',
        text: 'Lord Jesus, I don\'t want to be the same person I was yesterday. I don\'t want to be stuck, stagnant, or spiritually stale. I want to grow closer to You with every passing day — deeper in understanding, wider in compassion, stronger in faith, more like You in character.\n\nAs I sleep tonight, plant seeds of spiritual growth deep in the soil of my heart. Water what You\'ve already planted. Root out the weeds that choke growth — distraction, apathy, busyness that masquerades as productivity, comfort that masquerades as contentment. Make the soil of my heart soft and receptive to Your Word.\n\nGive me a greater hunger for Your Word — the kind of hunger that makes me reach for my Bible before I reach for my phone. Give me a deeper desire for prayer — not rushed, dutiful prayer, but lingering, intimate, honest conversation with the God of the universe. Give me a stronger love for the people You\'ve placed in my life — not the kind I perform for appearances, but the kind that costs me something and changes someone.\n\nI don\'t want a stagnant faith that looks the same year after year — same depth, same habits, same level of surrender. I want a living, growing, adventurous, sometimes uncomfortable, constantly expanding walk with You. Stretch me, Lord. Challenge me. Take me deeper than I\'ve ever been and higher than I\'ve ever climbed. I want to know You more.',
        closing: 'Grow me in faith, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer Against Anxiety',
        verse: 'Cast all your anxiety on him because he cares for you.',
        verseRef: '1 Peter 5:7',
        text: 'Caring Father, anxiety has been whispering to me all day — and now that the house is quiet and the lights are off, it\'s practically screaming. "What if" and "what about" playing on repeat in my mind like a broken record. What if things don\'t work out? What about that deadline? What if I\'m not good enough? What about that conversation I need to have? The worries feel so heavy tonight, Lord — like actual physical weight pressing down on my chest.\n\nBut You invite me to cast my anxiety on You. Not manage it. Not suppress it. Not analyze it until I find a solution. Cast it. Throw it. Hurl it with everything I\'ve got onto Your strong, broad, more-than-capable shoulders. You are not annoyed by my worries. You are not frustrated by my fears. You genuinely, tenderly, deeply care for me.\n\nSo here they are, Lord. Every single one of them. The big worries about money and health and relationships and purpose. The small worries about tomorrow\'s meeting and next week\'s appointment and that thing someone said that I can\'t stop analyzing. The irrational worries that I know are silly but can\'t shake. The deep worries that I\'ve been carrying so long they feel like part of my identity.\n\nI throw them all onto You right now. All of them. I open my clenched fists, release my white-knuckled grip, and let every last anxiety fall from my hands into Yours. You care for me. You\'ve got this. I can let go now. I can breathe. I can rest.',
        closing: 'I cast my cares on You, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Direction',
        verse: 'Your word is a lamp for my feet, a light on my path.',
        verseRef: 'Psalm 119:105',
        text: 'Guiding God, I don\'t need to see the whole road tonight — just enough light for the next step. And Your Word is that lamp. Not a floodlight that illuminates the entire journey from beginning to end, but a lamp — intimate, close, personal — showing me just enough to take the next faithful step.\n\nI\'ve been struggling with decisions lately, Lord. Big ones and small ones. Career decisions that could change the trajectory of my life. Relational decisions that affect people I love. Daily decisions about how to spend my time, my money, my energy. Some nights I lie awake wondering, "Am I on the right path? Am I doing what You want me to do? Did I miss a turn somewhere?"\n\nBut I choose to trust tonight that You will reveal the path at the right time. Not ahead of schedule to satisfy my impatience. Not behind schedule to test my limits. But right on time, the way You always do. Help me not to rush ahead of You in anxiety or lag behind You in fear, but to walk in perfect step with the Shepherd who leads me beside still waters.\n\nAs I sleep, speak to my heart. Plant seeds of clarity in my subconscious mind. Let Your Spirit work in the quiet hours of the night, untangling the confusion, illuminating the options, confirming the direction. And when I wake with the morning light, let Your wisdom meet me at the first decision of the day and walk with me through every decision until I lay my head down again.',
        closing: 'Light my path, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for the Brokenhearted',
        verse: 'The LORD is close to the brokenhearted and saves those who are crushed in spirit.',
        verseRef: 'Psalm 34:18',
        text: 'Compassionate God, my heart is heavy tonight. It feels like there\'s an actual weight on my chest — the kind of heaviness that makes it hard to breathe, hard to think, hard to believe that anything will ever be okay again. For the pain I carry that I can\'t seem to set down, for the grief that lingers long after everyone else has moved on, for the disappointments that cut so deep they changed me — I need You.\n\nYour Word doesn\'t say You are near to the strong or close to those who have it together. It says You are close to the brokenhearted. That means right now, in this moment of pain, You are closer to me than ever. Not standing at a distance waiting for me to pull myself together. Not disappointed that I\'m still hurting. But right here, right beside me, closer than my own heartbeat.\n\nDraw close to me now, Lord. Sit with me in the sadness. You don\'t need to explain why this happened. You don\'t need to give me a timeline for when the pain will end. You don\'t need to fix everything tonight. Just be here. Sometimes the most powerful thing You do is simply refuse to leave.\n\nCatch my tears — every single one. Your Word says You collect them in a bottle. They matter to You. My pain matters to You. I matter to You. And Your presence tonight — quiet, steady, unwavering — is enough to carry me through the darkness into the light of a new morning.',
        closing: 'Be close to me tonight, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Unity',
        verse: 'How good and pleasant it is when God\'s people live together in unity!',
        verseRef: 'Psalm 133:1',
        text: 'God of peace, there is so much division in the world tonight. Nations are divided against nations, politicians against politicians, races against races, generations against generations. Even within the Church — Your own family — there is division over theology, worship styles, political affiliations, and social issues. It breaks Your heart, Lord, and tonight it breaks mine too.\n\nBring unity where there is division. Not uniformity — You created us different on purpose and our diversity is beautiful. But unity — the ability to disagree without dehumanizing, to hold different perspectives without holding grudges, to love each other fiercely even when we see things differently.\n\nBring understanding where there is judgment. Help me to stop assuming the worst about people who think differently than I do. Help me to listen before I label, to seek to understand before I seek to be understood. Bring love where there is hate. Replace contempt with compassion. Replace hostility with humility. Replace the need to be right with the willingness to be kind.\n\nStart with me, Lord. I can\'t change the world, but I can change how I show up in it. Help me to be a bridge-builder, not a wall-builder. A peacemaker, not a troublemaker. Someone who chooses connection over conflict, unity over division, love over being right. Let unity begin in my own heart, spread to my own home, and ripple outward into every space I occupy.',
        closing: 'Make us one, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Eternal Perspective',
        verse: 'So we fix our eyes not on what is seen, but on what is unseen, since what is seen is temporary, but what is unseen is eternal.',
        verseRef: '2 Corinthians 4:18',
        text: 'Eternal God, the troubles of today felt so big, so urgent, so all-consuming. They dominated my thoughts from morning until now. They demanded my attention, drained my energy, and made me feel like the weight of the world was on my shoulders. But tonight, as the world grows quiet and the noise fades, help me zoom out and see the bigger picture — Your picture.\n\nThis life is a breath, Lord. Beautiful and precious, but brief. A vapor that appears for a little while and then vanishes. Seventy or eighty years in the light of eternity is barely the blink of an eye. The things that stressed me today — the deadlines, the disagreements, the disappointments — most of them will be completely forgotten in a year, much less in a hundred years, much less in a million.\n\nBut some things done today will echo for eternity. The love I showed to that person who needed it. The kindness I offered to a stranger who was silently suffering. The faith I held onto when quitting would have been easier. The prayer I prayed for someone else\'s salvation. Those investments have eternal returns — dividends that will be paying out long after this world has passed away.\n\nHelp me to invest in what lasts forever, Lord. To spend less energy on temporary things and more energy on eternal ones. To worry less about what the world thinks and more about what You think. To pursue less of what fades and more of what remains.',
        closing: 'Fix my eyes on eternity, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Courage for Tomorrow',
        verse: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.',
        verseRef: 'Joshua 1:9',
        text: 'Commander of heaven\'s armies, I confess that tomorrow makes me anxious. Lying here in the dark, my mind is already previewing tomorrow\'s challenges like a movie trailer I didn\'t ask to watch. There are conversations I dread — the difficult ones that I\'ve been putting off, the ones where I have to be honest about something uncomfortable. There are tasks I feel unqualified for — assignments that are beyond my skill level, responsibilities that feel like they belong to someone more capable. There are challenges that seem bigger than me.\n\nBut You don\'t just suggest that I be courageous, Lord — You command it. "Have I not commanded you? Be strong and courageous." This is not optional. And the reason You can command it so confidently is because You\'ve already taken care of the reason for my fear: "for the LORD your God will be with you wherever you go."\n\nNot just in the easy places. Not just when I feel ready. Wherever I go. Into the hard conversation, into the overwhelming project, into the uncertain future, into the valley of the shadow of death — You are there. You have already been there. You have already prepared the way.\n\nSo tonight I lay down my fear, and I pick up courage instead. I will not be afraid of tomorrow, because the God who conquered death will be walking into every challenge with me. When my palms sweat and my voice shakes and my confidence wavers, Your presence will steady me.',
        closing: 'I face tomorrow with courage, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer of Quiet Trust',
        verse: 'Be still, and know that I am God.',
        verseRef: 'Psalm 46:10',
        text: 'Almighty God, I have done enough talking today. Enough doing. Enough striving. Enough managing, organizing, planning, answering, solving, performing, and worrying. I have spent this entire day in motion — physical, mental, emotional — and now I am spent. Now I simply want to be still.\n\nBe still — two of the hardest words in the English language for a culture that glorifies hustle and productivity. We wear our busyness like badges of honor and feel guilty when we rest. But You don\'t say "keep going and know that I am God." You say be still. Stop striving. Cease struggling. Let go.\n\nIn the stillness of this night, with no screens glowing and no voices demanding and no deadlines pressing, I know that You are God. You are on Your throne. You haven\'t left it. You haven\'t been overwhelmed by the crisis du jour. You haven\'t wrung Your hands over the problems that consumed me today. You are in complete, total, unshakeable control.\n\nYou are working all things for my good, even the things that don\'t look good right now. I don\'t need to understand everything tonight — I just need to know You. And I do know You. You are faithful. You are sovereign. You are good. And tonight, that knowledge is more than enough. Be still, my soul. Be still, and know.',
        closing: 'I am still before You. Amen.'
    },
    {
        title: 'A Prayer for Wisdom in Relationships',
        verse: 'Above all, love each other deeply, because love covers over a multitude of sins.',
        verseRef: '1 Peter 4:8',
        text: 'Father, as I lay down tonight I think of the people You have placed in my life — family by blood and family by choice, friends from childhood and friends from just last year, colleagues I see daily and neighbors I barely know. Some of these relationships bring deep joy and laughter and life. Others carry tension, confusion, hurt, and exhaustion. All of them matter to You.\n\nGive me wisdom to love well, Lord. Loving people is the most important and most complicated thing I do, because every person is different and every relationship requires something unique from me. Help me to be patient when patience is the hardest thing in the world — when the same conversation happens for the hundredth time, when the same mistakes are repeated, when progress is measured in millimeters.\n\nHelp me to extend grace when I\'d rather hold a grudge. Grudges feel powerful in the moment, but they\'re really just prison cells I lock myself into while the other person walks free. Free me from the need to punish people with my silence, my distance, or my cold shoulder.\n\nWhere there are broken relationships tonight, begin the healing. Where bridges have been burned, start rebuilding. Where trust has been shattered, begin the slow, painstaking work of restoration. And where there is already love, deepen it — make it richer, more honest, more resilient. Teach me to love the way You love — selflessly, endlessly, without condition, without keeping score, without giving up.',
        closing: 'I entrust my relationships to You tonight, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer of Praise Before Sleep',
        verse: 'Let everything that has breath praise the LORD. Praise the LORD.',
        verseRef: 'Psalm 150:6',
        text: 'Lord God, I don\'t want this day to end without praising You. Not because everything went according to my plan — some things did and some things spectacularly didn\'t. Not because I feel particularly spiritual or joyful tonight — honestly, I\'m tired and just want to sleep. But because You are worthy of praise regardless of my circumstances and regardless of my feelings.\n\nI praise You for who You are: Creator of the stars I see twinkling outside my window tonight — each one placed with precision, each one burning with a glory that speaks Your name. Sustainer of every heartbeat that kept me alive today, every breath that filled my lungs, every synaptic firing in my brain that let me think and feel and love. Redeemer of my broken, messy, complicated story — taking the worst chapters and turning them into testimonies. Friend who sticks closer than a brother, who never gets tired of me, never rolls His eyes at my prayers, never says "not now, I\'m busy."\n\nYou are magnificent, Lord. Majestic. Awesome in the truest sense of the word — not the watered-down version we use for pizza and movies, but the jaw-dropping, knee-buckling, heart-racing kind of awesome that made Moses hide his face, that made Isaiah cry "woe is me," that made John fall down as though dead.\n\nMy words tonight will never be enough to capture Your glory. But they\'re all I\'ve got. So with whatever breath I have left before sleep takes me, I praise You. I praise You. I praise You.',
        closing: 'All praise and glory to You, now and forever, Amen.'
    },
    {
        title: 'A Prayer for Contentment Tonight',
        verse: 'I have learned to be content whatever the circumstances.',
        verseRef: 'Philippians 4:11',
        text: 'Lord, as I close my eyes tonight, I confess that comparison and discontent have crept into my heart like uninvited guests. I scrolled through social media today and saw what others have — their beautiful homes, their seemingly perfect families, their career milestones, their exotic vacations, their picture-perfect lives — and a quiet voice whispered, "You\'re behind. You\'re not enough. You should have more by now."\n\nForgive me, Father. That voice is not Yours. Your voice says "I am with you." Your voice says "I will provide." Your voice says "My grace is sufficient." The world measures abundance by accumulation, but You measure it by gratitude. And tonight I want to measure my life by Your standard, not the world\'s.\n\nSo here is my inventory of gratitude: I have breath in my lungs, a roof over my head, food in my stomach, and a God who knows my name and calls me His own. I have people who love me — imperfectly, yes, but genuinely. I have purpose, even if I can\'t always see it clearly. I have hope, even when the road is hard. I have salvation, the greatest gift ever given, bought with the most precious price ever paid.\n\nPaul said he learned contentment. It wasn\'t automatic; it was a discipline, a choice, a practice. Tonight I am practicing. I choose to be grateful for exactly where I am, exactly what I have, and exactly who You\'ve made me to be. Enough striving. Enough comparing. Enough scrolling and wishing and envying. You are enough, and because You are mine, I have enough.',
        closing: 'I am content in You, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Troubled Dreams',
        verse: 'When you lie down, you will not be afraid; when you lie down, your sleep will be sweet.',
        verseRef: 'Proverbs 3:24',
        text: 'Father, sometimes my nights are haunted by anxious dreams, nightmares, and restless thoughts that replay the day\'s troubles on an endless loop. My mind won\'t turn off. It\'s like a television stuck on a channel I can\'t change — replaying failures, rehearsing fears, projecting worst-case scenarios. My body is exhausted but my brain is wired, and the harder I try to relax, the more tense I become.\n\nI\'ve had nights where I woke up in a cold sweat, heart pounding, from dreams that felt more real than reality. Nights where shadows seemed to press in and the darkness felt heavy and oppressive. Nights where I dreaded closing my eyes because I didn\'t know what my subconscious mind would conjure up. Those nights are exhausting, Lord, and they steal the rest that my body and soul so desperately need.\n\nBut You are the God who neither slumbers nor sleeps. While I rest, You watch. While I dream, You guard. While my conscious mind shuts down, You stand sentinel over my unconscious mind. No nightmare is beyond Your authority. No anxious thought can survive in the presence of Your peace. No dark dream can persist when the Light of the World is standing in my room.\n\nI claim Your promise of sweet sleep tonight, Father. I command every anxious thought to be still in the name of Jesus. I reject every fearful image and every tormenting dream. Fill my mind with Your peace instead of fear, with visions of hope instead of dread, with the calm assurance that I am held by hands that spoke the universe into existence. I am not afraid, because You are here — right here, closer than the pillow beneath my head.',
        closing: 'Grant me sweet and peaceful sleep, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for My Spouse',
        verse: 'Two are better than one, because they have a good return for their labor.',
        verseRef: 'Ecclesiastes 4:9',
        text: 'Lord, I lift up my partner to You tonight — this person You placed beside me, this imperfect, beautiful, frustrating, wonderful gift from Your hand. Marriage is hard, Lord. Nobody warned us it would be this hard. Or maybe they did, but we didn\'t believe them because we were too in love to imagine that love alone wouldn\'t be enough. We\'ve learned that love is a choice, not just a feeling — and some days that choice is harder than others.\n\nForgive us for the ways we hurt each other today, knowingly or unknowingly. The sharp word spoken in the heat of the moment. The eye roll that communicated more contempt than a paragraph ever could. The silent treatment that built walls between two hearts that were meant to be open to each other. The failure to really listen — to hear not just the words but the heart behind them.\n\nRenew our love, Lord. Not the butterflies-in-the-stomach love of our early days — though that was beautiful — but a deeper, stronger, more resilient love that has been tested by fire and emerged as gold. A love that says "I choose you" on the days when choosing is easy and on the days when it\'s the hardest thing in the world. A love that covers offenses instead of cataloguing them, that assumes the best instead of the worst, that builds up instead of tearing down.\n\nDeepen our friendship. Help us to laugh together more, to play together more, to dream together more. Reignite our commitment to each other and to You. Help us to fight for each other rather than against each other — to see each other as teammates, not opponents. And as we sleep tonight, let Your love be the glue that holds us together, stronger than any force that tries to tear us apart.',
        closing: 'Strengthen our marriage, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Single Season',
        verse: 'Delight yourself in the LORD, and he will give you the desires of your heart.',
        verseRef: 'Psalm 37:4',
        text: 'Father, tonight the silence of being single feels especially loud. The empty chair at the dinner table. The quiet apartment where no one asks about my day. The long evenings that stretch out with no one to share them. The couples I see everywhere — holding hands at the grocery store, laughing together at restaurants, posting anniversary photos online — each one a gentle reminder of what I don\'t have.\n\nYou see it all, Lord. You see the longing that I sometimes hide behind a brave face and a smile that says "I\'m fine." You see the nights when the loneliness sits on my chest like a weight and I wonder if this season will ever end. You see the secret prayers I pray — the ones I\'m almost embarrassed to admit, the ones where I ask You for someone to love and be loved by.\n\nHelp me to trust Your timing, Father. Your timing is not my timing, and Your plan is not my plan, but Your timing is perfect and Your plan is good. You are not withholding anything good from me — You are preparing something good for me. Or perhaps You are preparing me for something good. Either way, this waiting is not wasted.\n\nFill the lonely spaces with Your presence tonight. Remind me that I am not incomplete without a partner — I am complete in You. Use this season to grow me, shape me, deepen me, and prepare me for whatever is ahead. And whether You bring a partner who will walk beside me or call me to serve You in the unique freedom of singleness, let me find my deepest fulfillment, my truest joy, my most satisfying love in You alone.',
        closing: 'You are my heart\'s true desire, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Those Grieving',
        verse: 'Blessed are those who mourn, for they will be comforted.',
        verseRef: 'Matthew 5:4',
        text: 'Comforter God, tonight I pray for those who are grieving — and grief takes so many forms. There are those who lost a loved one recently — the wound is fresh, the shock is raw, and the absence feels like a physical ache in their chest. The empty side of the bed. The phone call they almost made before remembering. The place setting they unconsciously laid before catching themselves. Every room holds a memory. Every quiet moment invites a flood of tears.\n\nThere are those whose grief has lingered for years — the world has moved on but they haven\'t, and people have stopped asking how they\'re doing because everyone assumes they should be "over it" by now. But grief doesn\'t have an expiration date, and some losses leave marks that last a lifetime. The anniversary of the death, the birthday that will never be celebrated again, the holidays that will never feel quite the same.\n\nAnd there are those mourning losses the world doesn\'t always recognize — a dream that died, a relationship that ended, a career that was lost, a diagnosis that changed everything, a friendship that faded away, a miscarriage that stole a life before it had a chance to begin. These griefs are no less real and no less devastating.\n\nBe close to the brokenhearted tonight, Lord. You are near to them — Your Word says so, and I believe it. Let them feel Your arms around them in the darkness like a parent holding a weeping child. Remind them that their grief is not a sign of weakness but a testament to how deeply they loved. Sit with them in the silence. Don\'t rush them through their pain. And comfort them in ways that only You can — with a peace that defies logic, a presence that fills the emptiness, and a hope that whispers: this is not the end of the story.',
        closing: 'Comfort those who mourn tonight, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer of Repentance',
        verse: 'If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness.',
        verseRef: '1 John 1:9',
        text: 'Holy God, I come before You tonight with a heavy heart, weighed down by the baggage of my own failures. I sinned today. Maybe it was a harsh word that flew out of my mouth before my brain could catch it — a verbal grenade that detonated in someone\'s heart and left shrapnel I can\'t remove. Maybe it was a lustful glance that I excused as harmless but that dishonored You and the person I objectified. Maybe it was a selfish decision that prioritized my comfort over someone else\'s need. Maybe it was a lie — small by the world\'s standards but devastating by Yours, because every lie is a tiny act of rebellion against the God of Truth.\n\nI don\'t make excuses tonight, Lord. I don\'t explain it away. I don\'t minimize it. I don\'t compare myself to others who seem worse. I simply confess: I sinned. I fell short. I missed the mark. Again. And it grieves me because I know it grieves You. Not because You\'re an angry judge keeping score, but because You\'re a loving Father who knows that sin hurts me, that it poisons my relationships, that it erodes my character, that it separates me from the fullness of life You designed for me.\n\nBut oh, the power of confession! When I drag my sin into the light, it loses its power. When I name it honestly before You, the shame loses its grip. Because Your faithfulness and Your justice meet at the cross — the place where my sin was punished in Christ so that I could be pardoned. You don\'t just overlook my sin; You deal with it completely, permanently, finally.\n\nCleanse me tonight, Father. Purify me from the inside out. Not just my behavior but my desires, my thought patterns, my motivations, the hidden corners of my heart where sin likes to hide. Give me a fresh start. In the morning, let me wake up clean — not because I deserve it, but because the blood of Jesus covers everything.',
        closing: 'I receive Your forgiveness tonight, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Workers of the Night',
        verse: 'The LORD watches over you — the LORD is your shade at your right hand.',
        verseRef: 'Psalm 121:5',
        text: 'Lord, while I prepare for sleep — adjusting my pillow, pulling up my blankets, settling into the comfort of my bed — many are just starting their shifts. Nurses walking the sterile hallways of hospitals, checking on patients in the quiet hours when illness feels most frightening and loneliness most acute. Police officers patrolling dark streets, never knowing what the next call will bring, carrying the weight of a community\'s safety on their shoulders. Firefighters sleeping in shifts at the station, boots ready beside the bed, ears tuned to the alarm that could sound at any moment.\n\nTruck drivers navigating miles of highway through the night, fighting fatigue to deliver the goods we take for granted every morning. Factory workers on third shift, performing repetitive tasks in fluorescent light while the rest of the world dreams. Emergency room doctors making life-and-death decisions at 3 AM with tired eyes and steady hands. Security guards sitting in quiet lobbies, watching empty screens, present so that others can be absent and safe. Janitors cleaning the buildings we\'ll fill tomorrow, doing invisible work that makes civilization possible.\n\nWatch over every one of them tonight, Lord. Keep them alert when drowsiness threatens. Keep them safe when danger approaches. Sustain their energy through the long hours and protect their health from the toll that night work takes on the body and mind. Comfort their families who sleep without them — the spouses who reach across the bed and find it empty, the children who eat breakfast with a parent who just got home and is too tired to talk.\n\nBless the hands that serve while the world sleeps. Remind them that their work matters, that they are seen, that they are valued, and that You — the God who never sleeps — are watching over them through every dark hour until morning comes.',
        closing: 'Protect the night workers, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Letting Go',
        verse: 'Cast all your anxiety on him because he cares for you.',
        verseRef: '1 Peter 5:7',
        text: 'Father, I\'ve been carrying burdens that were never mine to carry. I picked them up somewhere along the way — worry about tomorrow that I grabbed off the shelf of "what if." Regret about yesterday that I\'ve been lugging around like a suitcase I refuse to set down. Anxiety about things I cannot control that I\'ve strapped to my back like a pack that gets heavier with every step. Guilt about mistakes that were forgiven long ago but that I keep retrieving from the trash like discarded mail I can\'t stop rereading.\n\nMy arms are full, Lord. My back is breaking. My spirit is crushed under the weight of things that You never asked me to carry. You said "cast" — not gently set down, not carefully place, not tentatively release — cast. Throw. Hurl. Launch every single one of these burdens onto Your more-than-capable shoulders with the full force of my trust.\n\nSo tonight I open my clenched fists — fists that have been white-knuckling control, gripping outcomes, clutching plans that aren\'t working — and I let it all go. The worry about my finances: gone. The anxiety about my health: released. The fear about my children\'s future: surrendered. The regret about the road not taken: dropped. The guilt about the mistakes I\'ve already confessed: cast away.\n\nYou care for me, Lord — not casually, not professionally, not the way a stranger cares about news from a faraway country. You care for me deeply, tenderly, personally, relentlessly, passionately. You care for me the way a father cares for his firstborn child. I don\'t need to hold onto these things anymore. You\'ve got them. You\'ve got me. And I can finally, finally rest.',
        closing: 'I let go and trust You completely, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for My Parents',
        verse: 'Honor your father and your mother, so that you may live long in the land the LORD your God is giving you.',
        verseRef: 'Exodus 20:12',
        text: 'Lord, I pray for my parents tonight — whether they are near or far, whether our relationship is close or complicated, whether they are living or have gone to be with You. Whatever the situation, they are part of my story, woven into the very fabric of who I am, and tonight I lift them before Your throne.\n\nThank You for the gift of life they gave me. Before I drew my first breath, they were already making sacrifices for me. Before I could speak my first word, they were already worrying about my future. They fed me when I was hungry, held me when I was scared, stayed up when I was sick, and cheered for me when I succeeded. They weren\'t perfect — no parent is — but they gave what they had, and what they had was more than I often acknowledged.\n\nForgive me for the times I\'ve taken them for granted, Lord. For the phone calls I didn\'t make, the visits I postponed, the "thank you" I forgot to say, the wisdom I dismissed because I thought I knew better. Forgive me for the seasons of my life when I focused on their failures and forgot their faithfulness, when I catalogued their mistakes and ignored their sacrifices.\n\nBless them tonight with health — strength in their bones, clarity in their minds, vitality in their spirits. Bless them with peace — freedom from worry about their children, rest from the labors of a lifetime, assurance that they did enough, that they were enough. Bless them with joy — laughter that comes easily, moments of delight that catch them off-guard, the deep satisfaction of seeing their family grow. If there are wounds between us, begin the healing tonight. And if they don\'t know You yet, draw them to Yourself with cords of love so tender and so persistent that they cannot resist.',
        closing: 'Bless my parents tonight, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer Against Temptation',
        verse: 'No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear.',
        verseRef: '1 Corinthians 10:13',
        text: 'Faithful God, I faced temptation today — some I resisted, some I didn\'t. And I\'m being honest about both because You already know. The pull of sin is strong, Lord — stronger than I like to admit. It\'s not always the big, dramatic, obvious sins that get me. More often it\'s the subtle ones — the small compromises that seem harmless in the moment, the gradual erosion of standards that happens so slowly I barely notice until I look back and realize how far I\'ve drifted.\n\nMy flesh is weak, but You are faithful. You promise that no temptation will overtake me that is beyond what I can bear — which means every temptation I faced today, even the ones I fell to, was one I could have resisted. There was a way of escape that I either didn\'t see or chose to ignore. That\'s both humbling and empowering, because it means tomorrow can be different.\n\nTonight I ask for strength to resist tomorrow\'s temptations before they even arrive. Help me to identify the triggers — the situations, the environments, the people, the emotional states, the thought patterns that make me most vulnerable. Help me to build hedges of protection before the enemy attacks, not after. Help me to flee from sin rather than flirt with it, because I\'ve learned the hard way that I cannot play with fire and not get burned.\n\nAnd when temptation comes — because it will come, as surely as morning follows night — show me the way of escape You have already prepared. Open my eyes to see the exit sign when the room starts closing in. Give me the courage to run toward it, even when running feels like losing, even when standing firm means standing alone.',
        closing: 'Keep me from temptation, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for God\'s Word',
        verse: 'Your word is a lamp for my feet, a light on my path.',
        verseRef: 'Psalm 119:105',
        text: 'Lord, as I reflect on this day, I realize how much I need Your Word — not as an obligation to check off my spiritual to-do list, not as a religious duty performed out of guilt, but as a lifeline thrown to a drowning soul. Your Word is the lamp I need when the path ahead feels impossibly dark, when I can\'t see even one step in front of me, when confusion and doubt have swallowed every landmark I used to navigate by.\n\nForgive me for the days I neglect Your Scripture, Lord. The days I told myself I was too busy, too tired, too distracted. The days I scrolled social media for an hour but couldn\'t find five minutes for the Bible. The days I filled my mind with the world\'s noise and then wondered why Your voice seemed distant. No wonder I felt lost — I left my lamp at home and tried to walk in the dark.\n\nReignite my hunger for the living Word, Father. Let me crave it the way a starving person craves bread, the way a thirsty traveler craves water, the way a cold and shivering soul craves fire. Help me to read it not just with my eyes but with my heart — to let every verse penetrate past my intellect and sink deep into my spirit where transformation happens. Let me encounter You in its pages, not just information about You.\n\nAs I sleep tonight, let the verses I\'ve read take root deep in my soul like seeds planted in rich soil. Water them with Your Spirit while I rest. And in the morning, let them begin to sprout — bearing fruit I can\'t yet imagine, producing harvests I didn\'t plan, growing a garden of wisdom and truth and life in the soil of my heart.',
        closing: 'Your Word is my light, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for the Persecuted Church',
        verse: 'Blessed are those who are persecuted because of righteousness, for theirs is the kingdom of heaven.',
        verseRef: 'Matthew 5:10',
        text: 'Lord Jesus, tonight I remember my brothers and sisters around the world who face persecution for their faith — and I am convicted by their courage. There are believers right now sitting in prison cells for the crime of owning a Bible — the same Bible I have a dozen copies of, the same Bible I sometimes leave gathering dust on my nightstand. There are Christians being beaten, tortured, and killed for attending church — the same church attendance I sometimes skip because I\'m tired or it\'s raining.\n\nThere are families torn apart because one member chose to follow You — sons and daughters disowned by their parents, husbands and wives divorced by their spouses, all because they confessed with their mouths that Jesus is Lord. In some countries, baptism is a death sentence. In some communities, a conversion to Christianity means losing everything — home, family, livelihood, and sometimes life itself.\n\nStrengthen them with supernatural courage tonight, Lord. The kind of courage that makes no earthly sense — the courage of Stephen who looked up and saw heaven opened while stones crushed his body. The courage of Paul and Silas who sang hymns at midnight in a prison cell. The courage of the early church that grew fastest precisely when persecution was fiercest.\n\nProvide for their needs — food, shelter, medical care, legal defense. Protect their families, especially the children who don\'t understand why their parent has been taken away. And use their suffering to multiply the gospel in ways that seem impossible — let the blood of the martyrs continue to be the seed of the church, just as it has been for two thousand years. I am humbled and ashamed by their sacrifice, Lord, and I pray that if I am ever called upon to suffer for Your name, I would have even a fraction of their courage.',
        closing: 'Strengthen the persecuted church, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Tomorrow\'s Decisions',
        verse: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.',
        verseRef: 'James 1:5',
        text: 'Wise God, tomorrow I will face decisions — some so small I won\'t even notice I\'m making them, and some so significant they could change the trajectory of my life. The small ones matter too, Lord, because character is built in the accumulation of tiny choices made when no one is watching. But the big ones feel overwhelming tonight, and I\'m anxious about getting them wrong.\n\nI don\'t want to lean on my own understanding tomorrow. My understanding is limited — I can only see what\'s in front of me, only process the information I have, only predict outcomes based on my flawed human logic. But You see the end from the beginning. You know which path leads to flourishing and which leads to ruin. You can see around corners I can\'t even see yet.\n\nSo I ask for wisdom tonight, Lord — and I love that Your Word says You give it generously, without finding fault. You don\'t roll Your eyes and say "You should know this by now." You don\'t sigh and say "Didn\'t I already answer this?" You give wisdom generously, abundantly, lavishly, to anyone who asks, without making them feel stupid for asking.\n\nAs I sleep tonight, work in my subconscious mind. Bring clarity where there is confusion, conviction where there is doubt, and peace where there is anxiety. Untangle the knotted thoughts that my conscious mind couldn\'t sort out today. And when I wake up tomorrow morning, let Your wisdom meet me at the very first decision of the day and walk with me through every choice until I lay my head down again.',
        closing: 'Guide my decisions, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer of Childlike Faith',
        verse: 'Truly I tell you, unless you change and become like little children, you will never enter the kingdom of heaven.',
        verseRef: 'Matthew 18:3',
        text: 'Papa God, I\'ve made faith too complicated. Somewhere along the way, I turned it into a theological system to be mastered, a set of doctrines to be debated, a performance to be graded, a list of rules to be followed. I\'ve analyzed and systematized and over-thought this relationship until it barely resembles a relationship at all. Tonight I want to strip it all back and pray like a child — simply, honestly, trustingly, with the kind of faith that doesn\'t need footnotes.\n\nI love You, God. That\'s where it starts and that\'s where it ends. Not because I\'ve figured You out — I haven\'t and I never will. Not because I understand everything about You — I understand barely a fraction. But because You\'re my Father and I\'m Your child, and children don\'t need systematic theology to love their fathers. They just do.\n\nThank You for today. For the sunshine and the rain, for the laughter and the tears, for the moments that felt magical and the moments that felt heavy. Thank You for being there through all of it, whether I noticed or not. I\'m sorry for the bad things I did today — the unkind words, the selfish choices, the moments when I forgot about You completely. I don\'t have fancy theological language for it. I\'m just sorry.\n\nPlease take care of tomorrow because honestly, I can\'t. I\'ve tried and I\'m terrible at it. Every time I try to control tomorrow, it slips through my fingers like sand. So I\'m giving it to You because You\'re better at it. And please be close to me tonight because the dark sometimes scares me — not the literal dark, but the darkness of uncertainty, of loneliness, of fear. Just be close. That\'s all I need.',
        closing: 'I trust You like a child trusts their father, Amen.'
    },
    {
        title: 'A Prayer for Unfulfilled Promises',
        verse: 'For no matter how many promises God has made, they are "Yes" in Christ.',
        verseRef: '2 Corinthians 1:20',
        text: 'Faithful God, there are promises You\'ve made — in Your Word and whispered to my heart in quiet moments — that haven\'t come to pass yet. The vision You gave me years ago that still looks nothing like my reality. The calling You placed in my heart that seems further away now than when You first spoke it. The assurance You gave me about a situation that has only gotten worse since I started praying about it. The waiting is hard, Lord. Really, relentlessly, achingly hard.\n\nSome nights, doubt creeps in like fog and whispers terrible lies: You\'ve forgotten. You changed Your mind. You didn\'t really promise that — you just imagined it. Maybe you misheard. Maybe you\'re not special enough to receive what God promised. These whispers are poison, and some nights I\'m too tired to fight them.\n\nBut tonight I fight. Tonight I remember that You have never broken a promise. Not once. Not ever. Not in all of human history. Abraham waited 25 years for Isaac. Joseph waited 13 years in slavery and prison before the throne. The Israelites waited 400 years in Egypt. David waited over a decade between his anointing and his coronation. And every single one of those promises was fulfilled — fully, completely, abundantly beyond what they imagined.\n\nEvery promise You make is yes and amen in Christ. Not maybe. Not probably. Not "we\'ll see." Yes. Tonight I choose to believe that what You started, You will finish. What You promised, You will deliver. My job is to wait and trust. Your job is everything else. And Lord, You have never failed at Your job.',
        closing: 'I trust Your promises, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for the Addicted',
        verse: 'So if the Son sets you free, you will be free indeed.',
        verseRef: 'John 8:36',
        text: 'Deliverer God, tonight I pray for those trapped in the suffocating grip of addiction — alcohol that promises relief but delivers destruction. Drugs that offer a temporary escape from pain but create a permanent prison of dependence. Pornography that counterfeits intimacy while poisoning the capacity for real connection. Gambling that dangles hope while stealing everything of value. Food, screens, shopping, work — even good things twisted into chains when they become the thing we cannot live without.\n\nThey feel powerless tonight, Lord. Powerless against the cravings that hijack their brain chemistry and override their willpower. Powerless against the shame that follows every relapse, the shame that whispers "you\'ll never change, you\'re too far gone, why even try." Powerless against the isolation that addiction creates — the secrets, the lies, the pushing away of the very people who could help. They are alone in their darkness, and the darkness feels absolute.\n\nBut You are the God who breaks chains that no human power can break. No addiction is stronger than the One who spoke the universe into existence. No craving can overpower the God who parted the Red Sea. No dependency can outlast the relentless, pursuing love of a Savior who went to the cross to set captives free.\n\nMeet them in their darkest moment tonight — the moment when they\'re standing at the edge, the moment when the next drink or the next hit or the next click feels inevitable. Step into that moment with power, Lord. Give them the courage to ask for help, even though asking feels like admitting defeat. Surround them with people who will love them fiercely without enabling them — people who will hold boundaries while holding them close. Set them free — truly, completely, permanently free — by the power of Your Son, who promised that those He sets free are free indeed.',
        closing: 'Break every chain, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Eternal Perspective',
        verse: 'For our light and momentary troubles are achieving for us an eternal glory that far outweighs them all.',
        verseRef: '2 Corinthians 4:17',
        text: 'Eternal God, today\'s troubles felt anything but light and momentary. They felt heavy — crushingly, suffocatingly, unbearably heavy. They felt like they would last forever — like the darkness would never lift, like the pain would never ease, like the situation would never change. Paul calls them "light and momentary," and with all due respect to the apostle, tonight that feels like the understatement of the century.\n\nBut Paul knew something I need to remember tonight. He knew that perspective changes everything. The same problem that feels enormous when viewed through the lens of today shrinks to almost nothing when viewed through the lens of eternity. A thousand years from now, the thing that consumed me today will be less than a footnote in the grand story You are writing. A million years from now, this entire lifetime will feel like a single heartbeat in the endless rhythm of forever.\n\nYou see what I can\'t, Lord — the eternal glory being woven through my suffering like gold thread through dark fabric. The story being written through my struggles that will one day make sense in ways I can\'t possibly understand right now. You\'re not wasting my pain. You\'re not ignoring my tears. You\'re using every one of them as raw material for something magnificent, something that will far outweigh the cost.\n\nGive me that eternal perspective tonight, Father. Help me to see today\'s problems through the lens of forever. One day, every tear will be wiped away. Every wrong will be made right. Every sacrifice will be rewarded beyond imagination. Every pain will be healed. Every question will be answered. And every moment of suffering will be revealed as a brushstroke in a masterpiece painted by the greatest Artist who ever lived. Until that day, I hold on — not to my circumstances, but to You.',
        closing: 'I fix my eyes on eternity, in Jesus\' name, Amen.'
    },
    {
        title: 'A Prayer for Unspoken Needs',
        verse: 'Before they call I will answer; while they are still speaking I will hear.',
        verseRef: 'Isaiah 65:24',
        text: 'All-knowing God, there are needs in my heart tonight that I can\'t even put into words. Language is failing me right now. The burdens are too deep for sentences, too complex for paragraphs, too heavy for any combination of words I know. They sit in my chest like stones — real, solid, undeniable — but when I open my mouth to describe them, nothing comes out that captures what I actually feel.\n\nThere are hopes too fragile to speak aloud, Lord — dreams so tender that saying them out loud feels like it might jinx them, or worse, expose them to the harsh light of reality where they\'ll wither and die. There are fears I\'m too ashamed to name — fears that seem irrational when I try to articulate them but feel absolutely paralyzing when they grip me in the dark. There are longings so personal that sharing them with anyone — even You — feels impossibly vulnerable.\n\nBut You hear what I cannot say. You know the prayer behind my prayer — the real request hiding underneath the words I manage to fumble out. You understand the groan of my spirit even when my lips are silent, because Your Spirit intercedes for me with groanings too deep for words. You don\'t need me to explain. You don\'t need me to be articulate. You don\'t need a well-crafted prayer with proper structure and theological precision.\n\nSo tonight, I simply sit in Your presence and let You read my heart like an open book. Every page, every chapter, every margin note, every crossed-out line, every tear stain. You already know what\'s written there. You already care about every word. And You are already working on answers to prayers I haven\'t even figured out how to pray yet. That is the most comforting truth I know tonight.',
        closing: 'You know my heart, Lord. I rest in that tonight, Amen.'
    },
    {
        title: 'A Prayer of Final Surrender',
        verse: 'Into your hands I commit my spirit; deliver me, LORD, my faithful God.',
        verseRef: 'Psalm 31:5',
        text: 'My faithful God, this day is done. Completely, irreversibly, finally done. I cannot add one more minute to it, cannot undo a single moment, cannot replay a single conversation with different words. Whatever was accomplished today — the victories, the breakthroughs, the small kindnesses, the quiet moments of faithfulness — I offer them to You as imperfect gifts from imperfect hands. Whatever was left undone — the unfinished tasks, the unanswered emails, the unchecked boxes, the goals that remain just out of reach — I release them into Your hands without guilt, without shame, without the nagging feeling that I should have done more.\n\nInto Your hands I commit my spirit tonight. These are the same hands that formed Adam from dust and breathed him to life. The same hands that parted the Red Sea and carved commandments in stone. The same hands that were pierced with nails on a Friday and raised in triumph on a Sunday. There are no safer hands in all of existence, and tonight I place everything I am and everything I have into them.\n\nMy worries — into Your hands. My hopes — into Your hands. My loved ones — into Your hands. My tomorrow with all its unknowns — into Your hands. My very life, every breath of it, from this moment until my last — into Your hands. You are faithful. You have always been faithful. You will always be faithful. You are good — good when I can see it and good when I can\'t. You are sovereign — in control of galaxies and atoms and everything in between, including the details of my small but precious life.\n\nAs my eyes close, I am held — held by everlasting arms that never tire, never weaken, never let go. As my body rests, my soul rests in You — the only true resting place, the only shelter that never fails, the only home that lasts forever. This day belongs to You now, Lord. And so do I. Completely, utterly, joyfully Yours.',
        closing: 'Into Your hands I commit everything, Amen.'
    },
    {
        title: 'A Prayer for Strength to Forgive',
        verse: 'Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you.',
        verseRef: 'Colossians 3:13',
        text: 'Merciful Father, tonight there is someone I need to forgive — and honestly, I don\'t want to. Every fiber of my being resists it. The hurt is real — not imagined, not exaggerated, not something I\'m being oversensitive about. What they did was wrong. The wound is deep — it hit me in a place that was already tender, in a way that felt calculated to cause maximum damage. And forgiveness feels like letting them off the hook, like saying what they did was okay, like handing them a Get Out of Jail Free card they don\'t deserve.\n\nBut then I look at the cross, Lord, and I lose my argument. You forgave me everything. The debt I owed was not just large — it was infinite, unpayable, a sum so staggering that a million lifetimes of perfect behavior couldn\'t put a dent in it. And You cancelled it. Completely. Permanently. You didn\'t hold 10% back. You didn\'t say "I\'ll forgive you but I\'ll never forget." You separated my sins from me as far as the east is from the west and threw them into the depths of the sea.\n\nHow can I withhold forgiveness from someone else when I\'ve been forgiven so much? How can I demand payment from a fellow servant when the King has forgiven my debt of billions? The math doesn\'t work. The logic doesn\'t hold. My refusal to forgive is indefensible in light of Your grace.\n\nI don\'t have the strength to do this on my own, Lord — but Your Spirit in me does. Forgiveness is not a feeling; it\'s a decision, and tonight I make that decision. I choose to begin the process of forgiveness. Not because they deserve it — they don\'t, just as I don\'t deserve Yours. Not for their sake — but because unforgiveness is a prison, and I\'ve been living in a cell of bitterness long enough. You came to set captives free, and tonight I want to walk out of this prison and leave the door open behind me.',
        closing: 'I choose to forgive as You forgave me, in Jesus\' name, Amen.'
    }
];

let prayerTimerInterval = null;
let prayerTimerSeconds = 120;
let prayerTimerRunning = false;
let currentPrayerTime = 'morning';

function initializePrayer() {
    const today = new Date().toDateString();
    const hour = new Date().getHours();

    // Auto-select morning (before 5pm) or evening
    currentPrayerTime = hour < 17 ? 'morning' : 'evening';

    updatePrayerToggle();
    renderPrayer();
    initializePrayerControls();
    updatePrayerStreak();
}

function updatePrayerToggle() {
    document.querySelectorAll('.prayer-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.time === currentPrayerTime);
    });
}

function getPrayerForToday(time) {
    const dayOfYear = getDayOfYear();
    const prayers = time === 'morning' ? MORNING_PRAYERS : EVENING_PRAYERS;
    return prayers[dayOfYear % prayers.length];
}

function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function renderPrayer(specificPrayer) {
    const prayer = specificPrayer || getPrayerForToday(currentPrayerTime);

    const label = currentPrayerTime === 'morning' ? '🌅 Morning Prayer' : '🌙 Evening Prayer';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    document.getElementById('prayer-time-label').textContent = label;
    document.getElementById('prayer-date').textContent = today;
    document.getElementById('prayer-title').textContent = prayer.title;
    document.getElementById('prayer-verse').textContent = `"${prayer.verse}"`;
    document.getElementById('prayer-verse-ref').textContent = `— ${prayer.verseRef}`;
    document.getElementById('prayer-text').textContent = prayer.text;
    document.getElementById('prayer-closing').textContent = prayer.closing;

    // Reset timer
    resetPrayerTimer();
}

function initializePrayerControls() {
    // Time toggle
    document.querySelectorAll('.prayer-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPrayerTime = btn.dataset.time;
            updatePrayerToggle();
            renderPrayer();
        });
    });

    // Timer
    const timerBtn = document.getElementById('prayer-timer-btn');
    timerBtn.addEventListener('click', togglePrayerTimer);

    // Copy
    document.getElementById('prayer-copy-btn').addEventListener('click', copyPrayer);

    // Share
    document.getElementById('prayer-share-btn').addEventListener('click', sharePrayer);

    // Another prayer
    document.getElementById('prayer-new-btn').addEventListener('click', () => {
        const prayers = currentPrayerTime === 'morning' ? MORNING_PRAYERS : EVENING_PRAYERS;
        const randomIndex = Math.floor(Math.random() * prayers.length);
        renderPrayer(prayers[randomIndex]);
    });
}

function togglePrayerTimer() {
    const btn = document.getElementById('prayer-timer-btn');

    if (prayerTimerRunning) {
        // Stop
        clearInterval(prayerTimerInterval);
        prayerTimerRunning = false;
        btn.textContent = 'Resume';
        btn.classList.remove('running');
        return;
    }

    if (prayerTimerSeconds <= 0) {
        resetPrayerTimer();
        return;
    }

    // Start / Resume
    prayerTimerRunning = true;
    btn.textContent = 'Pause';
    btn.classList.add('running');
    btn.classList.remove('finished');

    prayerTimerInterval = setInterval(() => {
        prayerTimerSeconds--;
        updateTimerDisplay();

        if (prayerTimerSeconds <= 0) {
            clearInterval(prayerTimerInterval);
            prayerTimerRunning = false;
            btn.textContent = 'Restart';
            btn.classList.remove('running');
            btn.classList.add('finished');
            completePrayer();
        }
    }, 1000);
}

function resetPrayerTimer() {
    clearInterval(prayerTimerInterval);
    prayerTimerRunning = false;
    prayerTimerSeconds = 120;
    updateTimerDisplay();

    const btn = document.getElementById('prayer-timer-btn');
    btn.textContent = 'Start Timer';
    btn.classList.remove('running', 'finished');
}

function updateTimerDisplay() {
    const mins = Math.floor(prayerTimerSeconds / 60);
    const secs = prayerTimerSeconds % 60;
    document.getElementById('prayer-timer-text').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Update circular progress
    const circumference = 2 * Math.PI * 54; // r=54
    const progress = prayerTimerSeconds / 120;
    const offset = circumference * (1 - progress);
    document.getElementById('prayer-timer-progress').style.strokeDashoffset = offset;
}

function completePrayer() {
    // Record that user prayed today
    const today = new Date().toDateString();
    const prayerLog = JSON.parse(localStorage.getItem('prayerLog') || '{}');

    if (!prayerLog[today]) {
        prayerLog[today] = {};
    }
    prayerLog[today][currentPrayerTime] = true;
    localStorage.setItem('prayerLog', JSON.stringify(prayerLog));

    updatePrayerStreak();
    showToast('Prayer time complete! God bless you. 🙏');
}

function updatePrayerStreak() {
    const prayerLog = JSON.parse(localStorage.getItem('prayerLog') || '{}');
    let streak = 0;
    const now = new Date();

    for (let i = 0; i < 365; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();

        if (prayerLog[dateStr]) {
            streak++;
        } else {
            if (i > 0) break; // Allow today to not yet be logged
        }
    }

    const streakEl = document.getElementById('prayer-streak');
    const countEl = document.getElementById('prayer-streak-count');

    if (streak > 0) {
        streakEl.hidden = false;
        countEl.textContent = streak;
    } else {
        streakEl.hidden = true;
    }
}

function copyPrayer() {
    const title = document.getElementById('prayer-title').textContent;
    const verse = document.getElementById('prayer-verse').textContent;
    const ref = document.getElementById('prayer-verse-ref').textContent;
    const text = document.getElementById('prayer-text').textContent;
    const closing = document.getElementById('prayer-closing').textContent;

    const fullPrayer = `${title}\n\n${verse}\n${ref}\n\n${text}\n\n${closing}`;

    navigator.clipboard.writeText(fullPrayer).then(() => {
        showToast('Prayer copied to clipboard! 📋');
    }).catch(() => {
        showToast('Failed to copy prayer.');
    });
}

function sharePrayer() {
    const title = document.getElementById('prayer-title').textContent;
    const verse = document.getElementById('prayer-verse').textContent;
    const ref = document.getElementById('prayer-verse-ref').textContent;

    const shareText = `${title}\n\n${verse}\n${ref}\n\n— The Word Bible App`;

    if (navigator.share) {
        navigator.share({
            title: title,
            text: shareText
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('Prayer copied to clipboard for sharing! 🔗');
        }).catch(() => {
            showToast('Failed to share prayer.');
        });
    }
}


function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideSearchResults();

            // Close any open modals
            const modals = document.querySelectorAll('.modal-overlay.active');
            modals.forEach(m => m.classList.remove('active'));

            const nav = document.querySelector('.nav');
            const menuToggle = document.querySelector('.mobile-menu-toggle');
            if (nav.classList.contains('mobile-active')) {
                nav.classList.remove('mobile-active');
                if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });
}

// ========================================
// Verse Highlights & Notes
// ========================================

let highlightModalRef = '';
let highlightModalColor = 'none';
let highlightModalNote = '';

function initializeHighlightModal() {
    const modal = document.getElementById('highlight-modal');
    const closeBtn = document.getElementById('highlight-modal-close');
    const cancelBtn = document.getElementById('highlight-cancel-btn');
    const saveBtn = document.getElementById('highlight-save-btn');
    const colorBtns = document.querySelectorAll('.highlight-color-btn');

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            highlightModalColor = btn.dataset.color;
        });
    });

    saveBtn.addEventListener('click', () => {
        const note = document.getElementById('highlight-note-input').value.trim();
        saveHighlight(highlightModalRef, highlightModalColor, note);
        modal.classList.remove('active');
        showToast('Highlight saved! 🎨');
    });
}

function openHighlightModal(reference, plainText) {
    highlightModalRef = reference;
    const existing = APP_STATE.highlights[reference] || {};
    highlightModalColor = existing.color || 'none';
    highlightModalNote = existing.note || '';

    document.getElementById('highlight-verse-ref').textContent = reference;
    document.getElementById('highlight-note-input').value = highlightModalNote;

    // Set selected color
    const colorBtns = document.querySelectorAll('.highlight-color-btn');
    colorBtns.forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.color === highlightModalColor);
    });

    document.getElementById('highlight-modal').classList.add('active');
}

function saveHighlight(reference, color, note) {
    if (color === 'none' && !note) {
        delete APP_STATE.highlights[reference];
    } else {
        APP_STATE.highlights[reference] = { color: color === 'none' ? '' : color, note };
    }

    localStorage.setItem('verseHighlights', JSON.stringify(APP_STATE.highlights));

    // Re-apply to visible verse if on screen
    const verseItems = document.querySelectorAll('.verse-item');
    verseItems.forEach(item => {
        const verseNum = item.dataset.verse;
        const chapterTitle = document.querySelector('.chapter-title');
        if (chapterTitle) {
            const ref = `${chapterTitle.textContent}:${verseNum}`;
            if (ref === reference) {
                const verseText = item.querySelector('.verse-text');
                applyVerseHighlight(item, reference, verseText);
            }
        }
    });
}

function applyVerseHighlight(verseItem, reference, verseTextEl) {
    const hl = APP_STATE.highlights[reference];

    // Remove existing highlight & note indicator
    verseItem.removeAttribute('data-highlight');
    const existingNote = verseItem.querySelector('.verse-note-preview');
    if (existingNote) existingNote.remove();
    const existingIndicator = verseTextEl.querySelector('.verse-note-indicator');
    if (existingIndicator) existingIndicator.remove();

    if (!hl) return;

    if (hl.color) {
        verseItem.setAttribute('data-highlight', hl.color);
    }

    if (hl.note) {
        // Add note indicator
        const indicator = document.createElement('span');
        indicator.className = 'verse-note-indicator';
        indicator.textContent = '📝';
        indicator.title = 'Click to view note';
        indicator.onclick = (e) => {
            e.stopPropagation();
            openHighlightModal(reference, '');
        };
        verseTextEl.appendChild(indicator);

        // Add note preview
        const preview = document.createElement('span');
        preview.className = 'verse-note-preview';
        preview.textContent = hl.note.length > 120 ? hl.note.substring(0, 120) + '...' : hl.note;
        verseItem.appendChild(preview);
    }
}

// ========================================
// Translation Comparison
// ========================================

const COMPARE_VERSIONS = ['BSB', 'ENGWEBP', 'eng_bbe', 'eng_web'];

function initializeCompareModal() {
    const modal = document.getElementById('compare-modal');
    const closeBtn = document.getElementById('compare-modal-close');

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

async function openCompareModal(bookName, chapter, verseNum) {
    const modal = document.getElementById('compare-modal');
    const results = document.getElementById('compare-results');
    const loader = modal.querySelector('.compare-loader');
    const title = document.getElementById('compare-modal-title');

    title.textContent = `Compare: ${bookName} ${chapter}:${verseNum}`;
    results.innerHTML = '';
    loader.style.display = 'flex';
    modal.classList.add('active');

    // Get bookId
    const bookId = BOOK_NAME_TO_ID[bookName] || bookName;

    // Get versions to compare (remove duplicates, include current)
    const versionsToLoad = [...new Set([APP_STATE.currentVersion, ...COMPARE_VERSIONS])];

    const translationNames = {};
    TRANSLATIONS.forEach(t => {
        translationNames[t.id] = t.name || t.shortName || t.id;
    });

    let loadedCount = 0;

    for (const version of versionsToLoad) {
        try {
            const data = await fetchChapterAPI(version, bookId, chapter);
            if (data && data.chapter && data.chapter.content) {
                const verseText = extractVerseTextFromContent(data.chapter.content, verseNum);
                if (verseText) {
                    const item = document.createElement('div');
                    item.className = 'compare-item';

                    const isCurrent = version === APP_STATE.currentVersion;
                    item.innerHTML = `
                        <div class="compare-item-header">
                            <span class="compare-version-name">${escapeHTML(translationNames[version] || version)}</span>
                            ${isCurrent ? '<span class="compare-version-badge">Current</span>' : ''}
                        </div>
                        <p class="compare-verse-text">${escapeHTML(verseText)}</p>
                    `;
                    results.appendChild(item);
                    loadedCount++;
                }
            }
        } catch (e) {
            // Skip failed translations silently
        }
    }

    loader.style.display = 'none';

    if (loadedCount === 0) {
        results.innerHTML = '<p>Unable to load translations for this verse. Please try again.</p>';
    }
}

function extractVerseTextFromContent(content, verseNum) {
    for (const item of content) {
        if (item.type === 'verse' && String(item.number) === String(verseNum)) {
            if (Array.isArray(item.content)) {
                return item.content
                    .map(part => {
                        if (typeof part === 'string') return part;
                        if (part && part.text) return part.text;
                        return '';
                    })
                    .join('')
                    .trim();
            }
            return '';
        }
    }
    return '';
}

// ========================================
// Reading Progress Tracker
// ========================================

function markChapterRead(bookId, chapter) {
    if (!APP_STATE.readingProgress[bookId]) {
        APP_STATE.readingProgress[bookId] = [];
    }

    if (!APP_STATE.readingProgress[bookId].includes(chapter)) {
        APP_STATE.readingProgress[bookId].push(chapter);
        APP_STATE.readingProgress[bookId].sort((a, b) => a - b);
        localStorage.setItem('readingProgress', JSON.stringify(APP_STATE.readingProgress));
    }
}

function renderReadingProgress() {
    const allBooks = [...BIBLE_BOOKS.oldTestament, ...BIBLE_BOOKS.newTestament];

    if (allBooks.length === 0) {
        // Books not loaded yet
        document.getElementById('progress-books').innerHTML = '<p>Loading book data...</p>';
        return;
    }

    // Calculate stats
    let totalChapters = 0;
    let totalRead = 0;
    let otChapters = 0;
    let otRead = 0;
    let ntChapters = 0;
    let ntRead = 0;

    BIBLE_BOOKS.oldTestament.forEach(book => {
        otChapters += book.chapters;
        totalChapters += book.chapters;
        const read = (APP_STATE.readingProgress[book.id] || []).length;
        otRead += read;
        totalRead += read;
    });

    BIBLE_BOOKS.newTestament.forEach(book => {
        ntChapters += book.chapters;
        totalChapters += book.chapters;
        const read = (APP_STATE.readingProgress[book.id] || []).length;
        ntRead += read;
        totalRead += read;
    });

    const totalPercent = totalChapters > 0 ? Math.round((totalRead / totalChapters) * 100) : 0;
    const otPercent = otChapters > 0 ? Math.round((otRead / otChapters) * 100) : 0;
    const ntPercent = ntChapters > 0 ? Math.round((ntRead / ntChapters) * 100) : 0;

    document.getElementById('progress-total-percent').textContent = `${totalPercent}%`;
    document.getElementById('progress-total-bar').style.width = `${totalPercent}%`;
    document.getElementById('progress-ot-percent').textContent = `${otPercent}%`;
    document.getElementById('progress-ot-bar').style.width = `${otPercent}%`;
    document.getElementById('progress-nt-percent').textContent = `${ntPercent}%`;
    document.getElementById('progress-nt-bar').style.width = `${ntPercent}%`;
    document.getElementById('progress-chapters-read').textContent = `${totalRead} / ${totalChapters}`;

    // Render book grids
    renderProgressGrid('progress-ot-books', BIBLE_BOOKS.oldTestament);
    renderProgressGrid('progress-nt-books', BIBLE_BOOKS.newTestament);
}

function renderProgressGrid(containerId, books) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    books.forEach(book => {
        const readChapters = APP_STATE.readingProgress[book.id] || [];
        const readCount = readChapters.length;
        const percent = book.chapters > 0 ? Math.round((readCount / book.chapters) * 100) : 0;
        const isComplete = readCount === book.chapters;

        const card = document.createElement('div');
        card.className = 'progress-book-card';

        card.innerHTML = `
            <div class="progress-book-header">
                <span class="progress-book-name">${escapeHTML(book.name)}</span>
                <span class="progress-book-fraction">${readCount}/${book.chapters}</span>
            </div>
            <div class="progress-book-bar">
                <div class="progress-book-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${percent}%"></div>
            </div>
            <div class="progress-chapters-dots"></div>
        `;

        const dotsContainer = card.querySelector('.progress-chapters-dots');
        for (let ch = 1; ch <= book.chapters; ch++) {
            const dot = document.createElement('span');
            dot.className = 'progress-chapter-dot';
            dot.title = `${book.name} ${ch}`;
            if (readChapters.includes(ch)) {
                dot.classList.add('read');
                if (isComplete) dot.classList.add('complete-book');
            }
            dot.onclick = () => {
                navigateTo('bible');
                // Find book and load chapter
                const allBooks = [...BIBLE_BOOKS.oldTestament, ...BIBLE_BOOKS.newTestament];
                const targetBook = allBooks.find(b => b.id === book.id);
                if (targetBook) {
                    selectBook(targetBook);
                    setTimeout(() => loadChapter(targetBook, ch), 100);
                }
            };
            dotsContainer.appendChild(dot);
        }

        container.appendChild(card);
    });
}

// ========================================
// Bookmark Collections
// ========================================

function initializeCollections() {
    const manageBtn = document.getElementById('manage-collections-btn');
    if (manageBtn) {
        manageBtn.addEventListener('click', openCollectionsModal);
    }

    const modalClose = document.getElementById('collections-modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            document.getElementById('collections-modal').classList.remove('active');
        });
    }

    const modal = document.getElementById('collections-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    const addBtn = document.getElementById('add-collection-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addCollection);
    }

    const input = document.getElementById('new-collection-input');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addCollection();
        });
    }

    renderCollectionTabs();
}

function renderCollectionTabs() {
    const tabsContainer = document.getElementById('collections-tabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '';

    const allTab = document.createElement('button');
    allTab.className = `collection-tab ${APP_STATE.activeCollection === 'all' ? 'active' : ''}`;
    allTab.dataset.collection = 'all';
    allTab.textContent = 'All';
    allTab.onclick = () => {
        APP_STATE.activeCollection = 'all';
        renderCollectionTabs();
        renderBookmarks();
    };
    tabsContainer.appendChild(allTab);

    // Uncollected tab
    const uncollectedTab = document.createElement('button');
    uncollectedTab.className = `collection-tab ${APP_STATE.activeCollection === '' ? 'active' : ''}`;
    uncollectedTab.dataset.collection = '';
    uncollectedTab.textContent = 'Uncategorized';
    uncollectedTab.onclick = () => {
        APP_STATE.activeCollection = '';
        renderCollectionTabs();
        renderBookmarks();
    };
    tabsContainer.appendChild(uncollectedTab);

    APP_STATE.collections.forEach(c => {
        const tab = document.createElement('button');
        tab.className = `collection-tab ${APP_STATE.activeCollection === c ? 'active' : ''}`;
        tab.dataset.collection = c;
        tab.textContent = c;
        tab.onclick = () => {
            APP_STATE.activeCollection = c;
            renderCollectionTabs();
            renderBookmarks();
        };
        tabsContainer.appendChild(tab);
    });
}

function openCollectionsModal() {
    document.getElementById('collections-modal').classList.add('active');
    document.getElementById('new-collection-input').value = '';
    renderCollectionsList();
}

function renderCollectionsList() {
    const list = document.getElementById('collections-list');
    list.innerHTML = '';

    APP_STATE.collections.forEach(c => {
        const count = APP_STATE.bookmarks.filter(b => b.collection === c).length;

        const item = document.createElement('div');
        item.className = 'collection-list-item';
        item.innerHTML = `
            <span class="collection-list-item-name">${escapeHTML(c)}</span>
            <span class="collection-list-item-count">${count} bookmark${count !== 1 ? 's' : ''}</span>
        `;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'collection-delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = `Delete "${c}"`;
        deleteBtn.onclick = () => deleteCollection(c);
        item.appendChild(deleteBtn);

        list.appendChild(item);
    });

    if (APP_STATE.collections.length === 0) {
        list.innerHTML = '<p style="color: var(--color-text-muted); text-align: center; padding: var(--spacing-md);">No collections yet. Create one above.</p>';
    }
}

function addCollection() {
    const input = document.getElementById('new-collection-input');
    const name = input.value.trim();

    if (!name) return;
    if (APP_STATE.collections.includes(name)) {
        showToast('Collection already exists!');
        return;
    }

    APP_STATE.collections.push(name);
    saveCollections();
    renderCollectionsList();
    renderCollectionTabs();
    input.value = '';
    showToast(`Collection "${name}" created! 📂`);
}

function deleteCollection(name) {
    APP_STATE.collections = APP_STATE.collections.filter(c => c !== name);

    // Remove collection from bookmarks that had it
    APP_STATE.bookmarks.forEach(b => {
        if (b.collection === name) {
            delete b.collection;
        }
    });

    saveCollections();
    saveBookmarks();
    renderCollectionsList();
    renderCollectionTabs();
    renderBookmarks();
    showToast(`Collection "${name}" deleted`);
}

function moveBookmarkToCollection(reference, collectionName) {
    const bookmark = APP_STATE.bookmarks.find(b => b.reference === reference);
    if (bookmark) {
        if (collectionName) {
            bookmark.collection = collectionName;
        } else {
            delete bookmark.collection;
        }
        saveBookmarks();
        renderBookmarks();
        showToast(collectionName ? `Moved to "${collectionName}"` : 'Removed from collection');
    }
}

function saveCollections() {
    try {
        localStorage.setItem('bookmarkCollections', JSON.stringify(APP_STATE.collections));
    } catch (error) {
        console.error('Error saving collections:', error);
    }
}
