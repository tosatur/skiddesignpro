# SkidDesignPro

Create and save wastewater skid designs, view 2D and 3D layouts, record supplier quotes and export PDF reports. Run it in a browser or as an installed Windows desktop app.

## Build the Windows installer

1. Install **Node.js 24 or later**, including npm, on the Windows computer doing the build.
2. Double-click **`build_installer.bat`** in this folder.
3. Wait for **The installer is ready**. The script installs dependencies from `package-lock.json` and builds the app. Internet access is needed to download the build tools.

| File | What it is |
| --- | --- |
| `release/SkidDesignPro-1.0.0-setup.exe` | Installer. Installs for the current user without admin rights and adds Desktop and Start Menu shortcuts. Once installed, double-clicking a `.spnd` design file opens it in the app. Remove it from **Settings → Apps**. |

The installer contains the Windows x64 app and needs no Node.js on the computer running it. The build is unsigned, so Windows SmartScreen may warn about an unknown publisher; choose **More info → Run anyway**.

Use the **Dev Mode** switch at the far right of the white header to enable **Import test designs** on the home page. Its dialog imports JSON inputs or exports all reports as one text file. Imports skip duplicate names, save valid designs in the configured data folder and add those files to desktop Recents (up to 15). Export covers saved designs in that folder and does not change designs or Recents. The switch is available on every page, starts disabled and remembers your choice. Changes take effect immediately in both the desktop and web app.

To build from a terminal in this folder:

```sh
npm ci
npm run build:installer
```

## Run the web app instead

Install Node.js 24 or later, then run these commands in this folder:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:3001** in your browser and keep the terminal open. Press **Ctrl+C** to stop it. Use the header's **Dev Mode** switch whenever you need the dev tools.

## Where designs are saved

Each design is its own `.spnd` file (plain JSON internally), named by its internal ID.

- **Web app:** `backend/db/data/` inside this project.
- **Installed app:** `Documents\SkidDesignPro` by default. Uninstalling or updating the app leaves this folder in place.

For the desktop app, this is only the starting folder Open/Save dialogs suggest before you have opened or saved a design; after that they start in the folder you last used. Designs can be saved anywhere. **File → Open default save folder** shows the location.

Normal use and Dev Mode share the same data folder. Changing the switch does not move, copy or delete designs. Existing data from an older build stays in its original folder, including `Documents\SPN Skid Designer`; use `SPN_DATABASE` to continue using that folder.

Saved designs are not bundled into the installer. To use your web designs in the desktop app, close every app using that data, then copy the contents of `backend/db/data` into the desktop data folder above. Close the app before copying or moving data.

Because each design is a separate file, the `data` folder can also live on a shared drive or a synced folder (e.g. OneDrive/SharePoint) so more than one person can use the same design library — a sync conflict then affects at most one design's file, not the whole library. Avoid two people saving the _same_ design at the same time; the app detects that case and asks you to reopen the design rather than overwriting it silently.

To use a different data folder, set `SPN_DATABASE` before starting either app. For example, in PowerShell:

```powershell
$env:SPN_DATABASE = "D:\SPN Data\Designs"
& "$env:LOCALAPPDATA\Programs\SkidDesignPro\SkidDesignPro.exe"
```

Adjust the executable path if you chose a different installation folder.

## Equipment settings

Open **Equipment** beside **Price library** in the header. Each equipment type has a green/red enabled/disabled switch with a sliding white circle. Changes save automatically and become the defaults for new designs and designs regenerated without a custom equipment selection, in both the desktop and web app.

Disabled equipment is omitted from equipment selections, its cost lines, electrical I/O and layouts. Tank-mounted items require enabled balancing tanks; chemical-line valve quantities follow the enabled dosing trains. Cooling is included only when enabled and required by the inlet temperature. Level instrumentation and piping/valves retain their shared package allowances while applicable; disabling one component does not prorate a supplier package price.

Existing calculated designs retain their saved outputs. On a design page, **Proposed equipment** indicates when its selection differs from the current defaults. **Use current settings** recalculates only that design with the current defaults. **Edit equipment** opens the same switches for that design; **Save equipment** recalculates it with the selected equipment, while **Cancel** discards the draft. Custom selections remain in place when editing design inputs or quotes. Input-only imports record the equipment defaults at import time.

Default equipment choices and Dev Mode are stored in **`settings.json`** in the data folder. They are shared by app instances using that folder and survive restarts. Include this file when copying your app data. Each design's equipment selection is saved inside its own **`.spnd`** file.

## Duplicate a design

On the home page, choose **Duplicate** beside **Remove** in Recent files, or beside a saved web design. This opens **New design** with all the saved input values filled in, including custom wastewater data, space constraints and design quotes. The design name and client/facility are left blank. Enter those details and choose **Generate Design** to save a separate design; opening the form does not create a design or change the original.

## Prices and quotes

Costs start as budget estimates from `backend/config/designConfig.js` and carry a ±20% range. Replace an estimate with a supplier quote in either place:

- **Price library** (header link): the quote applies to every new or regenerated design.
- **Cost breakdown** on a design page: the quote applies to that design only. Tick **Also save to price library** to use it for future designs too.

Quoted lines are fixed; the ±20% range applies only to the lines that are still estimates. Saved designs keep the prices they were generated with. Saving a quote updates costs without changing that design's equipment selection or layout.

The library is stored as `prices.json` in the data folder described above (`backend/db/data` for the web app, `Documents\SkidDesignPro` for the installed app, or `SPN_DATABASE` if set), so copy it whenever you copy that folder. Only prices you have changed are saved; everything else falls back to the config estimate. Deleting `prices.json` resets every price to its estimate.

## Development

Run `npm ci` first. `npm run dev` starts the API and Vite with live reload at http://127.0.0.1:5173. `npm run desktop` opens the desktop app from source. These source launches use the web app's data folder. Dev tools are controlled by the header switch for every launch method.

Application code lives in `frontend/src`, `backend`, `shared` and `electron`. Change reference values in `backend/config/designConfig.js`. Design storage and report logic are shared by the web and desktop versions.

Build output, saved design data, exports, local tests and reference documents are excluded from Git. If the local tests are available, run `npm test` or `npm run test:e2e` to check the app.
