import { Link } from "react-router-dom";

export default function PageHeading({
  backTo = "/",
  backLabel = "Back to Home",
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <>
      <Link className="back-link" to={backTo}>
        ‹ {backLabel}
      </Link>
      <div className="page-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="lede">{description}</p>}
        </div>
        {children && <div className="actions">{children}</div>}
      </div>
    </>
  );
}
export function LoadState({ error }) {
  return (
    <div
      className={error ? "notice error" : "loading"}
      role={error ? "alert" : "status"}
    >
      {error || "Loading design…"}
      {error && (
        <p>
          <Link to="/">Back to Home</Link>
        </p>
      )}
    </div>
  );
}
