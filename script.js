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
    toastTimeout: null
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

            verseActions.appendChild(bookmarkBtn);
            verseActions.appendChild(copyBtn);
            verseActions.appendChild(shareBtn);

            verseItem.appendChild(verseNumber);
            verseItem.appendChild(verseText);
            verseItem.appendChild(verseActions);

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

    emptyState.style.display = 'none';
    bookmarksList.innerHTML = '';

    const sortedBookmarks = [...APP_STATE.bookmarks].sort((a, b) =>
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
// Keyboard Shortcuts
// ========================================

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideSearchResults();

            const nav = document.querySelector('.nav');
            const menuToggle = document.querySelector('.mobile-menu-toggle');
            if (nav.classList.contains('mobile-active')) {
                nav.classList.remove('mobile-active');
                if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });
}
