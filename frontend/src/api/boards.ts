import { api } from "./client";
import type { BoardInput, HangoutBoard, JoinBoardInput, BoardMember } from "../types/board";

export const boardsApi = {
  list: () => api.get<HangoutBoard[]>("/boards/").then((r) => r.data),
  get: (id: number) => api.get<HangoutBoard>(`/boards/${id}/`).then((r) => r.data),
  create: (data: BoardInput) => api.post<HangoutBoard>("/boards/", data).then((r) => r.data),
  join: (data: JoinBoardInput) =>
    api.post<HangoutBoard>("/boards/join/", data).then((r) => r.data),
  update: (id: number, data: BoardInput) =>
    api.patch<HangoutBoard>(`/boards/${id}/`, data).then((r) => r.data),
  regenerateCode: (id: number) =>
    api.post<HangoutBoard>(`/boards/${id}/regenerate-code/`).then((r) => r.data),
  members: (id: number) =>
    api.get<BoardMember[]>(`/boards/${id}/members/`).then((r) => r.data),
  removeMember: (id: number, userId: number) =>
    api.delete<void>(`/boards/${id}/members/${userId}/`).then(() => undefined),
  leave: (id: number) => api.post<void>(`/boards/${id}/leave/`).then(() => undefined),
  remove: (id: number) => api.delete<void>(`/boards/${id}/`).then(() => undefined),
};