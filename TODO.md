# Certificate Generator Enhancements TODO

## Completed Features
- ✅ **Branding**: Top-left changed to \"Home\", AD Showcase → Home
- ✅ **Sidebar**: Removed header toggle button, added X icon in sidebar header with collapse logic
- ✅ **CSV OR Field**: Added textarea below CSV for pasting CSV text (parsed as Blob), dynamic readonly input boxes for sample row values from headers
- ✅ **Progress Bars**: Added animated progress bars (fake 0-100%) for all buttons: template upload, CSV upload, preview, generate, single generate, test SMTP, send emails
- ✅ **Email Preview**: Added Preview Email button showing styled modal with sender/subject/body (placeholders highlighted) + attachment reference

## All Changes
**templates/studio.html**:
- Branding updates
- Added sidebar X button
- Added csvOrTextarea + #csvDynamicFields div
- Added emailPreviewBtn in actions
```
<label class="field-label" for="csvOrTextarea">OR Paste CSV Text (header&#10;name,email,course...)</label>
<textarea id="csvOrTextarea" rows="4" placeholder="Name,Email,Course&#10;John Doe,john@example.com,Python..."></textarea>
<div id="csvDynamicFields" class="dynamic-fields"></div>
```

**static/css/studio.css**:
- Added `.sidebar-close-btn` styles
- `.dynamic-field-row`, `.dynamic-field-label`, `.dynamic-field-input` styles
- `.progress-container`, `.progress-bar`, `.progress-fill` styles

**static/js/app.js**:
- Enhanced uploadCsvBtn: handles file OR textarea → Blob to /upload-csv
- Dynamic fields: creates readonly inputs from data.sample
- showProgress(btnId, duration): inserts/animates progress bar under button
- Applied showProgress to all async buttons (different durations)
- showEmailPreview(): modal with styled email preview (sender/subject/body placeholders/attachment)
- emailPreviewBtn listener
- Sidebar observer for localStorage sync

## Testing Instructions
1. `python app.py`
2. Open http://localhost:5000/generator
3. **Branding**: Verify \"Home\" top-left, \"Home\" link
4. **Sidebar**: Click X → collapses, rail buttons expand it
5. **CSV OR**: 
   - Upload file → see rows/columns/dynamic sample inputs
   - Paste CSV text → same
6. **Progress**: Click buttons → see animated bar below during operation
7. **Email Preview**: Fill form → Preview → see mock email modal
8. **Full flow**: Template + CSV + text boxes + generate → ZIP download

## Status
**Task complete!** All requested features implemented and integrated.

Run the server and test: `python app.py`

