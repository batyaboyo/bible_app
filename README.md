# The Word - Bible Study App

A modern, responsive Bible web application built with HTML, CSS, and vanilla JavaScript. Study scripture across hundreds of translations, explore classic commentaries, bookmark verses, and enjoy a beautiful reading experience — all without any build tools or dependencies.

## Features

- **Complete Bible Access** — Read all 66 books across hundreds of translations (BSB, KJV, WEB, and many more)
- **Multiple Translations** — Switch between translations on the fly with a searchable version selector
- **Classic Commentaries** — Read alongside Matthew Henry, John Gill, Adam Clarke, Jamieson-Fausset-Brown, Keil & Delitzsch, and Tyndale commentaries
- **Rich Chapter Rendering** — Section headings, footnotes with tooltips, poetry indentation, and Hebrew subtitles
- **Verse Search** — Search by reference (e.g., "John 3:16", "Psalm 23:1-6")
- **Bookmarks** — Save, manage, copy, and share your favorite verses
- **Daily Verse** — A curated verse each day, cached until midnight
- **Dark / Light Mode** — Toggle themes with automatic preference persistence
- **Copy & Share** — One-click copy to clipboard or share via Web Share API / Twitter / WhatsApp
- **Keyboard Shortcuts** — Navigate chapters, toggle theme, open search, and more from the keyboard
- **Fully Responsive** — Optimized layout for mobile, tablet, and desktop
- **Accessible** — Semantic HTML, ARIA attributes, keyboard navigation, and screen reader support
- **Print Styles** — Clean, ink-friendly formatting when printing chapters
- **Zero Dependencies** — No frameworks, no build step — just open `index.html`

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- An internet connection (Bible content is fetched from the HelloAO API)

### Installation

```bash
git clone https://github.com/batyaboyo/bible_app.git
cd bible_app
```

Then open the app using any of these methods:

| Method | Command |
|--------|---------|
| Direct | Double-click `index.html` |
| Python | `python -m http.server 8000` |
| Node.js | `npx serve` |
| VS Code | Use the **Live Server** extension |

No build process required.

## Usage

### Reading

1. Navigate to **Bible** from the header.
2. Pick a book from the sidebar (Old / New Testament).
3. Select a chapter from the grid.
4. Read with section headings, footnotes, and poetry formatting.

### Switching Translations

Use the **version selector** dropdown in the toolbar. Translations are loaded dynamically from the API and filtered to English by default. Your choice is saved across sessions.

### Commentaries

1. Select a commentary from the **commentary dropdown** in the toolbar.
2. A panel appears below the chapter text with the commentary for that chapter.
3. Expand individual verse sections or the chapter introduction.

### Searching

Enter a reference in the search bar — e.g., `John 3:16`, `Romans 12`, or `Psalm 23:1-6`. Click a result to jump directly to the highlighted verse.

### Bookmarks

- Click the **star icon** (☆) on any verse to bookmark it.
- View all bookmarks from the **Bookmarks** page.
- Copy, share, or remove bookmarks. They persist in `localStorage`.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / next chapter |
| `D` | Toggle dark mode |
| `/` | Focus search bar |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 (semantic) |
| Styling | CSS3 with custom properties, responsive design, print styles |
| Logic | Vanilla JavaScript (ES2020+) |
| Fonts | [Inter](https://fonts.google.com/specimen/Inter) + [Merriweather](https://fonts.google.com/specimen/Merriweather) via Google Fonts |
| API | [HelloAO Bible API](https://bible.helloao.org) |
| Storage | `localStorage` for bookmarks, theme, translation, and daily verse cache |

### API

The app uses the free **HelloAO Bible API** — a static JSON REST API with no authentication required.

| Endpoint | Description |
|----------|-------------|
| `/api/available_translations.json` | All available translations |
| `/api/available_commentaries.json` | All available commentaries |
| `/api/{translation}/books.json` | Books for a translation |
| `/api/{translation}/{book}/{chapter}.json` | Chapter content (verses, headings, footnotes) |
| `/api/c/{commentary}/{book}/{chapter}.json` | Commentary for a chapter |

Base URL: `https://bible.helloao.org`

### Browser Support

Chrome 90+ · Firefox 88+ · Safari 14+ · Edge 90+

### Data & Privacy

All user data (bookmarks, preferences) stays in your browser's `localStorage`. No analytics, no tracking, no external data collection — only API requests for Bible content.

## Project Structure

```
bible_app/
├── index.html      # Single-page app shell (4 views: Home, Bible, Bookmarks, About)
├── style.css       # Complete styling with theming, responsive, and print rules
├── script.js       # Application logic, API integration, state management
├── favicon.svg     # SVG favicon (book with cross emblem)
└── README.md
```

## Deployment

Works on any static hosting platform:

- **GitHub Pages** — Push to `main`, enable Pages in repo settings
- **Netlify / Vercel** — Connect the repo or drag-and-drop the folder
- **Any web server** — Upload the files via FTP or your hosting control panel

## Future Ideas

- [ ] Multi-language translation browsing
- [ ] Audio Bible playback (API provides audio links)
- [ ] Full-text search across chapters
- [ ] Reading plans and schedules
- [ ] Verse comparison across translations
- [ ] Highlighting and note-taking
- [ ] Progressive Web App (PWA) for offline reading
- [ ] Import / export bookmarks

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please follow existing code style, test across browsers, and maintain accessibility standards.

## License

MIT — see [LICENSE](LICENSE) for details.

## Acknowledgments

- **[HelloAO Bible API](https://bible.helloao.org)** — Scripture text and commentaries
- **[Google Fonts](https://fonts.google.com)** — Inter and Merriweather typefaces

---

*"Thy word is a lamp unto my feet, and a light unto my path." — Psalm 119:105*