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

This static site uses **index.html**, **app.js**, **layout.js**, and **layout.css**. No build step or application server is required.

To enable GitHub Pages: **Settings → Pages → Build and deployment → Deploy from a branch**, using `main` and `/(root)`.

## Importing a song

1. Enter a compatible chord-tab page URL and select **Open song**.
2. Drag **↗ ChordStudio** to your Chrome bookmarks bar (show it with `Ctrl+Shift+B`). The saved JavaScript bookmarklet is labeled **↗ ChordStudio**. The website has a dark-blue favicon containing a white C and light-blue S, but Chrome controls the icon for `javascript:` bookmarks, which may still show a globe. Delete and replace any earlier bookmarklet if you want the shorter label, because a saved bookmarklet's name doesn't automatically update.
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

## Paper-sized preview and chord stickers

The main preview is a stack of **actual paper-sized page boxes**, not a continuous document with estimated page-break lines. Pages are laid out automatically using the selected song font, line spacing, chord bank, and paper size. The same page boxes are used in Chrome's printed PDF output.

1. Choose **US Letter** or **A4** from the layout toolbar. The preview repaginates immediately.
2. The **chord bank** above the page boxes is a palette. As you drag a diagram within it, a dashed **Drop here** gap opens and the neighboring chords animate out of the way, so you can preview the new order before releasing. You can also hide unwanted chords with the red ×, then use Undo/Redo or Restore all. The **Print chord bank** checkbox controls whether the selected bank appears at the beginning of the printed sheet; the palette itself remains available.
3. **Drag a diagram from either the chord bank above the pages or the CHORDS bank printed within a page.** A ghost diagram follows the pointer, and the source stays in place. Drop it onto any page to create an independent, movable sticker; repeat as often as you like, including multiple copies of the same chord. While you drag, the page auto-scrolls near the top and bottom of the browser window. Position stickers in whitespace rather than over lyrics.
4. **Drag a placed sticker** to move it within its page or onto another page. The moving preview keeps its current scale, transparent background, dashed outline, and grab-point alignment, so the position shown is the final drop position. **Shift+click** a placed sticker to duplicate it with the same shape and size, slightly offset. **Shift+drag** a placed sticker also makes a copy (Alt+drag remains supported). **Ctrl+Shift while dragging** enables an invisible 5-pixel snap grid; use that combination alone when you want to align without duplicating. **Drag the lower-right resize handle** in or out to shrink or enlarge the entire sticker (chord name and diagram) while keeping its aspect ratio. Stickers have transparent backgrounds, so blank areas do not obscure song text. The centered red × removes that sticker. Alt+arrow keys move a focused sticker 5 pixels (Shift+Alt+arrow moves 20). The **Undo placement**, **Redo placement**, and **Clear placed diagrams** controls manage these changes separately from chord-bank changes. Resizing is a single Undo/Redo step per completed corner drag.
5. Choose **Open sticker tray** to pop out a compact reusable chord palette. It stays fixed beside the pages as you scroll; drag any chord from the tray to any page, as often as needed. Close it with × or the tray toggle. The tray and controls do not print.
6. Click **✎ Add text note** in the floating tray, then click anywhere on a printable page. The note editor opens beneath the placed note (or above it when there isn't room) with a multiline text box, font size, bold/italic, alignment, ink color, and **Background** color (default: None/transparent). Edits immediately appear in the page preview and in PDF output. Click **Done**, or click an existing note to edit it again. Text notes can be moved, resized proportionally from the corner (the glyphs and pre-existing line breaks scale together rather than reflowing), removed, Shift-click duplicated, and Ctrl+Shift snapped to the same **invisible, page-anchored 5px grid** as diagram stickers. When a moving edge is near another sticker, magnetic alignment locks them to exactly the same x/y or corresponding edge coordinate. Undo/Redo covers all note actions.
7. The printable song body is intentionally **not editable**. Text notes are separately editable using their pop-out controls. Use **Edit song text** to edit words, chords, font, and spacing, then **Apply changes** to repaginate these same page boxes.
8. Choose **Print / Save PDF** when satisfied. The editor/palette controls are hidden, but sticker images and their page positions are retained.

The browser's print setting must use the same paper size as the layout selector; leave scaling at 100% and disable browser headers/footers if offered. An ordinary physical printer may have unprintable edges that differ from PDF output. Placed stickers float above the song text instead of reflowing words around them, so avoid covering lyrics. Changes live in the current browser tab until refreshed or reimported.

## Notes

- The drawing code is original and does not bundle external site scripts or copyrighted songs.
- Six-character fret codes contain no finger numbers or barre markers. Imported rich chord data can supply those details; manually created shapes may omit annotations.
- The first voicing is shown by default. Additional imported shapes are retained when available.
- Content is formatted locally in the browser. This project is not affiliated with source websites. Respect applicable terms and only import or reproduce material you have permission to use.
