import { Link } from "react-router-dom";
import type { HangoutBoard } from "../types/board";

interface BoardCardProps {
  board: HangoutBoard;
}

export function BoardCard({ board }: BoardCardProps) {
  return (
    <li>
      <Link to={`/boards/${board.id}`}>{board.name}</Link>
      <span>
        {" "}
        {board.my_role === "owner" ? "Owner" : "Member"} · {board.member_count}{" "}
        {board.member_count === 1 ? "member" : "members"}
      </span>
    </li>
  );
}