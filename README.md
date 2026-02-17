# The Word - Bible Study App

A modern, production-ready, responsive Bible web application built with HTML, CSS, and JavaScript. Study scripture with ease using features like search, bookmarks, and dark mode.

## 🌟 Features

- **📖 Complete Bible Access** - Read all 66 books of the Bible (Old and New Testament)
- **🔍 Powerful Search** - Search verses by reference (e.g., "John 3:16") with instant results
- **🔖 Bookmarks** - Save your favorite verses and access them anytime
- **📱 Fully Responsive** - Optimized for mobile, tablet, and desktop devices
- **🌓 Dark/Light Mode** - Toggle between themes for comfortable reading at any time
- **📋 Copy to Clipboard** - Easily copy verses to share or save
- **🔗 Social Sharing** - Share verses on Twitter, WhatsApp, and other platforms
- **💾 Offline Storage** - Bookmarks and preferences persist using localStorage
- **📅 Daily Verse** - Get a new inspiring verse every day
- **♿ Accessible** - WCAG AA compliant with keyboard navigation and screen reader support

## 🖼️ Screenshots

### Home Page
![Home Page - Light Mode](screenshots/home-light.png)
*Clean, welcoming home page with daily verse widget*

### Bible Reading Interface
![Bible Page](screenshots/bible-reading.png)
*Intuitive book and chapter selection with verse display*

### Bookmarks Collection
![Bookmarks](screenshots/bookmarks.png)
*Manage and access your saved verses*

### Dark Mode
![Dark Mode](screenshots/dark-mode.png)
*Comfortable reading experience in low light*

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Internet connection for fetching Bible content

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/batyaboyo/bible_app.git
   cd bible_app
   ```

2. **Open the app**
   - **Option 1**: Simply open `index.html` in your web browser
   - **Option 2**: Use a local server for better experience
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Node.js
     npx serve
     
     # Using PHP
     php -S localhost:8000
     ```
   - **Option 3**: Use VS Code Live Server extension

3. **Access the app**
   - If using a local server, open `http://localhost:8000` in your browser
   - If opening directly, double-click `index.html`

That's it! No build process or dependencies required.

## 📖 How to Use

### Reading the Bible

1. Click **"Bible"** in the navigation menu
2. Select a book from the sidebar (organized by Old and New Testament)
3. Choose a chapter from the grid
4. Read verses with smooth scrolling and formatting
5. Use the bookmark (★) icon to save favorite verses
6. Copy (📋) or share (🔗) any verse with one click

### Searching Verses

1. Use the search bar on the Bible page
2. Enter a verse reference:
   - Full reference: `John 3:16`
   - Chapter range: `Psalm 23:1-6`
   - Multiple chapters: `Romans 12`
3. Click a search result to navigate directly to that verse
4. The verse will be highlighted when you arrive

### Managing Bookmarks

1. Click the star icon (☆) on any verse to bookmark it
2. Access all bookmarks from the **"Bookmarks"** page in the navigation
3. View, copy, share, or remove bookmarks
4. Bookmarks are automatically saved and persist across sessions

### Dark Mode

- Click the moon/sun icon (🌙/☀️) in the header to toggle themes
- Your preference is automatically saved
- Smooth transitions between light and dark modes

### Daily Verse

- Visit the home page to see today's featured verse
- A new verse appears each day from a curated selection
- The daily verse is cached for the day (updates at midnight)

## 🔧 Technical Details

### Built With

- **HTML5** - Semantic markup for structure
- **CSS3** - Modern styling with custom properties (CSS variables)
- **Vanilla JavaScript** - No frameworks or libraries required
- **Bible API** - [bible-api.com](https://bible-api.com) for scripture text (KJV)

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### API Information

This app uses the free **Bible API** service:
- Base URL: `https://bible-api.com/`
- Translation: King James Version (KJV)
- No authentication required
- Rate limits: Reasonable personal use

**Example API calls:**
```
https://bible-api.com/John+3:16          # Single verse
https://bible-api.com/Romans+12:1-2      # Verse range
https://bible-api.com/Psalm+23           # Full chapter
```

### Data Storage

All data is stored locally in your browser using `localStorage`:
- **Bookmarks**: Verse reference, text, and timestamp
- **Theme preference**: Dark/light mode setting
- **Daily verse cache**: Current day's featured verse

No data is sent to external servers except API requests for Bible content.

## 🧪 Testing Features

### Search Functionality
1. Navigate to the Bible page
2. Enter `John 3:16` in the search bar
3. Verify the verse appears in search results
4. Click the result to navigate to the verse
5. Confirm the verse is highlighted

### Bookmarks
1. Navigate to any Bible chapter
2. Click the star icon on a verse
3. Go to the Bookmarks page
4. Verify the verse appears in your bookmarks
5. Click "Remove" and confirm it's deleted
6. Refresh the page and verify bookmarks persist

### Dark Mode
1. Click the theme toggle in the header
2. Verify smooth transition to dark mode
3. Refresh the page and verify preference persists
4. Toggle back to light mode

### Copy Feature
1. Navigate to any verse
2. Click the copy icon (📋)
3. Verify toast notification appears
4. Paste into a text editor to confirm content

### Share Feature
1. Click the share icon (🔗) on any verse
2. If available, Web Share API dialog appears
3. Otherwise, Twitter share opens in new tab

### Responsive Design
1. Resize browser window to mobile width (< 768px)
2. Verify mobile menu toggle appears
3. Check that all features work on mobile
4. Test on actual mobile device

### Keyboard Navigation
1. Use Tab key to navigate through interactive elements
2. Verify focus indicators are visible
3. Use Enter/Space to activate buttons
4. Confirm all features are keyboard accessible

## 🌐 Deployment

### GitHub Pages
```bash
# Push to main branch
git push origin main

# Enable GitHub Pages in repository settings
# Select source: main branch, root directory
```

### Netlify
```bash
# Drag and drop the project folder to Netlify
# Or connect your GitHub repository
```

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Traditional Web Hosting
Simply upload all files to your web server via FTP or hosting control panel.

## 🔮 Future Enhancements

- [ ] Multiple Bible translations (NIV, ESV, NASB, etc.)
- [ ] Audio Bible with text highlighting
- [ ] Study notes and commentary
- [ ] Reading plans and schedules
- [ ] Verse comparisons across translations
- [ ] Highlighting and note-taking features
- [ ] Social features (share study notes)
- [ ] Progressive Web App (PWA) for offline reading
- [ ] Verse memorization tools
- [ ] Advanced search with filters
- [ ] Print-friendly formatting
- [ ] Import/export bookmarks

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and structure
- Test on multiple browsers and devices
- Ensure accessibility standards are maintained
- Update documentation as needed
- Keep file sizes minimal (no large dependencies)

## 🐛 Known Issues

- Search currently only supports direct verse references
- Large chapters (150 Psalms) may take a moment to load
- API rate limits may apply for heavy usage

## 📄 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2024 Bible App

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- **Bible API** ([bible-api.com](https://bible-api.com)) - For providing free access to scripture
- **Google Fonts** - Inter and Merriweather typefaces
- **King James Version** - The translation of the Holy Bible used in this application

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Known Issues](#-known-issues) section
2. Review existing [GitHub Issues](https://github.com/batyaboyo/bible_app/issues)
3. Create a new issue with detailed information about your problem

## 🌟 Show Your Support

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🍴 Forking for your own use
- 📢 Sharing with others who might benefit
- 🤝 Contributing improvements

---

**Made with ❤️ for Bible study and spiritual growth**

*"Thy word is a lamp unto my feet, and a light unto my path." - Psalm 119:105*