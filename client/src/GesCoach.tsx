import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CreateTeamPage from "./pages/CreateTeamPage";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireTeam from "./components/RequireTeam";

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
          <Route path="/" element={<DashboardPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default GesCoach;