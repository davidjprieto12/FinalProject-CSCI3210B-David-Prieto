import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BoardCard } from "../components/BoardCard";
import { SingleFieldForm } from "../components/SingleFieldForm";
import { useBoards, useCreateBoard, useJoinBoard } from "../hooks/useBoards";
import { parseApiError } from "../utils/errors";

export function BoardsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useBoards();
  const createBoard = useCreateBoard();
  const joinBoard = useJoinBoard();
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleCreate = async (name: string): Promise<boolean> => {
    setCreateError(null);
    try {
      const board = await createBoard.mutateAsync({ name });
      navigate(`/boards/${board.id}`);
      return true;
    } catch (e) {
      const parsed = parseApiError(e);
      setCreateError(parsed.fields.name?.[0] ?? parsed.message);
      return false;
    }
  };

  const handleJoin = async (code: string): Promise<boolean> => {
    setJoinError(null);
    try {
      const board = await joinBoard.mutateAsync({ invite_code: code });
      navigate(`/boards/${board.id}`);
      return true;
    } catch (e) {
      setJoinError(parseApiError(e).fields.invite_code?.[0] ?? null);
      return false;
    }
  };

  return (
    <main>
      <h1>Your boards</h1>

      {isLoading && <p>Loading…</p>}
      {isError && (
        <div role="alert">
          <p>Couldn't load your boards.</p>
          <button type="button" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}
      {data && data.length === 0 && (
        <p>You aren't on any boards yet. Create one, or join a friend's with an invite code.</p>
      )}
      {data && data.length > 0 && (
        <ul>
          {data.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </ul>
      )}

      <section aria-label="Create a board">
        <h2>Create a board</h2>
        <SingleFieldForm
          id="board-name"
          label="Board name"
          buttonLabel="Create"
          maxLength={60}
          onSubmit={handleCreate}
          submitting={createBoard.isPending}
          error={createError}
        />
      </section>

      <section aria-label="Join a board">
        <h2>Join a board</h2>
        <SingleFieldForm
          id="invite-code"
          label="Invite code"
          buttonLabel="Join"
          maxLength={64}
          onSubmit={handleJoin}
          submitting={joinBoard.isPending}
          error={joinError}
        />
      </section>
    </main>
  );
}