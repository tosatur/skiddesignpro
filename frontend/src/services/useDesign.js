import { useEffect, useState } from "react";
import { designService } from "./designService.js";

export function useDesign(id, view) {
  const [state, setState] = useState({ design: null, error: "" });
  useEffect(() => {
    let active = true;
    setState({ design: null, error: "" });
    designService
      .get(id, view)
      .then((design) => active && setState({ design, error: "" }))
      .catch((e) => active && setState({ design: null, error: e.message }));
    return () => {
      active = false;
    };
  }, [id, view]);
  return state;
}
