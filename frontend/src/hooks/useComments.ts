import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commentsApi } from "../api/comments";
import { toast } from "react-hot-toast";

export const useComments = (eventId: number) =>
  useQuery({
    queryKey: ["comments", eventId],
    queryFn: () => commentsApi.list(eventId),
  });

export const useAddComment = (eventId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => commentsApi.add(eventId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["comments", eventId] }),
  });
};

export const useEditComment = (eventId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => commentsApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", eventId] }),
  });
};

export const useDeleteComment = (eventId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: commentsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", eventId] });
      toast.success("Comment deleted");
    },
  });
};