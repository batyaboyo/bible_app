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

    // Initialize quiz when navigating to it
    if (page === 'quiz') {
        initializeQuiz();
    }

    // Initialize stories when navigating to it
    if (page === 'stories') {
        initializeStories();
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
            { title: 'In the Beginning', text: 'A very long time ago, there was nothing at all — no sky, no land, no animals, and no people. But God was there, and He had an amazing plan. He decided to create the whole world!' },
            { title: 'Six Days of Creation', text: 'On the first day, God said "Let there be light!" and light appeared. He separated the light from the darkness and called them day and night.\n\nOn the second day, He made the beautiful blue sky. On the third day, He gathered the waters together to make oceans and let dry land appear, and then He filled the land with trees, flowers, and every kind of plant.\n\nOn the fourth day, God placed the sun, moon, and stars in the sky. On the fifth day, He filled the oceans with fish and the sky with birds. On the sixth day, God made all the land animals — from tiny ants to huge elephants. And then, as His most special creation, God made people — a man named Adam and a woman named Eve.' },
            { title: 'A Day of Rest', text: 'On the seventh day, God looked at everything He had made and saw that it was very good. He rested on that day and made it a special, holy day.' }
        ],
        moral: 'God made everything in the world with love and care, including you! Every person is special because God created them.',
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
            { title: 'The Beautiful Garden', text: 'God planted a wonderful garden called Eden for Adam and Eve to live in. It was full of beautiful trees, delicious fruit, and friendly animals. God told them they could eat fruit from any tree except one — the Tree of the Knowledge of Good and Evil.' },
            { title: 'The Serpent\'s Trick', text: 'A sneaky serpent came to Eve and told her that eating the forbidden fruit would make her wise like God. Eve looked at the fruit, took a bite, and shared it with Adam. As soon as they ate it, they realized they had disobeyed God, and they felt ashamed.' },
            { title: 'Leaving the Garden', text: 'God was sad because Adam and Eve had broken His rule. They had to leave the beautiful garden. But even though they made a mistake, God still loved them and promised that one day He would make things right again.' }
        ],
        moral: 'God gives us rules because He loves us. When we make wrong choices, there are consequences, but God never stops loving us.',
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
            { title: 'A Wicked World', text: 'As time went on, people on Earth became very wicked. They forgot all about God and did terrible things. God was heartbroken. But there was one man who still loved and obeyed God — a man named Noah.' },
            { title: 'Building the Ark', text: 'God told Noah to build a huge boat called an ark because He was going to send a great flood. Noah obeyed even though people laughed at him. He worked for many years building the enormous ark exactly the way God told him to.' },
            { title: 'The Animals and the Flood', text: 'When the ark was ready, God sent two of every kind of animal to Noah — lions, giraffes, birds, and many more! Noah, his wife, his three sons, and their wives all went inside. Then God shut the door, and it rained for forty days and forty nights until water covered the whole earth.' },
            { title: 'The Rainbow Promise', text: 'After many months, the water went down and the ark came to rest on a mountain. Noah sent out a dove, and it came back with an olive branch — land was near! When everyone came out of the ark, God put a beautiful rainbow in the sky as a promise that He would never flood the whole earth again.' }
        ],
        moral: 'When we trust and obey God, even when others don\'t understand, He takes care of us. God always keeps His promises.',
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
            { title: 'God Calls Abraham', text: 'There was a man named Abraham (first called Abram) who lived in a city called Ur. One day, God spoke to him and said, "Leave your country and go to a land I will show you. I will make you into a great nation and bless you." Abraham trusted God and set off on a big journey with his wife Sarah.' },
            { title: 'A Promise of a Son', text: 'God promised Abraham that he would have as many descendants as the stars in the sky! But Abraham and Sarah waited a very, very long time — they were very old and still had no children. It seemed impossible! But God told them nothing is too hard for Him.' },
            { title: 'Isaac Is Born', text: 'When Abraham was 100 years old and Sarah was 90, God kept His promise — they had a baby boy named Isaac! Sarah laughed with joy because God had done something miraculous. Isaac\'s name means "he laughs."' }
        ],
        moral: 'God\'s promises may take time, but He always keeps them. We can trust God even when things seem impossible.',
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
            { title: 'The Favorite Son', text: 'Jacob had twelve sons, but Joseph was his favorite. Jacob gave Joseph a beautiful coat of many colors. Joseph also had special dreams that showed his family bowing down to him. This made his brothers very jealous and angry.' },
            { title: 'Sold and Imprisoned', text: 'Joseph\'s brothers were so jealous that they sold him to traders going to Egypt! They told their father that Joseph had been killed by a wild animal. In Egypt, Joseph worked hard but was thrown into prison for something he didn\'t do. Even in prison, Joseph trusted God.' },
            { title: 'From Prison to the Palace', text: 'In prison, God gave Joseph the ability to understand dreams. When the king of Egypt — called Pharaoh — had a troubling dream, Joseph was called to explain it. He told Pharaoh that seven years of good harvests would be followed by seven years of famine, and he should save food. Pharaoh was so impressed that he made Joseph the second most powerful person in all of Egypt!' },
            { title: 'The Family Reunited', text: 'When the famine came, Joseph\'s brothers traveled to Egypt to buy food — and they didn\'t recognize him! Eventually, Joseph revealed who he was and forgave them. He said, "You meant it for evil, but God meant it for good." The whole family was reunited and came to live in Egypt.' }
        ],
        moral: 'Even when bad things happen, God can turn them into something good. Forgiveness is powerful and can heal families.',
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
            { title: 'Baby in a Basket', text: 'The Israelites were living as slaves in Egypt. The mean Pharaoh ordered that all Israelite baby boys be thrown into the river. But one brave mother hid her baby in a waterproof basket and placed it among the reeds of the Nile River. Pharaoh\'s own daughter found the baby, named him Moses, and raised him as a prince!' },
            { title: 'The Burning Bush', text: 'When Moses grew up, he ran away to the desert after making a mistake. There, God spoke to him from a bush that was on fire but didn\'t burn up! God told Moses, "Go back to Egypt. Tell Pharaoh to let My people go!" Moses was scared, but God promised to be with him.' },
            { title: 'The Ten Plagues', text: 'Moses went to Pharaoh and said, "Let my people go!" But Pharaoh refused again and again. So God sent ten terrible plagues on Egypt — the water turned to blood, frogs covered the land, darkness fell, and more. After the final plague, Pharaoh finally agreed to let the Israelites leave.' },
            { title: 'Crossing the Red Sea', text: 'The Israelites left Egypt, but Pharaoh changed his mind and sent his army after them! The people were trapped between the army and the Red Sea. But God told Moses to raise his staff over the water, and the sea split in two! The Israelites walked through on dry ground, and when the Egyptians followed, the water crashed down on them. The people were free!' }
        ],
        moral: 'God hears the cries of those who are suffering and has the power to rescue them. No problem is too big for God.',
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
            { title: 'A Meeting on the Mountain', text: 'After escaping Egypt, the Israelites traveled through the desert and camped near a tall mountain called Mount Sinai. God told Moses to climb to the top of the mountain because He had something very important to give him.' },
            { title: 'God\'s Special Rules', text: 'On the mountain, God gave Moses ten special rules carved on two stone tablets. These Ten Commandments taught the people how to love God and love each other:\n\n1. Have no other gods.\n2. Don\'t worship idols.\n3. Respect God\'s name.\n4. Keep the Sabbath day holy.\n5. Honor your father and mother.\n6. Don\'t murder.\n7. Be faithful in marriage.\n8. Don\'t steal.\n9. Don\'t lie.\n10. Don\'t be jealous of what others have.' },
            { title: 'A Guide for Life', text: 'These commandments weren\'t just rules — they were a gift! They showed the people the best way to live, to treat others kindly, and to have a good relationship with God. Moses brought the tablets down from the mountain and shared them with all the people.' }
        ],
        moral: 'God gives us guidelines because He wants the best for us. Following His ways leads to a happy and good life.',
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
            { title: 'The Mighty Giant', text: 'The Israelites were at war with the Philistines. Every day, a giant soldier named Goliath came out and challenged the Israelites to fight him. He was over nine feet tall and wore heavy armor! All the Israelite soldiers were terrified — no one dared to fight him.' },
            { title: 'A Brave Boy', text: 'A young shepherd boy named David came to bring food to his brothers in the army. When he heard Goliath mocking God and the Israelites, David was not afraid. He said, "I\'ll fight him! God helped me protect my sheep from lions and bears, and He will help me now."' },
            { title: 'The Battle', text: 'King Saul offered David his royal armor, but it was too big and heavy. Instead, David picked up five smooth stones from a stream and took his sling. He walked toward the giant. Goliath laughed at the small boy. But David said, "You come with a sword and spear, but I come in the name of the Lord!" David swung his sling, and the stone hit Goliath right in the forehead. The giant fell to the ground. David had won!' }
        ],
        moral: 'With God on our side, we can face any challenge, no matter how big it seems. True strength comes from trusting God.',
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
            { title: 'A Faithful Man', text: 'Daniel was a man who loved God very much. He prayed to God three times every day. Daniel was very wise and the king trusted him more than anyone else. This made the other officials jealous, and they came up with a wicked plan to get rid of Daniel.' },
            { title: 'The Evil Trick', text: 'The jealous officials convinced the king to make a new law: for thirty days, no one could pray to anyone except the king, or they would be thrown into a den of lions! When Daniel heard about the law, he didn\'t stop praying. He went home, opened his window toward Jerusalem, and prayed to God just like he always did.' },
            { title: 'In the Lions\' Den', text: 'The officials caught Daniel praying and reported him to the king. The king was very sad because he cared about Daniel, but the law could not be changed. Daniel was thrown into the den of hungry lions. The king couldn\'t sleep all night, worrying about Daniel.' },
            { title: 'God Shuts the Lions\' Mouths', text: 'Early the next morning, the king rushed to the lions\' den and called out, "Daniel! Did your God save you?" And Daniel answered, "My God sent His angel and shut the lions\' mouths. They have not hurt me!" The king was overjoyed and pulled Daniel out, completely unharmed.' }
        ],
        moral: 'When we stay faithful to God, He protects us. We should never be afraid to do what is right, even when it\'s hard.',
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
            { title: 'Running from God', text: 'God told Jonah to go to a city called Nineveh and tell the people there to stop being wicked. But Jonah didn\'t want to go! Instead, he got on a ship sailing in the opposite direction, trying to run away from God.' },
            { title: 'The Terrible Storm', text: 'God sent a huge storm that rocked the ship. The sailors were terrified! Jonah knew the storm was because of him. He told the sailors, "Throw me into the sea, and the storm will stop." They didn\'t want to, but finally they did — and the sea became calm.' },
            { title: 'Inside the Fish', text: 'God sent a huge fish to swallow Jonah! For three days and three nights, Jonah was inside the belly of the fish. While he was there, he prayed and asked God to forgive him. Then the fish spit Jonah out onto dry land!' },
            { title: 'Going to Nineveh', text: 'This time, Jonah obeyed God and went to Nineveh. He told the people to stop doing wrong things and turn back to God. And they listened! The whole city, from the king to the smallest child, was sorry for their wrongs and asked God to forgive them. And God did.' }
        ],
        moral: 'We can\'t run away from God because He is everywhere. God is patient with us and gives second chances.',
        keyVerse: { text: 'From inside the fish Jonah prayed to the Lord his God.', ref: 'Jonah 2:1' }
    },
    {
        id: 'birth-of-jesus',
        title: 'The Birth of Jesus',
        icon: '⭐',
        testament: 'new-testament',
        reference: 'Luke 2:1-20',
        snippet: 'The Son of God is born as a baby in a humble manger in Bethlehem.',
        sections: [
            { title: 'An Angel\'s Message', text: 'A young woman named Mary lived in a town called Nazareth. One day, an angel named Gabriel appeared to her and said, "Don\'t be afraid, Mary! God has chosen you for something very special. You are going to have a baby boy, and you will name Him Jesus. He will be the Son of God!" Mary was amazed but trusted God\'s plan.' },
            { title: 'The Journey to Bethlehem', text: 'Mary was engaged to a kind man named Joseph. When it was almost time for the baby to be born, they had to travel to the town of Bethlehem for a census. It was a long, tiring journey. When they arrived, every inn was full — there was no room for them anywhere.' },
            { title: 'Born in a Manger', text: 'Mary and Joseph found shelter in a stable where animals were kept. That night, baby Jesus was born! Mary wrapped Him in soft cloths and laid Him in a manger — a feeding trough for animals. The King of Kings was born in the humblest of places.' },
            { title: 'Shepherds and Angels', text: 'That same night, shepherds were watching their flocks in nearby fields. Suddenly, an angel appeared and the sky filled with light! The angel said, "Don\'t be afraid! I bring you good news of great joy — a Savior has been born in Bethlehem!" Then a whole choir of angels filled the sky, singing, "Glory to God in the highest!" The shepherds hurried to Bethlehem and found baby Jesus, just as the angel had said.' }
        ],
        moral: 'God sent Jesus into the world because He loves every single person. Jesus came as a humble baby to show that God cares about everyone, no matter who they are.',
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
            { title: 'A Big Question', text: 'One day, a man asked Jesus, "What must I do to have eternal life?" Jesus asked him what the law said. The man answered, "Love God with all your heart and love your neighbor as yourself." Then he asked, "But who is my neighbor?" Jesus answered with a story.' },
            { title: 'A Man in Trouble', text: 'Jesus said, "A man was traveling from Jerusalem to Jericho when robbers attacked him. They beat him up, took everything he had, and left him half dead on the side of the road."' },
            { title: 'Who Stopped to Help?', text: 'A priest came walking down that same road. He saw the hurt man but walked right past on the other side. Then a Levite (a religious helper) came by. He also saw the man but walked away without helping.\n\nBut then a Samaritan came along. Samaritans and Jews didn\'t usually get along, but this Samaritan felt sorry for the hurt man. He stopped, bandaged his wounds, put him on his own donkey, and took him to an inn. He even paid the innkeeper to take care of the man until he got better!' },
            { title: 'The Lesson', text: 'Jesus asked, "Which of these three was a neighbor to the man who was attacked?" The answer was clear: the one who showed kindness. Jesus said, "Go and do the same."' }
        ],
        moral: 'Being a good neighbor means helping anyone who needs it, even if they are different from us. Kindness has no boundaries.',
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
            { title: 'Leaving Home', text: 'Jesus told a story about a father who had two sons. The younger son said, "Father, give me my share of the money now." The father sadly gave it to him. The young man packed his bags and traveled far away, where he spent all his money on parties and foolish things.' },
            { title: 'Hitting Rock Bottom', text: 'When all the money was gone, a terrible famine hit the land. The young man had nothing. He got a job feeding pigs and was so hungry that he wanted to eat the pig food! He thought to himself, "Even my father\'s servants have plenty to eat. I\'ll go home and tell my father I\'m sorry."' },
            { title: 'Coming Home', text: 'The son started the long walk home, rehearsing what he would say: "Father, I have sinned. I am not worthy to be called your son. Please let me be one of your servants." But while he was still far away, his father saw him! The father ran to him, threw his arms around him, and kissed him.' },
            { title: 'The Celebration', text: 'The father didn\'t scold his son or make him a servant. Instead, he said, "Quick! Bring the best robe and put it on him. Put a ring on his finger and sandals on his feet. Let\'s have a feast and celebrate! For my son was lost and now he is found." And they had a wonderful party.' }
        ],
        moral: 'No matter how far we wander or how many mistakes we make, God is always waiting to welcome us back with open arms. His love is unconditional.',
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
            { title: 'A Huge Crowd', text: 'Jesus had been teaching and healing people all day. A huge crowd of over five thousand people had followed Him to a hillside near the Sea of Galilee. It was getting late, and the people were hungry. The disciples said, "Where can we buy enough food for all these people?"' },
            { title: 'A Boy\'s Lunch', text: 'A young boy in the crowd had a small lunch — just five loaves of bread and two small fish. Andrew, one of the disciples, brought the boy to Jesus, but he said, "How far will this go among so many people?"' },
            { title: 'The Miracle', text: 'Jesus told everyone to sit down on the grass. He took the bread and fish, looked up to heaven, and gave thanks to God. Then He broke the food into pieces and gave it to the disciples to pass out. And something amazing happened — the food kept multiplying! Everyone ate until they were full.' },
            { title: 'Leftovers!', text: 'After everyone had eaten their fill, Jesus told the disciples to collect the leftovers. They filled twelve baskets with the extra food! Over five thousand people had been fed from one boy\'s tiny lunch. The people were astonished and said, "This truly is a Prophet of God!"' }
        ],
        moral: 'When we offer what we have to God — even if it seems small — He can do amazing things with it. No gift is too small for God to use.',
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
            { title: 'A Stormy Night', text: 'After feeding the five thousand, Jesus told His disciples to get in a boat and cross the Sea of Galilee while He went up a mountain to pray. During the night, a strong wind started blowing and the waves were crashing against the boat. The disciples were struggling to keep the boat from sinking.' },
            { title: 'Walking on the Waves', text: 'In the darkest part of the night, the disciples saw someone walking toward them on top of the water! They were terrified and thought it was a ghost. But Jesus called out, "Take courage! It is I. Don\'t be afraid."' },
            { title: 'Peter\'s Faith', text: 'Peter said, "Lord, if it\'s really You, tell me to come to You on the water." Jesus said, "Come!" Peter stepped out of the boat and started walking on the water toward Jesus! But when he noticed the strong wind and big waves, he got scared and began to sink. "Lord, save me!" he cried.' },
            { title: 'Rescued', text: 'Immediately, Jesus reached out His hand and caught Peter. He said gently, "You of little faith, why did you doubt?" When they climbed into the boat, the wind stopped completely. The disciples worshipped Jesus and said, "You truly are the Son of God!"' }
        ],
        moral: 'When we keep our eyes on Jesus and trust Him, we can do incredible things. But when we focus on our fears, we start to sink. Jesus is always there to catch us.',
        keyVerse: { text: 'Take courage! It is I. Don\'t be afraid.', ref: 'Matthew 14:27' }
    },
    {
        id: 'easter',
        title: 'The Resurrection of Jesus',
        icon: '✝️',
        testament: 'new-testament',
        reference: 'Matthew 27–28, Luke 24',
        snippet: 'Jesus gives His life for the world and rises again three days later.',
        sections: [
            { title: 'The Darkest Day', text: 'Jesus was arrested, put on trial, and sentenced to die on a cross even though He had done nothing wrong. It was the saddest day for His followers. Jesus was crucified on a hill called Golgotha. Before He died, Jesus prayed, "Father, forgive them, for they do not know what they are doing." He was buried in a tomb, and a large stone was rolled in front of the entrance.' },
            { title: 'The Empty Tomb', text: 'Three days later, early on Sunday morning, some women who followed Jesus went to visit His tomb. When they arrived, they found that the huge stone had been rolled away and the tomb was empty! An angel appeared and said, "Do not be afraid! Jesus is not here — He has risen, just as He said!"' },
            { title: 'Jesus Is Alive!', text: 'The women ran to tell the disciples the incredible news. Some didn\'t believe it at first. But then Jesus appeared to them Himself! He showed them His hands and feet and ate food with them so they would know He was truly alive. Over the next forty days, Jesus appeared to hundreds of people.' },
            { title: 'The Greatest Victory', text: 'The resurrection of Jesus is the most important event in all of history. It showed that Jesus had defeated death and that God\'s love is stronger than anything. Because Jesus rose again, everyone who believes in Him can have the promise of eternal life.' }
        ],
        moral: 'The resurrection shows that God\'s love is more powerful than anything — even death. Jesus gives hope to everyone who believes in Him.',
        keyVerse: { text: 'He is not here; he has risen, just as he said.', ref: 'Matthew 28:6' }
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
