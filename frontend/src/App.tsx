import { Routes, Route } from "react-router-dom";
import { NewEventPage } from "./pages/NewEventPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { EditEventPage } from "./pages/EditEventPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { BoardPage } from "./pages/BoardPage";
import { BoardsPage } from "./pages/BoardsPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { BoardSettingsPage } from "./pages/BoardSettingsPage";
import { AppShell } from "./components/AppShell";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<BoardsPage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="/boards/:boardId/settings" element={<BoardSettingsPage />}/>
          <Route path="/boards/:boardId/events/new" element={<NewEventPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/events/:id/edit" element={<EditEventPage />} />
          </Route>
      </Route>
      <Route path="/events/new" element={<NewEventPage/>} />
      <Route path="/events/:id" element={<EventDetailPage />} />
      <Route path="/events/:id/edit" element={<EditEventPage/>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}