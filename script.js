// ========================================
// Global State & Configuration
// ========================================

const APP_STATE = {
    currentPage: 'home',
    currentBook: null,
    currentChapter: null,
    bookmarks: [],
    darkMode: false,
    dailyVerse: null,
    searchTimeout: null
};

// Bible books data
const BIBLE_BOOKS = {
    oldTestament: [
        { name: 'Genesis', chapters: 50, abbr: 'Genesis' },
        { name: 'Exodus', chapters: 40, abbr: 'Exodus' },
        { name: 'Leviticus', chapters: 27, abbr: 'Leviticus' },
        { name: 'Numbers', chapters: 36, abbr: 'Numbers' },
        { name: 'Deuteronomy', chapters: 34, abbr: 'Deuteronomy' },
        { name: 'Joshua', chapters: 24, abbr: 'Joshua' },
        { name: 'Judges', chapters: 21, abbr: 'Judges' },
        { name: 'Ruth', chapters: 4, abbr: 'Ruth' },
        { name: '1 Samuel', chapters: 31, abbr: '1 Samuel' },
        { name: '2 Samuel', chapters: 24, abbr: '2 Samuel' },
        { name: '1 Kings', chapters: 22, abbr: '1 Kings' },
        { name: '2 Kings', chapters: 25, abbr: '2 Kings' },
        { name: '1 Chronicles', chapters: 29, abbr: '1 Chronicles' },
        { name: '2 Chronicles', chapters: 36, abbr: '2 Chronicles' },
        { name: 'Ezra', chapters: 10, abbr: 'Ezra' },
        { name: 'Nehemiah', chapters: 13, abbr: 'Nehemiah' },
        { name: 'Esther', chapters: 10, abbr: 'Esther' },
        { name: 'Job', chapters: 42, abbr: 'Job' },
        { name: 'Psalms', chapters: 150, abbr: 'Psalms' },
        { name: 'Proverbs', chapters: 31, abbr: 'Proverbs' },
        { name: 'Ecclesiastes', chapters: 12, abbr: 'Ecclesiastes' },
        { name: 'Song of Solomon', chapters: 8, abbr: 'Song of Solomon' },
        { name: 'Isaiah', chapters: 66, abbr: 'Isaiah' },
        { name: 'Jeremiah', chapters: 52, abbr: 'Jeremiah' },
        { name: 'Lamentations', chapters: 5, abbr: 'Lamentations' },
        { name: 'Ezekiel', chapters: 48, abbr: 'Ezekiel' },
        { name: 'Daniel', chapters: 12, abbr: 'Daniel' },
        { name: 'Hosea', chapters: 14, abbr: 'Hosea' },
        { name: 'Joel', chapters: 3, abbr: 'Joel' },
        { name: 'Amos', chapters: 9, abbr: 'Amos' },
        { name: 'Obadiah', chapters: 1, abbr: 'Obadiah' },
        { name: 'Jonah', chapters: 4, abbr: 'Jonah' },
        { name: 'Micah', chapters: 7, abbr: 'Micah' },
        { name: 'Nahum', chapters: 3, abbr: 'Nahum' },
        { name: 'Habakkuk', chapters: 3, abbr: 'Habakkuk' },
        { name: 'Zephaniah', chapters: 3, abbr: 'Zephaniah' },
        { name: 'Haggai', chapters: 2, abbr: 'Haggai' },
        { name: 'Zechariah', chapters: 14, abbr: 'Zechariah' },
        { name: 'Malachi', chapters: 4, abbr: 'Malachi' }
    ],
    newTestament: [
        { name: 'Matthew', chapters: 28, abbr: 'Matthew' },
        { name: 'Mark', chapters: 16, abbr: 'Mark' },
        { name: 'Luke', chapters: 24, abbr: 'Luke' },
        { name: 'John', chapters: 21, abbr: 'John' },
        { name: 'Acts', chapters: 28, abbr: 'Acts' },
        { name: 'Romans', chapters: 16, abbr: 'Romans' },
        { name: '1 Corinthians', chapters: 16, abbr: '1 Corinthians' },
        { name: '2 Corinthians', chapters: 13, abbr: '2 Corinthians' },
        { name: 'Galatians', chapters: 6, abbr: 'Galatians' },
        { name: 'Ephesians', chapters: 6, abbr: 'Ephesians' },
        { name: 'Philippians', chapters: 4, abbr: 'Philippians' },
        { name: 'Colossians', chapters: 4, abbr: 'Colossians' },
        { name: '1 Thessalonians', chapters: 5, abbr: '1 Thessalonians' },
        { name: '2 Thessalonians', chapters: 3, abbr: '2 Thessalonians' },
        { name: '1 Timothy', chapters: 6, abbr: '1 Timothy' },
        { name: '2 Timothy', chapters: 4, abbr: '2 Timothy' },
        { name: 'Titus', chapters: 3, abbr: 'Titus' },
        { name: 'Philemon', chapters: 1, abbr: 'Philemon' },
        { name: 'Hebrews', chapters: 13, abbr: 'Hebrews' },
        { name: 'James', chapters: 5, abbr: 'James' },
        { name: '1 Peter', chapters: 5, abbr: '1 Peter' },
        { name: '2 Peter', chapters: 3, abbr: '2 Peter' },
        { name: '1 John', chapters: 5, abbr: '1 John' },
        { name: '2 John', chapters: 1, abbr: '2 John' },
        { name: '3 John', chapters: 1, abbr: '3 John' },
        { name: 'Jude', chapters: 1, abbr: 'Jude' },
        { name: 'Revelation', chapters: 22, abbr: 'Revelation' }
    ]
};

// Popular verses for daily rotation
const POPULAR_VERSES = [
    'John 3:16',
    'Philippians 4:13',
    'Jeremiah 29:11',
    'Proverbs 3:5-6',
    'Romans 8:28',
    'Psalm 23:1',
    'Isaiah 41:10',
    'Matthew 6:33',
    'Joshua 1:9',
    'Psalm 46:1',
    'Romans 12:2',
    'Proverbs 16:3',
    '1 Corinthians 10:13',
    'Galatians 5:22-23',
    'Matthew 5:14-16'
];

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Load saved state
    loadState();
    
    // Initialize UI components
    initializeNavigation();
    initializeThemeToggle();
    initializeMobileMenu();
    initializeBibleBooks();
    initializeSearch();
    
    // Load content
    loadDailyVerse();
    renderBookmarks();
    
    // Apply initial theme
    applyTheme();
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
        
        const savedDailyVerse = localStorage.getItem('dailyVerse');
        const savedDate = localStorage.getItem('dailyVerseDate');
        const today = new Date().toDateString();
        
        if (savedDailyVerse && savedDate === today) {
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
    } catch (error) {
        console.error('Error saving daily verse:', error);
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
    // Update state
    APP_STATE.currentPage = page;
    
    // Update active page
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');
    
    // Update active nav link
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
    nav.classList.remove('mobile-active');
    
    // Scroll to top
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
        loader.style.display = 'flex';
        verseText.style.display = 'none';
        
        // Get today's verse based on date
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
        const verseIndex = dayOfYear % POPULAR_VERSES.length;
        const verseRef = POPULAR_VERSES[verseIndex];
        
        const data = await fetchBibleVerse(verseRef);
        
        if (data && data.text) {
            const verse = {
                reference: data.reference,
                text: data.text.trim()
            };
            
            APP_STATE.dailyVerse = verse;
            saveDailyVerse(verse);
            displayDailyVerse(verse);
        } else {
            throw new Error('Invalid response from API');
        }
    } catch (error) {
        console.error('Error loading daily verse:', error);
        loader.innerHTML = '<p>Unable to load daily verse. Please check your connection.</p>';
    }
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
    verseText.style.display = 'block';
}

// ========================================
// Bible Books Initialization
// ========================================

function initializeBibleBooks() {
    const oldTestamentContainer = document.getElementById('old-testament-books');
    const newTestamentContainer = document.getElementById('new-testament-books');
    
    // Render Old Testament books
    BIBLE_BOOKS.oldTestament.forEach(book => {
        const btn = createBookButton(book);
        oldTestamentContainer.appendChild(btn);
    });
    
    // Render New Testament books
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
    
    // Update active book button
    const bookButtons = document.querySelectorAll('.book-btn');
    bookButtons.forEach(btn => {
        if (btn.textContent === book.name) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show chapter selection
    showChapterSelection(book);
}

function showChapterSelection(book) {
    const welcome = document.getElementById('bible-welcome');
    const chapterSelection = document.getElementById('chapter-selection');
    const verseDisplay = document.getElementById('verse-display');
    
    welcome.style.display = 'none';
    verseDisplay.style.display = 'none';
    chapterSelection.style.display = 'block';
    
    // Update title
    const title = chapterSelection.querySelector('.selected-book-title');
    title.textContent = book.name;
    
    // Render chapter buttons
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
    
    chapterSelection.style.display = 'none';
    verseDisplay.style.display = 'block';
    
    // Update header
    const chapterTitle = verseDisplay.querySelector('.chapter-title');
    chapterTitle.textContent = `${book.name} ${chapter}`;
    
    // Setup back button
    const backBtn = verseDisplay.querySelector('.btn-back');
    backBtn.onclick = () => {
        verseDisplay.style.display = 'none';
        chapterSelection.style.display = 'block';
    };
    
    // Show loader
    const loader = verseDisplay.querySelector('.verse-loader');
    const versesContainer = verseDisplay.querySelector('.verses-container');
    loader.style.display = 'flex';
    versesContainer.innerHTML = '';
    
    try {
        const reference = `${book.abbr}+${chapter}`;
        const data = await fetchBibleVerse(reference);
        
        if (data && data.verses) {
            renderVerses(data.verses, book.name, chapter);
        } else {
            throw new Error('Invalid chapter data');
        }
        
        loader.style.display = 'none';
    } catch (error) {
        console.error('Error loading chapter:', error);
        loader.innerHTML = '<p>Failed to load chapter. Please try again.</p>';
    }
}

function renderVerses(verses, bookName, chapter) {
    const versesContainer = document.querySelector('.verses-container');
    versesContainer.innerHTML = '';
    
    verses.forEach(verse => {
        const verseItem = document.createElement('div');
        verseItem.className = 'verse-item';
        verseItem.dataset.verse = verse.verse;
        verseItem.id = `verse-${chapter}-${verse.verse}`;
        
        const verseNumber = document.createElement('span');
        verseNumber.className = 'verse-number';
        verseNumber.textContent = verse.verse;
        
        const verseText = document.createElement('span');
        verseText.className = 'verse-text';
        verseText.textContent = verse.text;
        
        const verseActions = document.createElement('div');
        verseActions.className = 'verse-actions';
        
        const reference = `${bookName} ${chapter}:${verse.verse}`;
        const isBookmarked = APP_STATE.bookmarks.some(b => b.reference === reference);
        
        // Bookmark button
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = `verse-action-btn ${isBookmarked ? 'bookmarked' : ''}`;
        bookmarkBtn.innerHTML = isBookmarked ? '★' : '☆';
        bookmarkBtn.setAttribute('aria-label', isBookmarked ? 'Remove bookmark' : 'Add bookmark');
        bookmarkBtn.onclick = () => toggleBookmark(reference, verse.text, bookmarkBtn);
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'verse-action-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.setAttribute('aria-label', 'Copy verse');
        copyBtn.onclick = () => copyToClipboard(`${verse.text} - ${reference}`);
        
        // Share button
        const shareBtn = document.createElement('button');
        shareBtn.className = 'verse-action-btn';
        shareBtn.innerHTML = '🔗';
        shareBtn.setAttribute('aria-label', 'Share verse');
        shareBtn.onclick = () => shareVerse(reference, verse.text);
        
        verseActions.appendChild(bookmarkBtn);
        verseActions.appendChild(copyBtn);
        verseActions.appendChild(shareBtn);
        
        verseItem.appendChild(verseNumber);
        verseItem.appendChild(verseText);
        verseItem.appendChild(verseActions);
        
        versesContainer.appendChild(verseItem);
    });
}

// ========================================
// API Calls
// ========================================

async function fetchBibleVerse(reference) {
    try {
        const url = `https://bible-api.com/${encodeURIComponent(reference)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching Bible verse:', error);
        throw error;
    }
}

// ========================================
// Search Functionality
// ========================================

function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', handleSearchFocus);
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer.contains(e.target)) {
            hideSearchResults();
        }
    });
}

function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    if (APP_STATE.searchTimeout) {
        clearTimeout(APP_STATE.searchTimeout);
    }
    
    if (query.length === 0) {
        hideSearchResults();
        return;
    }
    
    // Debounce search
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
    const referencePattern = /^(\d?\s?[A-Za-z]+)\s+(\d+):?(\d+)?(-\d+)?$/;
    const match = query.match(referencePattern);
    
    if (match) {
        // Direct verse reference search
        try {
            searchResults.innerHTML = '<div class="verse-loader"><div class="spinner"></div></div>';
            searchResults.style.display = 'block';
            
            const data = await fetchBibleVerse(query);
            
            if (data) {
                displaySearchResults([{
                    reference: data.reference,
                    text: data.text,
                    bookName: data.reference.split(' ')[0],
                    chapter: parseInt(data.reference.match(/\d+/)[0])
                }]);
            }
        } catch (error) {
            searchResults.innerHTML = '<div class="search-no-results">Verse not found. Please check the reference.</div>';
        }
    } else {
        // Keyword search - simulate with popular verses
        searchResults.innerHTML = '<div class="search-no-results">Enter a verse reference (e.g., "John 3:16") to search.</div>';
        searchResults.style.display = 'block';
    }
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
        text.textContent = result.text.substring(0, 150) + (result.text.length > 150 ? '...' : '');
        
        item.appendChild(reference);
        item.appendChild(text);
        searchResults.appendChild(item);
    });
}

function hideSearchResults() {
    const searchResults = document.querySelector('.search-results');
    searchResults.style.display = 'none';
}

function navigateToVerse(result) {
    // Navigate to Bible page
    navigateTo('bible');
    
    // Find and select the book
    const allBooks = [...BIBLE_BOOKS.oldTestament, ...BIBLE_BOOKS.newTestament];
    const book = allBooks.find(b => 
        result.reference.toLowerCase().includes(b.name.toLowerCase())
    );
    
    if (book) {
        selectBook(book);
        
        // Extract chapter number from reference
        const chapterMatch = result.reference.match(/\d+/);
        if (chapterMatch) {
            const chapter = parseInt(chapterMatch[0]);
            setTimeout(() => {
                loadChapter(book, chapter);
                
                // Highlight specific verse if present
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
        // Remove bookmark
        APP_STATE.bookmarks.splice(existingIndex, 1);
        button.innerHTML = '☆';
        button.classList.remove('bookmarked');
        button.setAttribute('aria-label', 'Add bookmark');
        showToast('Bookmark removed', 'success');
    } else {
        // Add bookmark
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
    
    // Sort bookmarks by date (newest first)
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
            const verseRef = element.querySelector('.verse-text');
            if (verseRef) {
                const bookmarkBtn = element.querySelector('.verse-action-btn');
                if (bookmarkBtn && bookmarkBtn.classList.contains('bookmarked')) {
                    bookmarkBtn.innerHTML = '☆';
                    bookmarkBtn.classList.remove('bookmarked');
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
    
    // Check if Web Share API is available
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
        // Fallback: Create share links
        const encodedText = encodeURIComponent(shareText);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        const whatsappUrl = `https://wa.me/?text=${encodedText}`;
        
        // Open Twitter share in new tab
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
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// Export for global access
// ========================================

// Make navigateTo available globally for inline onclick handlers
window.navigateTo = navigateTo;
