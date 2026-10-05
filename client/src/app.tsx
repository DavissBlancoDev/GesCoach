import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("comprobando...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("sin conexión"));
  }, []);

  return (
    <div>
      <h1>GesCoach</h1>
      <p>Estado de la API: {status}</p>
    </div>
  );
}

export default App;