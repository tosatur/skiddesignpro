# SPN pH Correction Skid Designer

Create and save wastewater skid designs, view layouts and export PDF reports. Run it in a browser or as a portable Windows desktop app.

## Build both Windows EXEs

1. Install **Node.js 24 or later**, including npm, on the Windows computer doing the build.
2. Double-click **`build_exes.bat`** in this folder.
3. Wait for **Both EXEs are ready**. The script installs dependencies from `package-lock.json` and builds both versions. Internet access is needed to download the build tools.

| Version | Generated file |
| --- | --- |
| Normal | `release/SPN-Skid-Designer-1.0.0-portable.exe` |
| Dev mode | `release/dev/SPN-Skid-Designer-Dev-1.0.0-portable.exe` |

Double-click either EXE to run it. These are portable Windows x64 apps: no installation or Node.js is needed on the computer running them. The builds are unsigned.

The **Dev Mode** window enables **Import test designs**, **Export All Reports as Text** and **Delete All Previous Designs** automatically. Bulk deletion asks for confirmation and removes every design in its current data folder. Both versions use the same calculations, file storage and PDF exporter.

To build just one version from a terminal in this folder:

```sh
npm ci
npm run build:exe
# Or, for the dev version:
npm run build:exe:dev
```

## Run the web app instead

Install Node.js 24 or later, then use one of these Windows launchers:

| Launcher | What it runs |
| --- | --- |
| `run_web.cmd` | Normal web app |
| `run_dev.bat` | Web app with the same dev tools described above |

Both install dependencies if needed, build the frontend and start the local server. `run_dev.bat` enables dev tools and calls `run_web.cmd`. Open **http://127.0.0.1:3001** in your browser and keep the terminal open. Press **Ctrl+C** to stop it before switching launchers. Both launchers use the same saved designs.

The manual equivalent for the normal web app is:

```sh
npm ci
npm run build
npm start
```

## Where designs are saved

Each design is its own `.spnd` file (plain JSON internally), named by its internal ID.

- **Web app:** `backend/db/data/` inside this project.
- **Either EXE:** `data/` beside that EXE. **File → Open data folder** shows the location.

Keep each EXE in its own writable folder to separate normal and dev data. The build already does this: normal data goes in `release/data`, and dev data in `release/dev/data`. Putting both EXEs together makes them share the same data folder.

Saved designs are not bundled into the EXEs. To use your web designs in the desktop app, close every app using that data, then copy the entire `backend/db/data` folder beside the EXE as `data`. Close the app before copying or moving data, and keep the `data` folder when updating the EXE.

Because each design is a separate file, the `data` folder can also live on a shared drive or a synced folder (e.g. OneDrive/SharePoint) so more than one person can use the same design library — a sync conflict then affects at most one design's file, not the whole library. Avoid two people saving the *same* design at the same time; the app detects that case and asks you to reopen the design rather than overwriting it silently.

To use a different data folder, set `SPN_DATABASE` before starting either app. For example, in PowerShell:

```powershell
$env:SPN_DATABASE = "D:\SPN Data\Designs"
& ".\release\SPN-Skid-Designer-1.0.0-portable.exe"
```

## Development

Run `npm ci` first. `npm run dev` starts the API and Vite with live reload at http://127.0.0.1:5173. `npm run desktop` opens the desktop app from source; `npm run desktop:test` also enables dev tools. These source launches use the web app's data folder.

Application code lives in `frontend/src`, `backend`, `shared` and `electron`. Change reference values in `backend/config/designConfig.js`. Design storage and report logic are shared by the web and desktop versions.

Build output, saved design data, exports, local tests and reference documents are excluded from Git. If the local tests are available, run `npm test` or `npm run test:e2e` to check the app.
