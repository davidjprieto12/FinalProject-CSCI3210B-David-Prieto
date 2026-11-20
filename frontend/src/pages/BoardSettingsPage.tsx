import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { SingleFieldForm } from "../components/SingleFieldForm";
import { useAuth } from "../hooks/useAuth";
import {
  useBoard, useBoardMembers, useDeleteBoard, useLeaveBoard,
  useRegenerateCode, useRemoveMember, useUpdateBoard,
} from "../hooks/useBoards";
import { isNotFound, parseApiError } from "../utils/errors";
import { NotFoundPage } from "./NotFoundPage";

export function BoardSettingsPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const id = Number(boardId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: board, error, isLoading } = useBoard(id);
  const { data: members } = useBoardMembers(id);
  const updateBoard = useUpdateBoard(id);
  const regenerate = useRegenerateCode(id);
  const removeMember = useRemoveMember(id);
  const leaveBoard = useLeaveBoard();
  const deleteBoard = useDeleteBoard();
  const [renameError, setRenameError] = useState<string | null>(null);

  if (!Number.isFinite(id) || (error && isNotFound(error))) {
    return <NotFoundPage message="That board doesn't exist, or you aren't a member of it." />;
  }
  if (isLoading || !board) return <p>Loading…</p>;

  const isOwner = board.my_role === "owner";

  const handleRename = async (name: string): Promise<boolean> => {
    setRenameError(null);
    try {
      await updateBoard.mutateAsync({ name });
      return true;
    } catch (e) {
      setRenameError(parseApiError(e).fields.name?.[0] ?? null);
      return false;
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(board.invite_code);
      toast.success("Invite code copied");
    } catch {
      toast.error("Couldn't copy. Select the code and copy it manually.");
    }
  };

  return (
    <main>
      <h1>{board.name} settings</h1>

      <section aria-label="Invite code">
        <h2>Invite code</h2>
        <p>
          <code>{board.invite_code}</code>{" "}
          <button type="button" onClick={copyCode}>Copy</button>
          {isOwner && (
            <button
              type="button"
              disabled={regenerate.isPending}
              onClick={() => {
                if (window.confirm("Generate a new code? The current one will stop working.")) {
                  regenerate.mutate();
                }
              }}
            >
              Generate new code
            </button>
          )}
        </p>
      </section>

      {isOwner && (
        <section aria-label="Rename board">
          <h2>Rename</h2>
          <SingleFieldForm
            id="board-rename"
            label="New name"
            buttonLabel="Rename"
            maxLength={60}
            onSubmit={handleRename}
            submitting={updateBoard.isPending}
            error={renameError}
          />
        </section>
      )}

      <section aria-label="Members">
        <h2>Members ({members?.length ?? board.member_count})</h2>
        <ul>
          {members?.map((m) => (
            <li key={m.user.id}>
              {m.user.display_name || m.user.username}
              {m.user.id === user?.id && " (you)"} · {m.role === "owner" ? "Owner" : "Member"}
              {isOwner && m.role !== "owner" && (
                <button
                  type="button"
                  disabled={removeMember.isPending}
                  onClick={() => {
                    if (window.confirm(`Remove ${m.user.display_name || m.user.username}?`)) {
                      removeMember.mutate(m.user.id);
                    }
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Leave or delete">
        {isOwner ? (
          <>
            <h2>Delete board</h2>
            <p>This permanently deletes the board and every event on it.</p>
            <button
              type="button"
              disabled={deleteBoard.isPending}
              onClick={() => {
                if (window.confirm(`Delete "${board.name}" and all its events?`)) {
                  deleteBoard.mutate(id, { onSuccess: () => navigate("/") });
                }
              }}
            >
              Delete board
            </button>
          </>
        ) : (
          <>
            <h2>Leave board</h2>
            <button
              type="button"
              disabled={leaveBoard.isPending}
              onClick={() => {
                if (window.confirm(`Leave "${board.name}"?`)) {
                  leaveBoard.mutate(id, { onSuccess: () => navigate("/") });
                }
              }}
            >
              Leave board
            </button>
          </>
        )}
      </section>
    </main>
  );
}