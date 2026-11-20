import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boardsApi } from "../api/boards";

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