import { useState } from "react";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  void categories;
  void setCategories;

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");

    try {
      await checkSystem();
      setState("success");
    } catch (error) {
      setState("error");

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to connect to TokTickIT API");
      }
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button
        className="btn btn-success"
        onClick={handleCheck}
        disabled={state === "loading"}
      >
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "success" && (
        <div className="mt-4">
          <p>
            System Status: <strong className="text-success">Online</strong>
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="mt-4">
          <p>
            System Status: <strong className="text-danger">Offline</strong>
          </p>
          <p className="text-danger">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}