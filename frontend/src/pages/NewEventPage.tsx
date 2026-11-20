import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { NotFoundPage } from "./NotFoundPage";
import { EventForm } from "../components/EventForm";
import { useCreateEvent } from "../hooks/useEvents";
import { parseApiError, type FieldErrors } from "../utils/errors";
import type { EventInput } from "../types/event";

export function NewEventPage() {
  const navigate = useNavigate();
  const createEvent = useCreateEvent();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { boardId } = useParams<{ boardId: string }>();
  const id = Number(boardId);

  const handleSubmit = (data: EventInput) => {
    setFieldErrors({});
    createEvent.mutate(
      {...data, board: id }, 
      {
      onSuccess: () => navigate(`/boards/${id}`),
      onError: (error) => setFieldErrors(parseApiError(error).fields),
    });
  };

  if (!Number.isFinite(id)) return <NotFoundPage />;

  return (
    <main>
      <h1>New event</h1>
      <Link to={`/boards/${id}`}>Back to board</Link>
      <EventForm onSubmit={handleSubmit} submitting={createEvent.isPending} fieldErrors={fieldErrors} submitLabel="Create Event"/>
    </main>
  );
}