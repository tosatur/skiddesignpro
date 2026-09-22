import { useNavigate, useParams } from "react-router-dom";
import DesignForm from "../components/DesignForm.jsx";
import PageHeading, { LoadState } from "../components/PageHeading.jsx";
import { designService } from "../services/designService.js";
import { useDesign } from "../services/useDesign.js";
import DeleteDesignAction from "../components/DeleteDesignAction.jsx";

export default function EditDesignPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { design, error } = useDesign(id, "settings");
  if (!design) return <LoadState error={error} />;
  return (
    <div className="form-width">
      <PageHeading
        backTo={`/designs/${id}`}
        backLabel="Back to Design"
        eyebrow={design.designName}
        title="Settings"
      />
      <DesignForm
        initial={design.inputs}
        cancelTo={`/designs/${id}`}
        deleteAction={<DeleteDesignAction design={design} />}
        onSave={async (inputs) => {
          await designService.update(id, inputs, design.revision);
          navigate(`/designs/${id}`);
        }}
      />
    </div>
  );
}
