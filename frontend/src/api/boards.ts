import { api } from "./client";
import type { BoardInput, HangoutBoard, JoinBoardInput } from "../types/board";

export const boardsApi = {
  list: () => api.get<HangoutBoard[]>("/boards/").then((r) => r.data),
  get: (id: number) => api.get<HangoutBoard>(`/boards/${id}/`).then((r) => r.data),
  create: (data: BoardInput) => api.post<HangoutBoard>("/boards/", data).then((r) => r.data),
  join: (data: JoinBoardInput) =>
    api.post<HangoutBoard>("/boards/join/", data).then((r) => r.data),
};