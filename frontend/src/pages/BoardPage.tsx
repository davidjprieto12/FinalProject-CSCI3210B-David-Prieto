import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Board } from "../components/Board";
import { FilterBar } from "../components/FilterBar";
import { useAuth } from "../hooks/useAuth";
import { useBoard } from "../hooks/useBoards";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useChangeStatus, useDeleteEvent, useEvents } from "../hooks/useEvents";
import {
  EMPTY_FILTERS,
  type EventFilters,
  type EventStatus,
  type HangoutEvent,
} from "../types/event";
import { isNotFound } from "../utils/errors";
import { NotFoundPage } from "./NotFoundPage";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const id = Number(boardId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: board, error: boardError } = useBoard(id);
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search);
  const { data, isLoading, isError, refetch } = useEvents(id, {
    ...filters,
    search: debouncedSearch,
  });
  const deleteEvent = useDeleteEvent();
  const changeStatus = useChangeStatus();

  if (!Number.isFinite(id) || (boardError && isNotFound(boardError))) {
    return <NotFoundPage message="That board doesn't exist, or you aren't a member of it." />;
  }

  const hasFilters = filters.search.trim() !== "" || filters.status !== "";

  const canDelete = (event: HangoutEvent) =>
    board?.my_role === "owner" || event.created_by === user?.id;

  const handleDelete = (eventId: number) => {
    if (window.confirm("Delete this event?")) deleteEvent.mutate(eventId);
  };

  const handleStatusChange = (eventId: number, status: EventStatus) =>
    changeStatus.mutate({ id: eventId, status });

  const copyCode = async () => {
    if (!board) return;
    try {
      await navigator.clipboard.writeText(board.invite_code);
      toast.success("Invite code copied");
    } catch {
      toast.error("Couldn't copy. Select the code and copy it manually.");
    }
  };

  return (
    <main>
     <h1>{board?.name ?? "Board"}</h1>
     <button
       className="powder-outline-action board-new-event"
       type="button"
       onClick={() => navigate(`/boards/${id}/events/new`)}
     >
       New event
     </button>

      {board && (
        <p>
          Invite code: <code>{board.invite_code}</code>{" "}
          <button type="button" onClick={copyCode}>
            Copy
          </button>
        </p>
      )}

      <FilterBar filters={filters} onChange={setFilters} />

      {isLoading && <p>Loading…</p>}
      {isError && (
        <div role="alert">
          <p>Couldn't load events.</p>
          <button type="button" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}
      {data && data.length === 0 && (
        <p>{hasFilters ? "No events match your filters." : "No events yet."}</p>
      )}
      {data && (
        <Board
          events={data}
          canDelete={canDelete}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}
    </main>
  );
}