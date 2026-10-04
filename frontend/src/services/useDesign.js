import { useCallback, useEffect, useState } from "react";
import { designService } from "./designService.js";

export function useDesign(id, view) {
  const key = `${id}|${view ?? ""}`;
  const [state, setState] = useState({ key, design: null, error: "" });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    designService
      .get(id, view)
      .then((design) => active && setState({ key, design, error: "" }))
      .catch(
        (e) => active && setState({ key, design: null, error: e.message }),
      );
    return () => {
      active = false;
    };
  }, [id, view, key, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return state.key === key
    ? { design: state.design, error: state.error, reload }
    : { design: null, error: "", reload };
}
