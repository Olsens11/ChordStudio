# ChordStudio

An independent, browser-based songwriting and chord-diagram studio for **original compositions** and imported chord sheets.

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

**Write an original song:** Choose **Write my own song** in the Bring a song section. Enter a title and an optional artist/songwriter name, then select **Start writing**. ChordStudio opens a genuinely blank editor—no imported text or example diagrams are included. Type your lyrics and chords directly, then choose **Apply changes** to update the printable pages. Use **+ Create chord** in the organizer to build each diagram from scratch (dots, barres, finger numbers and high-fret codes). The first chord automatically makes the printable chord bank visible. Start with no chords if you prefer a lyrics-only sheet. You can **Save Project** and reopen it even before creating any chord diagrams. Use **File → New document** (Ctrl+N) to start a fresh original sheet and **Edit → Edit song title & artist…** to update the heading later. ChordStudio will ask before replacing existing song content when starting a new one.

**Import an existing song:** The import path remains alongside original songwriting. To use the bookmarklet:

1. Open ChordStudio and drag the yellow **↗ ChordStudio** link to the bookmarks bar (show it with `Ctrl+Shift+B`). This is the one-time import setup. Clicking the yellow link opens installation help with a **Copy bookmarklet code** option instead of trying to run the importer on ChordStudio itself. Browsers do not allow websites to create bookmarks directly; if dragging is unavailable, create a bookmark and replace its URL with the copied bookmarklet. The link has no decorative favicon.
2. Visit a compatible chord-tab song page normally and click the bookmark. ChordStudio opens the song with its diagrams and text.
3. After a successful import, the **Original song page** URL appears above the workspace options, with **Open original ↗** for returning to the source page. It is a reference link, not an import step.

The alternate importer accepts a pasted HTTP(S) song-page URL as well as saved HTML or JSON. It tries to fetch the URL directly. If a source site blocks cross-origin access, ChordStudio shows a helpful message and **Open song page** link; use the ↗ ChordStudio bookmark on the opened page. Some source websites block direct cross-origin requests, so the importer normally uses chord data present on the page you are visiting. You can also import saved HTML/JSON manually through **Import saved page source**, if needed. The bookmarklet sends the song and original URL through a temporary page fragment, then clears the fragment. Site or browser policies may prevent importing from some pages.

## Save and reopen a project

Use **Save Project** in the workspace toolbar to download a local `.chordstudio` file. This includes the source URL, imported chord voicings, chord order and exclusions, edited song text and formatting, selected paper/font/options, placed diagram copies, note content and styles, sticker coordinates and sizes, and the floating tray state.

Use **Open Project** in the toolbar, or **Open saved project…** on the welcome screen, to select the file later. You can continue editing and print again without revisiting the original song page. Nothing is uploaded to a server; files stay on your computer unless you share them yourself. Remember to save again after making later changes.

## Editing the song before printing

After importing a song—or starting an original—choose **Edit song text** in the Edit menu above the preview. This opens a large in-page editor displaying chords and lyrics exactly as they appear in the print sheet, without showing raw tab markup.

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

**Chord bank organizer:** Reorder or remove source chords, edit their voicings, choose the number of columns, and use **Copy diagrams to clipboard** / **Download PNG**. **+ Create chord** opens a graphical diagram builder with six strings, five visible frets, selectable top fret (including high double digits), fret-code input using six positions, dot placement by clicking string/fret cells, barres drawn by dragging between strings on one fret, a separate six-string fingering row, mute/open string buttons, live preview and chord name. **✎** on any organizer chord reopens that shape for editing. Click Save to store it in the bank, tray and project. The builder checks that fretted notes fit within the chosen five-fret window. Beside the **Chord name** field, **Suggest voicing** searches playable fret positions using the selected tuning and chord's actual sounding pitches; **‹ / ›** cycle different matches while keeping diagram and fret code synchronized. Familiar standard-tuning shapes are prioritized when valid. This first version covers major/minor, common seventh, suspended, diminished, augmented and extended chord formulas, and common slash-bass inversions; the user can always draw or enter another fret code manually. **↺ Reset drawing** clears frets and fingerings but keeps the name/tuning. The old **Finger for selected dot/barre** selector has been replaced with a six-column fingering row (low string to high), showing **– / 1 / 2 / 3 / 4** per fretted string. Suggested shapes receive estimated finger numbers (editable or clearable); imported numbers are preserved on opening an existing chord. **Diagram labels** toggles between ordinary dots and sounding note names, including open strings. Named-note diagrams use a slightly wider canvas so adjacent accidental symbols remain separate and centered. **Note spelling** can follow the selected song key, prefer sharps or prefer flats; buttons for individual accidental pitches permit switching e.g. F# to Gb in one chord. These choices are preserved on printed/exported diagrams and in saved projects. The organizer and builder include an explicit **Guitar tuning** selector (Standard, Drop D, DADGAD, Open G, Open D, Open E, half-step down, whole-step down, or custom six string notes with octaves). The tuner defaults to *unconfirmed* Standard. Chord naming computes actual sounding pitches and bass notes using the selected tuning; it never assumes alternate-tuned strings are EADGBE. The builder suggests multiple possible chord names from supported exact pitch-class patterns and bass inversions, but leaves the choice to the composer because harmonic context affects chord spelling and function. Tuning is stored in .chordstudio project files; older files default to unconfirmed Standard tuning. The independent **Diagram** and **Fret codes** checkboxes control each chord's appearance. Select diagram-only, codes-only, or both; the interface prevents both from being off. The printed opening CHORDS bank uses the organizer's presentation choice whenever **Print chord bank** is selected. While reordering, the other cards stay still and a single blue insertion marker shows the intended drop location. They move only when the chord is dropped, avoiding rapid reshuffling.

**Output preview:** The original-song link sits above a slim **one-row sticky toolbar**, inspired by desktop text editors. Its **File** menu contains **New document (Ctrl+N)**, Open Project, **Recent projects**, **Save (Ctrl+S)**, **Save As (Ctrl+Shift+S)**, **Import image**, **Print**, and **Export as PDF**. New projects prompt for a filename at their first save. On Chrome browsers with supported native file access, the user chooses a file and later Save updates the same file; Save As chooses a new file. Elsewhere Save safely downloads new project copies and the browser may number duplicate names; it does not silently overwrite downloads. **Print** uses Chrome's native printer dialog; web pages cannot preselect its destination. **Export as PDF** instead downloads a PDF directly without showing a destination selector. The direct export captures each printable paper page at high resolution, so text in that PDF is image-based. Use Chrome's native Print → Save as PDF if you need selectable text. **Edit** clearly separates **Song text** (Undo Ctrl+Z, Redo Ctrl+Shift+Z) from **Stickers & images** (their own Undo/Redo and Clear). While the lyrics editor is open, two compact text Undo/Redo buttons appear immediately after View. **View** holds Print chord bank, Song text, Song font, Paper size, and **Toggle fullscreen (F11)**. Clicking Toggle fullscreen enters/exits page fullscreen (using the browser Fullscreen API), while pressing F11 uses the browser's own fullscreen shortcut. **Save project** (small floppy-disk icon), **Open/Hide sticker tray**, and **Print / PDF** remain visible at all times. File/Edit/View open with a click, only one menu opens at once, and clicking elsewhere or pressing Escape dismisses the menu. Disabling Print chord bank removes the bank from printed pages but never removes the available chord sources.

**Sticker tray:** The fixed side tray has its own independent **Diagram** and **Fret codes** toggles, plus **Add text note**. Drag a chord from the organizer, the tray, or the opening printed bank onto a page as many times as desired. Each chord sticker records the content mode (diagram-only, codes-only, or both) it had **when created** and doesn't unexpectedly change when the toggles change later. All versions are resizable from the corner and can be repositioned or Shift-duplicated; Ctrl+Shift while dragging snaps invisibly to the common page-based 5px grid and magnetically aligns nearby sticker edges. Each sticker now has an on-page **↻ rotation handle** above it: drag for free-angle rotation, hold Shift for 15° snapping, or use Alt+R while the sticker is focused for 15° turns (Shift+Alt+R reverses). The current angle appears while dragging. Undo/Redo includes sticker creation, movement, resizing, rotation and removal.

**Editable song page boundaries:** Open **Edit song text** and keep **Show page boundaries in editor** enabled to see labeled dashed lines for pages 2, 3, etc. They come directly from a temporary measurement of the real printable page boxes, and update as you type, format, or change paper/font settings. Text editing has its own undo stack and Ctrl+Z/Ctrl+Shift+Z shortcuts, independent of sticker changes.

**Imported images:** Use **File → Import image** or **Import image** beneath **Add text note** in the floating tray. You can also drop a local PNG/JPEG/WebP/GIF onto a printable page or paste a clipboard image with Ctrl+V while focused outside text inputs. Small images go straight into placement mode. Larger images open a crop/rotate dialog; drag a crop rectangle in the preview, rotate left/right, reset crop, then apply. The image is automatically optimized to a practical resolution and WebP size. A dropped large image returns to the intended drop position after processing. Click any placed image to reopen its crop/rotate dialog. Images remain independently draggable, Shift-duplicable, and proportionally resizable, including down to tiny **18px thumbnail dimensions** regardless of their imported resolution. Rotate them by any angle with the on-page ↻ handle (Shift snaps to 15°); the image-editing popup retains 90° rotation for crop preparation. All those actions work with Undo/Redo and PDF output. Placement messages can be closed with × or Escape; errors auto-dismiss. For safety, inputs are limited to 64 MB and 100 megapixels, while saved projects may be up to 18 MB. Project files embed the processed image data so reopening them does not depend on the original file. Image decoding and conversion happen locally; remote links are not fetched.

**Text notes:** Click **Add text note** then click the paper using the text-box cursor. New notes automatically size tightly around their text or emoji, including a small invisible padding, so their rotation center tracks the actual content. The sticker stays anchored in place while you type, even as it grows to accommodate text. Format notes with font size, bold/italic, alignment, text color and optional background; the default is black on transparent. Resize a note to scale both its box and text without rewrapping. Text notes and emojis no longer have a fixed 3.5× size cap: drag a corner to expand them up to the printable paper dimensions, keeping their contents centered as they grow. The **Fit page** button in the note editor scales a note nearly to the page size in one click. Large dimensions are retained in exported PDFs and saved projects, and Undo/Redo covers resizing. The tray action is labeled **Add text / emoji** to make emoji creation discoverable. The **Emoji** button opens a full searchable Unicode emoji picker with category and skin-tone options; the panel is wide enough to display all nine category tabs at desktop widths. Click an emoji to insert it at the cursor position; it becomes part of the note's editable text and saved project. The picker loads its catalog on demand and provides a small offline fallback. Notes can also be rotated from the page, and all edits participate in sticker Undo/Redo history.

The page preview is built from actual Letter or A4 page boxes; those same elements are used in the PDF. Use the matching paper size, 100% scaling, and disable browser headers/footers if offered. Sticker annotations float over the document rather than reflowing the lyrics underneath. Use **Save Project** before closing the tab if you wish to preserve the session.

## Notes

- The drawing code is original and does not bundle external site scripts or copyrighted songs.
- Six-character fret codes contain no finger numbers or barre markers. Imported rich chord data can supply those details; manually created shapes may omit annotations.
- The first voicing is shown by default. Additional imported shapes are retained when available.
- Content is formatted locally in the browser. This project is not affiliated with source websites. Respect applicable terms and only import or reproduce material you have permission to use.

## Optional song keys and confirmed transposition

**Experimental / In development:** The **Song key & transposition** section in the chord bank organizer is collapsed by default. Expanding it displays a caution because imported keys, generated/transposed grips, chord spellings, and annotations may require correction. Review the preview and final document carefully, and use Save As to preserve an original copy before applying a transposition.

The **Song key** control in the Chord bank organizer starts as **Unselected**. ChordStudio imports recognizable textual keys from supported page-source fields, including the tab tonality name and page-view tonality metadata. Numeric site-specific key codes are never guessed. Already installed bookmarklets do not update automatically when ChordStudio changes: replace the existing bookmarklet with the latest link from this site to import these metadata fields. **Suggest key** lists possibilities from the chord roots without automatically selecting one. Relative keys, modulations and unusual harmony are ambiguous; leaving a key Unselected is valid.

There are now two transposition methods. **Transpose to key** uses a confirmed current key and a target key of the same major/minor mode; imported keys require pressing **Confirm key** first. **Shift by semitones** moves chords by −12 to +12 steps, and works even with an Unselected key. For either method, pressing **Preview** shows the proposed chord names and shapes, while **Apply transposition** makes the actual change. Selecting a dropdown alone never rewrites chords. Preview failures are shown beside the controls.

A slash/pedal-bass chord that doesn't match a textbook chord formula can use a *chromatically shifted original grip* as a fallback. These are explicitly identified in the preview for manual playability review. If any chord cannot be handled by a generated voicing or a safe grip shift, the entire operation is blocked before making changes. On confirmation ChordStudio changes chord bank names and voicings, explicit chord annotations, recognized chord-only lines and placed chord stickers without moving those stickers. **Undo transposition** restores the previous project and **Save As** can preserve the original. Original imported text remains available through Restore imported text.

This is a *whole-song pitch shift*, not a harmonic reanalysis. A song with key changes still requires human review. It does not automatically infer modulations, reinterpret ambiguous chord names or guarantee every custom voicing has an ergonomic fingering.

## Upcoming songwriting enhancements

- **Detect chords in song:** Scan explicit chord markers and chord-only lines, preview candidate chord names, and let the user choose which voicings and diagrams to add to the chord bank. Require user confirmation rather than blindly converting lyrics that look like chord letters.
- **Chord-aware voicing suggestions:** Extend tuning-aware pitch and bass analysis to suggest alternate voicings of a chosen chord, with context-dependent naming and inversion choices rather than relying on simple shape names.
- **Insert at cursor**, capo tools, print-format presets, more nuanced key/modulation detection, and local unsaved-draft recovery are possible next steps.

**Local recent projects:** Save/Save As writes a portable .chordstudio file through the browser's supported file system or download flow and keeps a browser-local snapshot in IndexedDB. File → Recent projects can reopen one of the last eight saved or opened projects on the same device, or remove those local copies. A local recent entry is not a cloud backup and can disappear when browser site data is cleared; keep downloaded files. The toolbar's Save icon performs the same save action.


## Activity-focused navigation

ChordStudio starts with only **Bring a song into ChordStudio** expanded. Both **Chord bank organizer** and **Output preview** are collapsed. Each of the three is independently expandable without closing the other sections.

Creating a song or importing source data collapses the upper sections, opens Output preview and guides the user to the editor/preview. Opening a saved or recent project instead takes the user directly to page 1 beneath the sticky editing toolbar. After applying, applying and printing, or canceling song-text edits, the view returns to that same paper-first position without changing which activity sections are expanded. The introductory headline disappears while a document is active. Manually opening or closing a section does not force changes to other sections.

The **How to import a song** link reveals the complete bookmarklet setup instructions in the import card; alternate saved HTML/JSON/URL import remains a distinct advanced option.