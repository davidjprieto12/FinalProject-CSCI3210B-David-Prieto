export type BoardRole = "owner" | "member";

export interface HangoutBoard {
  id: number;
  name: string;
  invite_code: string;
  owner: number;
  created_at: string;
  member_count: number;
  my_role: BoardRole;
}

export interface BoardInput {
  name: string;
}

export interface JoinBoardInput {
  invite_code: string;
}