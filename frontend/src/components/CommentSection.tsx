import { useState } from "react";
import { useAddComment, useComments, useEditComment, useDeleteComment } from "../hooks/useComments";
import { useAuth } from "../hooks/useAuth";
import { parseApiError } from "../utils/errors";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import { toast } from "react-hot-toast"; 

interface CommentSectionProps {
  eventId: number;
  isBoardOwner: boolean;
}

export function CommentSection({ eventId, isBoardOwner }: CommentSectionProps) {
  const { data, isLoading, isError } = useComments(eventId);
  const addComment = useAddComment(eventId);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const editComment = useEditComment(eventId);
  const deleteComment = useDeleteComment(eventId);

  const handleSubmit = async (body: string): Promise<boolean> => {
    setError(null);
    try {
      await addComment.mutateAsync(body);
      return true;
    } catch (e) {
      // 403/404/500 are already toasted by the Axios interceptor,
      // so only a 400 field error is shown next to the form
      setError(parseApiError(e).fields.body?.[0] ?? null);
      return false;
    }
  };

   const handleEdit = async (id: number, body: string): Promise<boolean> => {
    try {
      await editComment.mutateAsync({ id, body });
      return true;
    } catch (e) {
      const message = parseApiError(e).fields.body?.[0];
      if (message) toast.error(message); // 403/404 are already toasted by the interceptor
      return false;
    }
  };

  return (
    <section aria-label="Comments">
      <h2>Comments</h2>
      {isLoading && <p>Loading…</p>}
      {isError && <p role="alert">Couldn't load comments.</p>}
      {data && (
        <CommentList
          comments={data}
          currentUserId={user?.id}
          isBoardOwner={isBoardOwner}
          onEdit={handleEdit}
          onDelete={(id) => deleteComment.mutate(id)}
        />
      )}
      <CommentForm
        onSubmit={handleSubmit}
        submitting={addComment.isPending}
        error={error}
      />
    </section>
  );
}