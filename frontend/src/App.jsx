import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useLocation,
} from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import NewDesignPage from "./pages/NewDesignPage.jsx";
import EditDesignPage from "./pages/EditDesignPage.jsx";
import DesignPage from "./pages/DesignPage.jsx";
import LayoutPage from "./pages/LayoutPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import PricesPage from "./pages/PricesPage.jsx";
import EquipmentPage from "./pages/EquipmentPage.jsx";
import ToggleSwitch from "./components/ToggleSwitch.jsx";
import { designService } from "./services/designService.js";

function Shell() {
  const location = useLocation();
  const [devMode, setDevMode] = useState(null);
  const [devModeBusy, setDevModeBusy] = useState(false);
  const [devModeError, setDevModeError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    designService
      .config()
      .then((config) => {
        if (active) {
          setDevMode(config.devMode);
          setDevModeError("");
        }
      })
      .catch((error) => active && setDevModeError(error.message));
    return () => {
      active = false;
    };
  }, [attempt]);

  async function toggleDevMode(enabled) {
    setDevModeBusy(true);
    setDevModeError("");
    try {
      setDevMode((await designService.setDevMode(enabled)).devMode);
    } catch (error) {
      setDevModeError(error.message);
    } finally {
      setDevModeBusy(false);
    }
  }
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector("main")?.focus();
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="SPN Home">
            <strong>
              SPN<span>.</span>
            </strong>
            <span className="brand-title">
              pH Correction
              <br />
              Skid Designer
            </span>
          </Link>
          <nav className="header-nav" aria-label="Main">
            <NavLink to="/prices">Price library</NavLink>
            <NavLink to="/equipment">Equipment</NavLink>
          </nav>
          <div className="header-dev-mode">
            <span className="dev-mode-label">Dev Mode</span>
            <ToggleSwitch
              label="Dev Mode"
              checked={Boolean(devMode)}
              disabled={devMode === null || devModeBusy}
              onChange={toggleDevMode}
            />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {devModeError && (
          <div className="notice error" role="alert">
            {devModeError}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<HomePage devMode={devMode} />} />
          <Route path="/designs/new" element={<NewDesignPage />} />
          <Route path="/designs/:id" element={<DesignPage />} />
          <Route path="/designs/:id/edit" element={<EditDesignPage />} />
          <Route path="/designs/:id/layout" element={<LayoutPage />} />
          <Route path="/designs/:id/report" element={<ReportPage />} />
          <Route path="/prices" element={<PricesPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>Page not found.</h1>
                <Link to="/">Back to Home</Link>
              </div>
            }
          />
        </Routes>
      </main>
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
