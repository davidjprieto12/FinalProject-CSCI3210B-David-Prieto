import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { boardsApi } from "../api/boards";
import type { BoardInput } from "../types/board";

export const useBoards = () => useQuery({ queryKey: ["boards"], queryFn: boardsApi.list });

export const useBoard = (id: number) =>
  useQuery({
    queryKey: ["board", id],
    queryFn: () => boardsApi.get(id),
    enabled: Number.isFinite(id),
  });

export const useCreateBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: boardsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board created");
    },
  });
};

export const useJoinBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: boardsApi.join,
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success(`Joined ${board.name}`);
    },
  });
};

const forgetBoard = (queryClient: QueryClient, id: number) => {
  queryClient.invalidateQueries({ queryKey: ["boards"] });
  queryClient.removeQueries({ queryKey: ["board", id] });
  queryClient.removeQueries({ queryKey: ["events", id] });
};

export const useBoardMembers = (id: number) =>
  useQuery({
    queryKey: ["board", id, "members"], // shares the ["board", id] prefix, so one invalidation covers both
    queryFn: () => boardsApi.members(id),
    enabled: Number.isFinite(id),
  });

export const useUpdateBoard = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BoardInput) => boardsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board", id] });
      toast.success("Board renamed");
    },
  });
};

export const useRegenerateCode = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => boardsApi.regenerateCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", id] });
      toast.success("New invite code created. The old one no longer works.");
    },
  });
};

export const useRemoveMember = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => boardsApi.removeMember(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", id] });
      queryClient.invalidateQueries({ queryKey: ["events", id] }); // their RSVPs were removed
      toast.success("Member removed");
    },
  });
};

export const useLeaveBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: boardsApi.leave,
    onSuccess: (_data, id) => {
      forgetBoard(queryClient, id);
      toast.success("You left the board");
    },
  });
};

export const useDeleteBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: boardsApi.remove,
    onSuccess: (_data, id) => {
      forgetBoard(queryClient, id);
      toast.success("Board deleted");
    },
  });
};