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

This static site uses **index.html**, **app.js**, **layout.js**, **layout.css**, and **project.js**. No build step or application server is required.

To enable GitHub Pages: **Settings → Pages → Build and deployment → Deploy from a branch**, using `main` and `/(root)`.

## Starting a song

1. Open ChordStudio and drag the yellow **↗ ChordStudio** link to the bookmarks bar (show it with `Ctrl+Shift+B`). This is the one-time import setup. The link has no decorative favicon; Chrome generally supplies its own globe icon for JavaScript bookmarks.
2. Visit a compatible chord-tab song page normally and click the bookmark. ChordStudio opens the song with its diagrams and text.
3. After a successful import, the **Original song page** URL appears above the workspace options, with **Open original ↗** for returning to the source page. It is a reference link, not an import step.

Some source websites block direct cross-origin requests, so the importer uses chord data present on the page you are visiting. You can also import saved HTML/JSON manually through **Import saved page source**, if needed. The bookmarklet sends the song and original URL through a temporary page fragment, then clears the fragment. Site or browser policies may prevent importing from some pages.

## Save and reopen a project

Use **Save Project** in the workspace toolbar to download a local `.chordstudio` file. This includes the source URL, imported chord voicings, chord order and exclusions, edited song text and formatting, selected paper/font/options, placed diagram copies, note content and styles, sticker coordinates and sizes, and the floating tray state.

Use **Open Project** in the toolbar, or **Open saved project…** on the welcome screen, to select the file later. You can continue editing and print again without revisiting the original song page. Nothing is uploaded to a server; files stay on your computer unless you share them yourself. Remember to save again after making later changes.

## Editing the song before printing

After importing a song, choose **Edit song text** above the preview. This opens a large in-page editor displaying chords and lyrics exactly as they appear in the print sheet, without showing raw tab markup.

- Edit the song text, correct chord names, or reposition chord labels by changing the spaces before them.
- Select text and choose **Bold**, **Italic**, or **Underline**.
- Choose a monospaced font, text size, and line spacing. Monospaced fonts help keep the chord annotations aligned with lyrics.
- **Apply changes** updates the printable preview.
- **Apply & print** applies your changes and opens the browser's print dialog.
- **Cancel** discards uncommitted edits; **Restore imported text** reverts the editor to its initial imported content.

Printing via Ctrl+P while the editor is open also applies the current edits. Unsaved changes remain only in the open browser tab; use **Save Project** to preserve them before refreshing or closing ChordStudio.

## Printing and Google Docs

- **Print / Save PDF**: print the sheet with chord diagrams and your edited song text.
- **Copy diagrams to clipboard**: copy a high-resolution PNG containing chord names and diagrams, then paste into Google Docs with `Ctrl+V`.
- **Download PNG**: save the diagrams if clipboard image access is unavailable.

## Organize chords and prepare printable pages

ChordStudio separates activities into three sections: **Bring a song**, **Chord bank organizer**, and **Output preview**. The first two sections can be collapsed; importing a song automatically folds the first. The **Original song page** link appears above the preview controls.

**Chord bank organizer:** Reorder or remove source chords, edit their voicings, choose the number of columns, and use **Copy diagrams to clipboard** / **Download PNG**. The independent **Diagram** and **Fret codes** checkboxes control each chord's appearance. Select diagram-only, codes-only, or both; the interface prevents both from being off. The printed opening CHORDS bank uses the organizer's presentation choice whenever **Print chord bank** is selected. While reordering, the other cards stay still and a single blue insertion marker shows the intended drop location. They move only when the chord is dropped, avoiding rapid reshuffling.

**Output preview:** The original-song link sits above a slim **one-row sticky toolbar**, inspired by desktop text editors. Its **File** menu contains Open Project and Save Project. **Edit** contains Edit song text, Undo/Redo for sticker placement, and Clear placed items. **View** holds Print chord bank, Song text, Song font, and Paper size. **Open/Hide sticker tray** and **Print / PDF** remain visible at all times. File/Edit/View open with a click, only one menu opens at once, and clicking elsewhere or pressing Escape dismisses the menu. Disabling Print chord bank removes the bank from printed pages but never removes the available chord sources.

**Sticker tray:** The fixed side tray has its own independent **Diagram** and **Fret codes** toggles, plus **Add text note**. Drag a chord from the organizer, the tray, or the opening printed bank onto a page as many times as desired. Each chord sticker records the content mode (diagram-only, codes-only, or both) it had **when created** and doesn't unexpectedly change when the toggles change later. All versions are resizable from the corner and can be repositioned or Shift-duplicated; Ctrl+Shift while dragging snaps invisibly to the common page-based 5px grid and magnetically aligns nearby sticker edges. Undo/Redo includes sticker creation, movement, resizing and removal.

**Text notes:** Click **Add text note** then click the paper using the text-box cursor. Format notes with font size, bold/italic, alignment, text color and optional background; the default is black on transparent. Resize a note to scale both its box and text without rewrapping. Notes are independently editable and participate in the same placement history.

The page preview is built from actual Letter or A4 page boxes; those same elements are used in the PDF. Use the matching paper size, 100% scaling, and disable browser headers/footers if offered. Sticker annotations float over the document rather than reflowing the lyrics underneath. Use **Save Project** before closing the tab if you wish to preserve the session.

## Notes

- The drawing code is original and does not bundle external site scripts or copyrighted songs.
- Six-character fret codes contain no finger numbers or barre markers. Imported rich chord data can supply those details; manually created shapes may omit annotations.
- The first voicing is shown by default. Additional imported shapes are retained when available.
- Content is formatted locally in the browser. This project is not affiliated with source websites. Respect applicable terms and only import or reproduce material you have permission to use.
