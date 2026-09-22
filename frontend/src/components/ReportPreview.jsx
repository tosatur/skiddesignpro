import Layout2D from "./Layout2D.jsx";
import ReportTable from "./ReportTable.jsx";

export default function ReportPreview({ design }) {
  const report = design.report;
  return (
    <article className="report-paper">
      <header className="report-cover">
        <p className="eyebrow">SPN CONSULTING</p>
        <h2>{report.title}</h2>
        <p>{report.subtitle}</p>
        <div className="report-meta">
          <span>{report.client}</span>
          <span>Revision {report.revision}</span>
        </div>
      </header>
      {report.sections.map((section, index) => (
        <section className="report-section" key={section.title}>
          <h2>
            <span>{index + 1}.</span> {section.title}
          </h2>
          {section.paragraphs?.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
          {section.callout && (
            <div className={`space-status ${section.callout.tone}`}>
              <strong>{section.callout.text}</strong>
            </div>
          )}
          {section.tables?.map((table, i) => (
            <ReportTable
              key={i}
              table={table}
              compliance={section.compliance}
            />
          ))}
          {section.layout && (
            <Layout2D drawing={design.generated.layout.drawing} />
          )}
          {section.notes?.map((note, i) => (
            <p key={i}>{note}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
