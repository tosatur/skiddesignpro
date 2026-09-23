import { useNavigate } from "react-router-dom";
import DesignForm from "../components/DesignForm.jsx";
import PageHeading from "../components/PageHeading.jsx";
import { designService } from "../services/designService.js";
import { isDesktop } from "../services/desktopDocuments.js";

export default function NewDesignPage() {
  const navigate = useNavigate();
  return (
    <div className="form-width">
      <PageHeading
        title="New design"
        description={
          isDesktop()
            ? "You’ll be asked where to save when you continue."
            : undefined
        }
      />
      <DesignForm
        cancelTo="/"
        onSave={async (inputs) => {
          const design = await designService.create(inputs);
          navigate(`/designs/${design.id}`);
        }}
      />
    </div>
  );
}
