import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CreateTeamPage from "./pages/CreateTeamPage";
import SquadPage from "./pages/SquadPage";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireTeam from "./components/RequireTeam";
import AppLayout from "./components/AppLayout";

function GesCoach() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      {/* Todo lo de dentro exige sesión iniciada */}
      <Route element={<ProtectedRoute />}>
        <Route path="/crear-equipo" element={<CreateTeamPage />} />
        {/* Y lo de aquí dentro exige, además, tener un equipo */}
        <Route element={<RequireTeam />}>
          {/* Cabecera común con la navegación */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/plantilla" element={<SquadPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default GesCoach;