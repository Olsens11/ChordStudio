# ChordStudio

A free, browser-based chord-diagram and print-sheet formatter for **Ultimate Guitar** chord tabs.

**Repository:** https://github.com/Olsens11/ChordStudio  
**Site after enabling GitHub Pages:** https://olsens11.github.io/ChordStudio/

## What it does

- Imports chord tab metadata, chord changes, and song text from a page you have open on Ultimate Guitar.
- Reads the page's `store.page.data.applicature` chord shapes; preserves stored finger numbers, fret positions, barre definitions, and original chord names.
- Renders labeled guitar diagrams using a compact HTML Canvas renderer inspired by the print page's dimensions.
- Prints the entire formatted song including the chord diagrams and aligned chord/lyric lines.
- Exports the group of labeled diagrams as a PNG or copies them as a PNG for Google Docs.
- Lets you change shapes manually with `Name: x24442`-style codes (also supports multi-digit fret numbers separated by spaces).

## Run it

This is a static site: **index.html** and **app.js**. There is no build step and no server required.

### Host on GitHub Pages

Open **Settings → Pages → Build and deployment**, select **Deploy from a branch**, choose `main` and `/(root)`, then save. The site should appear at https://olsens11.github.io/ChordStudio/ once GitHub publishes it.

### Import songs

1. Paste a Ultimate Guitar chord-tab URL and choose **Open song**.
2. Drag **Send to ChordStudio** to the Chrome bookmarks bar (toggle it with `Ctrl+Shift+B`).
3. Open the chosen Ultimate Guitar tab or its print view, and click the bookmarklet.
4. ChordStudio opens in another tab with the chord data and complete text.

**Why a bookmarklet?** A GitHub Pages site cannot directly read HTML at `tabs.ultimate-guitar.com` from its URL because the browser enforces cross-origin restrictions (CORS). The bookmarklet executes in the tab you already opened and transfers the page's own embedded data to ChordStudio through a URL fragment. It includes only the first three available shapes per chord, plus song text and metadata. The fragment is not sent to the GitHub Pages server and is cleared by ChordStudio after loading, though it may briefly be in browser history. Browser or site policy may block bookmarklets on some pages.

If needed, choose **Import saved page source or paste JSON / HTML**, then import a saved Ultimate Guitar source page containing `.js-store[data-content]`.

### Export

- **Print / Save PDF**: printable chord diagrams plus song text.
- **Copy diagrams for Docs**: copy a single high-resolution PNG containing chord names and shapes; paste it into Google Docs with `Ctrl+V`.
- **Download PNG**: fallback if image clipboard access is unavailable.

## Notes and limitations

- The Canvas drawing code is an independent reconstruction of the small print-diagram style; it isn't Ultimate Guitar's copyrighted JavaScript.
- The six-character code alone does not specify exact barre placement or finger numbers. Imported `applicature` data provides those extra details. Custom shapes without matching data render fret dots, but may not show complete finger numbers or barres.
- The first three voicings from each chord are transferred by the bookmarklet, but the editor initially chooses the first. Importing saved page JSON can load more voicings.
- The project is not affiliated with Ultimate Guitar. No copyrighted song text is stored in this repository; song content remains on the user's device during import.
