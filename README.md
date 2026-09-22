# SPN pH Correction Skid Designer

A local web and Windows desktop application for creating, saving and editing dairy wastewater skid designs, viewing a simple SVG layout and exporting a PDF report.

## Run

Requires Node.js 24 or later. From this folder:

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:3001. On Windows, `run_web.cmd` installs dependencies if needed, builds and starts the app. For development, `npm run dev` starts the API and Vite at http://127.0.0.1:5173.

## Windows desktop EXE

The Electron version opens the existing application in a desktop window and runs the same local API, calculations, SQLite store and PDF exporter. It starts its server on an available localhost port, so it can run alongside the web version.

```sh
npm ci
npm run desktop
```

Use `npm run desktop:test` to enable the application's import/export test tools in the desktop window. Development desktop runs use the same database as the web version.

To build a portable Windows x64 executable:

```sh
npm run build:exe
```

The output is `release/SPN-Skid-Designer-1.0.0-portable.exe`. The computer running that EXE does not need Node.js or npm. This experimental build is unsigned.

The portable app creates `data/designs.sqlite` beside the original EXE, outside the bundled application and its temporary extraction folder. Keep the EXE in a writable folder, and keep the `data` folder when replacing the EXE with an updated version. **File → Open data folder** opens the database location.

To use a different database location, set the existing `SPN_DATABASE` environment variable before launching the EXE:

```powershell
$env:SPN_DATABASE = "D:\SPN Data\designs.sqlite"
& ".\SPN-Skid-Designer-1.0.0-portable.exe"
```

Existing saved designs are not bundled or automatically moved. To reuse them, close every app using the database, then copy the complete `backend/db/data` folder beside the EXE as `data`. Keep any SQLite WAL/SHM files with the database. Close the app before moving or backing up its data folder. A new empty folder starts a separate database using the same schema.

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
electron/         Desktop window, local server startup and database location
shared/           Measurement handling shared by the frontend and backend
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

On Windows, double-click `run_dev.bat` to build and launch the app with test tools enabled, then open http://127.0.0.1:3001. It uses the same saved designs as the normal launcher. The packaged desktop EXE also accepts `--test-tools`.

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
