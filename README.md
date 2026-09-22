# SPN pH Correction Skid Designer

A local web application for creating, saving and editing dairy wastewater skid designs, viewing a simple SVG layout and exporting a PDF report.

## Run

Requires Node.js 24 or later. From this folder:

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:3001. On Windows, `start-web.cmd` installs dependencies if needed, builds and starts the app. For development, `npm run dev` starts the API and Vite at http://127.0.0.1:5173.

## Structure

```text
frontend/src/
  pages/          Screens and navigation
  components/     Forms, panels, tables and SVG rendering
  services/       API requests, downloads and display formatting
backend/
  config/         designConfig.js: reference data and prototype settings
  models/         Design and WastewaterProfile
  services/       Equipment, compliance, layout, cost and report generation
  routes/         Design API
  db/             SQLite storage
  fonts/          Fonts used by the PDF exporter, with licence
```

Automated tests, Playwright configuration and reference documents are maintained locally and excluded from Git. They are not required to build or run the application.

Data flows from the shared New/Edit form to the API, through `Design`, into SQLite. Pages fetch one design and pass it to their panels. SVG and PDF use the same drawing. The PDF itself is not stored. Delete Design is available in the opened design’s Settings, with confirmation; it removes the complete design row.

| Responsibility | File |
| --- | --- |
| Generate a design snapshot | `backend/models/Design.js` |
| Select tanks, pumps, chemicals and I/O quantities | `backend/services/equipmentSelection.js` |
| Place equipment and compare two footprints | `backend/services/layout.js` |
| Draw tanks, process connections and labels | `backend/services/layoutDrawing.js` |
| Check wastewater inputs | `backend/services/complianceCheck.js` |
| Calculate the cost range | `backend/services/costing.js` |
| Build report content and export PDF | `backend/services/report.js`, `reportPdf.js` |
| Store and read saved snapshots | `backend/db/DesignStore.js` |

Layouts show the selected tanks, connected pumps, chemical dosing, tank instrumentation and control panel. Only length and width are evaluated. The smaller fitting arrangement is preferred; otherwise the smaller footprint is shown with exact overruns. The external buffer tank is outside the skid.

Edit **backend/config/designConfig.js** to change reference ranges, trade waste limits, selection bands, chemicals, prices, equipment footprints, spacing or frame margins. In Settings, press **Save Changes** to save new outputs. Original PDF/Excel files are not runtime dependencies.

Designs persist in `backend/db/data/designs.sqlite` (excluded from Git). `SPN_DATABASE` can override this location; `PORT` defaults to 3001. Stop the app before copying the database for backup. Normal saved designs retain their outputs until explicitly regenerated; reads, exports and restarts do not modify them. There is no automatic migration. Test imports store inputs and normal record metadata only, and calculate outputs with the current logic on each read/export, including after editing.

## Test tools

On Windows, double-click `start-test.bat` to build and launch the app with test tools enabled, then open http://127.0.0.1:3001. It uses the same saved designs as the normal launcher.

Disabled by default. Enable the server flag before starting (or restarting) the app:

```powershell
$env:SPN_ENABLE_TEST_TOOLS = "true"
npm start
```

Home then shows secondary **Import test designs** and **Export All Reports as Text** buttons, plus a red **Delete All Previous Designs** button. Bulk deletion requires confirmation, removes every saved design (including manually created designs), and immediately refreshes the list. Paste a JSON array into the importer using the application's existing field names. Concentrations accept numbers or strings such as `"<100"`; an exact sulphur total is calculated from all three exact components. A direct total can be supplied as `sulphur` for incomplete or bounded components. Total Nitrogen is ignored; TKN remains supported. Flow and daily volume are validated independently. The selected target pH must be between 6.0 and 10.0 inclusive; inlet pH remains valid from 0 to 14.

Imports use normal validation and SQLite storage. Invalid entries are reported individually; existing names (ignoring case and surrounding whitespace) are skipped without overwriting. Incoming equipment, compliance, costs, layouts, reports and PDFs are ignored. Derived sulphur totals are not stored. Imported designs can be opened, edited, exported and deleted normally.

For BOD5, `customWastewaterData.bod5` maps to the normal saved `bod` field and uses the same validation, mass-load calculation and compliance checks as manually entered BOD5. Existing JSON using `bod` remains supported; if both keys are present, `bod` takes precedence.

Custom available dimensions can also be imported. In each design input object, use positive numbers in metres:

```json
"spaceConstraint": { "type": "custom", "length": 15, "width": 10 }
```

Imported dimensions appear in Settings and use the same layout and report calculations as manual entry. Custom length and width are used exactly as the available site space, without a cap from the default container allowance. Both 0° and 90° whole-skid orientations are checked; any required rotation is identified in the fit result and reports. Equipment dimensions and the drawing remain in their calculated orientation. Use `"spaceConstraint": { "type": "container" }` for the standard 20 ft container limit.

Older imported designs with invalid target pH values must be corrected in Settings before generating or exporting reports, including the combined text export. Settings remains accessible for correction or deletion.

Text export downloads every saved design in one `.txt` file using the same nine report sections, with tab-separated table rows, units and statuses. It does not export drawings or PDF styling. All test endpoints and buttons are unavailable when the flag is unset or false; no frontend rebuild is needed to change the flag.

## Verify

```sh
npm run build
```

If the local automated test suite and Playwright configuration are also available, run:

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Tests use separate temporary databases. They cover selection, quantities, both layouts, exact space overruns, cost/I/O/report consistency, acid/caustic/neutral cases, saved-row mouse and keyboard activation, PDF download and reopening a saved design. Restart tests verify old snapshots are unchanged. Screenshots, test reports and build output are ignored by Git; the source documents stay outside the runtime application.
