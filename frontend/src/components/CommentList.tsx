import { useState, type SubmitEvent } from "react";
import type { EventComment } from "../types/comment";
import { displayName } from "../utils/users";

interface CommentItemProps {
  comment: EventComment;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (id: number, body: string) => Promise<boolean>;
  onDelete: (id: number) => void;
}

function CommentItem({ comment, canEdit, canDelete, onEdit, onDelete }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);

  const save = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (await onEdit(comment.id, draft)) setEditing(false);
  };

  return (
    <li>
      <strong>{displayName(comment.author)}</strong>{" "}
      <time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString()}</time>
      {comment.edited_at && <span> (edited)</span>}
      {editing ? (
        <form onSubmit={save}>
          <textarea
            aria-label="Edit comment"
            value={draft}
            maxLength={1000}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" disabled={draft.trim() === ""}>Save</button>
          <button type="button" onClick={() => { setEditing(false); setDraft(comment.body); }}>
            Cancel
          </button>
        </form>
      ) : (
        <p>{comment.body}</p>
      )}
      {!editing && canEdit && <button type="button" onClick={() => setEditing(true)}>Edit</button>}
      {!editing && canDelete && (
        <button
          type="button"
          onClick={() => { if (window.confirm("Delete this comment?")) onDelete(comment.id); }}
        >
          Delete
        </button>
      )}
    </li>
  );
}

interface CommentListProps {
  comments: EventComment[];
  currentUserId: number | undefined;
  isBoardOwner: boolean;
  onEdit: (id: number, body: string) => Promise<boolean>;
  onDelete: (id: number) => void;
}

export function CommentList({ comments, currentUserId, isBoardOwner, onEdit, onDelete }: CommentListProps) {
  if (comments.length === 0) return <p>No comments yet.</p>;
  return (
    <ul>
      {comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          canEdit={c.author.id === currentUserId}
          canDelete={c.author.id === currentUserId || isBoardOwner}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}