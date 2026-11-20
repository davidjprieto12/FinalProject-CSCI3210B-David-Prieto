import { Link, Outlet, useMatch, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBoards } from "../hooks/useBoards";
import { displayName } from "../utils/users";

export function AppShell() {
  const { user, logout } = useAuth();
  const { data: boards } = useBoards();
  const navigate = useNavigate();
  const match = useMatch("/boards/:boardId/*");
  const currentId = match?.params.boardId ?? "";

  return (
    <>
      <header className="app-shell-header">
        <nav className="app-shell-nav" aria-label="Main">
          <Link className="powder-outline-action" to="/">Main Page</Link>
          {boards && boards.length > 0 && (
            <div className="app-shell-board-picker">
              <label htmlFor="board-switcher">Current Board:</label>
              <select
                id="board-switcher"
                value={currentId}
                onChange={(e) => {
                  if (e.target.value) navigate(`/boards/${e.target.value}`);
                }}
              >
                <option value="">Switch board…</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {currentId && <Link to={`/boards/${currentId}/settings`}>Settings</Link>}
        </nav>
        <div className="app-shell-account">
          {user && <span>{`Logged in as ${displayName(user)}`}</span>}
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <Outlet />
    </>
  );
}