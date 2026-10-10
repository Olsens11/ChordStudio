# ChordStudio

An independent, browser-based **chord-diagram and song-sheet formatter**.

**Repository:** https://github.com/Olsens11/ChordStudio  
**Live site:** https://olsens11.github.io/ChordStudio/

## Features

- Import chord shapes, chord changes, and song text from compatible chord-tab pages.
- Preserve fret positions, finger numbers, barre indicators, and chord names when that data is available.
- Render labeled guitar chord diagrams using an independent HTML Canvas implementation.
- Print a song with its chord diagrams and chord-and-lyric lines, or save to PDF.
- Copy a PNG of the diagram collection into Google Docs, or download the PNG.
- Edit individual shapes using `E: 022100`, `B: x24442`, or space-separated codes for higher frets.

## Hosting

This static site uses **index.html** and **app.js**. No build step or application server is required.

To enable GitHub Pages: **Settings → Pages → Build and deployment → Deploy from a branch**, using `main` and `/(root)`.

## Importing a song

1. Enter a compatible chord-tab page URL and select **Open song**.
2. Drag **Send to ChordStudio** to your Chrome bookmarks bar (show it with `Ctrl+Shift+B`). Delete and replace any earlier bookmarklet, because a saved bookmarklet doesn't automatically update.
3. Visit the chord-tab song page or its print view, and click the bookmarklet.
4. ChordStudio opens in a new tab with the song's available diagrams and text.

Some other websites restrict cross-origin browser requests, so a GitHub Pages site cannot automatically fetch their HTML from a pasted URL. The bookmarklet reads embedded data from a page you have opened. It sends title, artist, text and up to three fingerings per chord to the editor using a URL fragment, not a network API. The fragment is cleared after importing, though it may briefly appear in browser history. Browser or source-site policies may block the bookmarklet.

For manual importing, use saved HTML or JSON. The current importer recognizes `.js-store[data-content]` with `applicature` objects in the song data or a nested `tab_view`. Not every tab site or page format is supported.

## Editing the song before printing

After importing a song, choose **Edit song text** above the preview. This opens a large in-page editor displaying chords and lyrics exactly as they appear in the print sheet, without showing raw tab markup.

- Edit the song text, correct chord names, or reposition chord labels by changing the spaces before them.
- Select text and choose **Bold**, **Italic**, or **Underline**.
- Choose a monospaced font, text size, and line spacing. Monospaced fonts help keep the chord annotations aligned with lyrics.
- **Apply changes** updates the printable preview.
- **Apply & print** applies your changes and opens the browser's print dialog.
- **Cancel** discards uncommitted edits; **Restore imported text** reverts the editor to its initial imported content.

Printing via Ctrl+P while the editor is open also applies the current edits. Changes are stored in the current browser page only; refreshing or reimporting the song clears them.

## Printing and Google Docs

- **Print / Save PDF**: print the sheet with chord diagrams and your edited song text.
- **Copy diagrams to clipboard**: copy a high-resolution PNG containing chord names and diagrams, then paste into Google Docs with `Ctrl+V`.
- **Download PNG**: save the diagrams if clipboard image access is unavailable.

## Page layout and chord selection

- Open **Edit song text** to adjust your song in a large editor. Dashed blue lines mark **estimated** starts of new printed pages.
- Choose **US Letter** or **A4** paper and toggle page-break guides on or off. Estimates account for the title, currently selected diagrams, font size and line spacing; your browser's actual print preview is the final authority.
- Hover over a chord diagram for the **× Remove** button. This removes only that diagram from the print sheet and PNG exports, not chord annotations within song lyrics.
- Use **Undo**, **Redo**, and **Restore all chords** above the diagrams to refine your selection. Keeping just one unusual fingering is supported.
- Removing/restoring diagrams refreshes the page-break estimate so you can revise the song layout accordingly.

## Notes

- The drawing code is original and does not bundle external site scripts or copyrighted songs.
- Six-character fret codes contain no finger numbers or barre markers. Imported rich chord data can supply those details; manually created shapes may omit annotations.
- The first voicing is shown by default. Additional imported shapes are retained when available.
- Content is formatted locally in the browser. This project is not affiliated with source websites. Respect applicable terms and only import or reproduce material you have permission to use.
