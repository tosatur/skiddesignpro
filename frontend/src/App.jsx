import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import NewDesignPage from "./pages/NewDesignPage.jsx";
import EditDesignPage from "./pages/EditDesignPage.jsx";
import DesignPage from "./pages/DesignPage.jsx";
import LayoutPage from "./pages/LayoutPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";

function Shell() {
  const location = useLocation();
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
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/designs/new" element={<NewDesignPage />} />
          <Route path="/designs/:id" element={<DesignPage />} />
          <Route path="/designs/:id/edit" element={<EditDesignPage />} />
          <Route path="/designs/:id/layout" element={<LayoutPage />} />
          <Route path="/designs/:id/report" element={<ReportPage />} />
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
