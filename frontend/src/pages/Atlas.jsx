import { useEffect, useState } from "react";
import { api } from "../api.js";
import AtlasDashboard from "./AtlasDashboard.jsx";

export default function Atlas({ selectedStudent }) {

  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [contextError, setContextError] = useState(null);

  useEffect(() => {
    if (!selectedStudent?.id) return;
    Promise.all([
      api(`/dashboard/student/${selectedStudent.id}`),
      api(`/risk/${selectedStudent.id}`)
    ]).then(([dashboard, risk]) => setContext({ dashboard, risk }))
      .catch((error) => setContextError(error.message));
  }, [selectedStudent?.id]);


  async function ask() {

    if (!question.trim()) return;

    setLoading(true);

    try {

      const response = await api("/atlas/ask", {
        method: "POST",
        body: JSON.stringify({
          question,
          ...(selectedStudent?.id ? { userId: selectedStudent.id } : {})
        }),
      });

      setResult(response);

    } catch(error) {

      console.error("Error consultando Atlas:", error);

    } finally {

      setLoading(false);

    }

  }


  return (
    <AtlasDashboard
      question={question}
      setQuestion={setQuestion}
      result={result}
      loading={loading}
      ask={ask}
      context={context}
      contextError={contextError}
    />
  );
}