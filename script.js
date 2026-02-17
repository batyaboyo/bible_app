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
