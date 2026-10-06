import { useEffect, useState } from "react";

function GesCoach() {
  const [status, setStatus] = useState("comprobando...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("sin conexión"));
  }, []);

  return (
    <div>
      <h1>GesCoach · Gestión de equipos</h1>
      <h1 className="text-3xl font-bold text-green-700">GesCoach</h1>
      <p>Estado de la API: {status}</p>
    </div>
  );
}

export default GesCoach;