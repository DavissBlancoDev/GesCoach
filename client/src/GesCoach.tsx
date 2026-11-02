import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import CreateTeamPage from "./pages/CreateTeamPage";
import DashboardPage from "./pages/DashboardPage";
import SquadPage from "./pages/SquadPage";
import PlayerDetailPage from "./pages/PlayerDetailPage";
import TrainingsPage from "./pages/TrainingsPage";
import TrainingDetailPage from "./pages/TrainingDetailPage";
import MatchesPage from "./pages/MatchesPage";
import MatchDetailPage from "./pages/MatchDetailPage";
import CalendarPage from "./pages/CalendarPage";
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
        {/* Pantalla de inicio: elegir equipo */}
        <Route path="/" element={<HomePage />} />
        <Route path="/crear-equipo" element={<CreateTeamPage />} />

        {/* Lo de aquí dentro exige, además, tener un equipo elegido */}
        <Route element={<RequireTeam />}>
          {/* Cabecera con la barra de navegación del equipo */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/plantilla" element={<SquadPage />} />
            <Route path="/plantilla/:playerId" element={<PlayerDetailPage />} />
            <Route path="/entrenos" element={<TrainingsPage />} />
            <Route path="/entrenos/:trainingId" element={<TrainingDetailPage />} />
            <Route path="/partidos" element={<MatchesPage />} />
            <Route path="/partidos/:matchId" element={<MatchDetailPage />} />
            <Route path="/calendario" element={<CalendarPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default GesCoach;
