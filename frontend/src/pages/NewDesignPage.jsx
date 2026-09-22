import { useNavigate } from "react-router-dom";
import DesignForm from "../components/DesignForm.jsx";
import PageHeading from "../components/PageHeading.jsx";
import { designService } from "../services/designService.js";

export default function NewDesignPage() {
  const navigate = useNavigate();
  return (
    <div className="form-width">
      <PageHeading title="New design" />
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
