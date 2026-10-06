# SPN pH Correction Skid Designer

Create and save wastewater skid designs, view 2D and 3D layouts, record supplier quotes and export PDF reports. Run it in a browser or as a portable Windows desktop app.

## Build the Windows EXE

1. Install **Node.js 24 or later**, including npm, on the Windows computer doing the build.
2. Double-click **`build_exe.bat`** in this folder.
3. Wait for **The EXE is ready**. The script installs dependencies from `package-lock.json` and builds the app. Internet access is needed to download the build tools.

The generated file is **`release/SPN-Skid-Designer-1.0.0-portable.exe`**.

Double-click the EXE to run it. This is a portable Windows x64 app: no installation or Node.js is needed on the computer running it. The build is unsigned.

Use the **Dev Mode** switch at the top right of the home page to enable or disable **Import test designs**, **Export All Reports as Text** and **Delete All Previous Designs**. Dev Mode starts disabled and remembers your choice. Changes take effect immediately in both the desktop and web app. Bulk deletion still asks for confirmation and removes every design in the current data folder.

To build from a terminal in this folder:

```sh
npm ci
npm run build:exe
```

## Run the web app instead

Install Node.js 24 or later, then double-click **`run_web.cmd`**. This single launcher installs dependencies if needed, builds the frontend and starts the local server. Open **http://127.0.0.1:3001** in your browser and keep the terminal open. Press **Ctrl+C** to stop it. Use the home-page **Dev Mode** switch whenever you need the dev tools; no separate launcher or restart is required.

The manual equivalent is:

```sh
npm ci
npm run build
npm start
```

## Where designs are saved

Each design is its own `.spnd` file (plain JSON internally), named by its internal ID.

- **Web app:** `backend/db/data/` inside this project.
- **Desktop EXE:** `data/` beside the EXE by default — this is only the starting folder Open/Save dialogs suggest, since designs can be saved anywhere. **File → Open default save folder** shows the location.

Normal use and Dev Mode share the same data folder. Changing the switch does not move, copy or delete designs. Existing data from an older dev EXE stays in its original folder; use `SPN_DATABASE` to continue using that folder with the unified app.

Saved designs are not bundled into the EXEs. To use your web designs in the desktop app, close every app using that data, then copy the entire `backend/db/data` folder beside the EXE as `data`. Close the app before copying or moving data, and keep the `data` folder when updating the EXE.

Because each design is a separate file, the `data` folder can also live on a shared drive or a synced folder (e.g. OneDrive/SharePoint) so more than one person can use the same design library — a sync conflict then affects at most one design's file, not the whole library. Avoid two people saving the *same* design at the same time; the app detects that case and asks you to reopen the design rather than overwriting it silently.

To use a different data folder, set `SPN_DATABASE` before starting either app. For example, in PowerShell:

```powershell
$env:SPN_DATABASE = "D:\SPN Data\Designs"
& ".\release\SPN-Skid-Designer-1.0.0-portable.exe"
```

## Equipment settings

Open **Equipment** beside **Price library** in the header. Each equipment type has a green/red enabled/disabled switch with a sliding white circle. Changes save automatically and apply to new and regenerated designs in both the desktop and web app.

Disabled equipment is omitted from equipment selections, its cost lines, electrical I/O and layouts. Tank-mounted items require enabled balancing tanks; chemical-line valve quantities follow the enabled dosing trains. Cooling is included only when enabled and required by the inlet temperature. Level instrumentation and piping/valves retain their shared package allowances while applicable; disabling one component does not prorate a supplier package price.

Existing calculated designs retain their saved outputs. Input-only imports record the equipment settings at import time. Regenerating a design applies the current equipment settings.

Equipment choices and Dev Mode are stored in **`settings.json`** in the data folder. They are shared by app instances using that folder and survive restarts. Include this file when copying your app data.

## Prices and quotes

Costs start as budget estimates from `backend/config/designConfig.js` and carry a ±20% range. Replace an estimate with a supplier quote in either place:

- **Price library** (header link): the quote applies to every new or regenerated design.
- **Cost breakdown** on a design page: the quote applies to that design only. Tick **Also save to price library** to use it for future designs too.

Quoted lines are fixed; the ±20% range applies only to the lines that are still estimates. Saved designs keep the prices they were generated with.

The library is stored as `prices.json` in the data folder described above (`backend/db/data` for the web app, `data` beside the EXE, or `SPN_DATABASE` if set), so copy it whenever you copy that folder. Only prices you have changed are saved; everything else falls back to the config estimate. Deleting `prices.json` resets every price to its estimate.

## Development

Run `npm ci` first. `npm run dev` starts the API and Vite with live reload at http://127.0.0.1:5173. `npm run desktop` opens the desktop app from source. These source launches use the web app's data folder. Dev tools are controlled by the home-page switch for every launch method.

Application code lives in `frontend/src`, `backend`, `shared` and `electron`. Change reference values in `backend/config/designConfig.js`. Design storage and report logic are shared by the web and desktop versions.

Build output, saved design data, exports, local tests and reference documents are excluded from Git. If the local tests are available, run `npm test` or `npm run test:e2e` to check the app.
