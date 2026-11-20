from django.db import transaction
from django.db.models import Count, OuterRef, Subquery
from django.shortcuts import get_object_or_404

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Board, Membership, generate_invite_code
from .serializers import BoardSerializer, JoinBoardSerializer, MemberSerializer

from events.models import RSVP


class BoardViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        my_role = Membership.objects.filter(board=OuterRef("pk"), user=user).values("role")[:1]
        return (
            # Only boards this user belongs to. A subquery (not a join) keeps the member count correct.
            Board.objects.filter(pk__in=Membership.objects.filter(user=user).values("board_id"))
            .annotate(member_count=Count("memberships", distinct=True), my_role=Subquery(my_role))
            .order_by("name")
        )

    def _fresh(self, pk):
        # Re-read through get_queryset so the response carries the annotations
        return BoardSerializer(self.get_queryset().get(pk=pk)).data

    def _require_owner(self, board):
        if board.owner_id != self.request.user.id:
            raise PermissionDenied("Only the board owner can do that.")

    def _drop_member(self, board, membership):
        with transaction.atomic():
            # Free their spots too, so capacity limits stay accurate
            RSVP.objects.filter(user_id=membership.user_id, event__board=board).delete()
            membership.delete()

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        return Response(self._fresh(self.kwargs["pk"]))  # fresh copy includes the annotations

    def perform_update(self, serializer):
        self._require_owner(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_owner(instance)
        instance.delete()  # events, comments, and RSVPs on this board go with it

    @action(detail=True, methods=["post"], url_path="regenerate-code")
    def regenerate_code(self, request, pk=None):
        board = self.get_object()
        self._require_owner(board)
        board.invite_code = generate_invite_code()
        board.save(update_fields=["invite_code"])
        return Response(self._fresh(board.pk))

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        board = self.get_object()
        memberships = board.memberships.select_related("user").order_by("joined_at")
        return Response(MemberSerializer(memberships, many=True).data)

    @action(detail=True, methods=["delete"], url_path=r"members/(?P<user_id>\d+)")
    def remove_member(self, request, pk=None, user_id=None):
        board = self.get_object()
        self._require_owner(board)
        if int(user_id) == board.owner_id:
            raise ValidationError({"detail": "The owner can't be removed."})
        self._drop_member(board, get_object_or_404(board.memberships, user_id=user_id))
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        board = self.get_object()
        if board.owner_id == request.user.id:
            raise ValidationError({"detail": "Owners can't leave their board. Delete it instead."})
        self._drop_member(board, board.memberships.get(user=request.user))
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():  # the board and its owner membership are saved together
            board = serializer.save(owner=request.user)
            Membership.objects.create(board=board, user=request.user, role=Membership.Role.OWNER)
        return Response(self._fresh(board.pk), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def join(self, request):
        serializer = JoinBoardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        board = Board.objects.filter(invite_code=serializer.validated_data["invite_code"]).first()
        if board is None:
            raise ValidationError({"invite_code": ["Invalid invite code."]})
        _, created = Membership.objects.get_or_create(
            board=board, user=request.user, defaults={"role": Membership.Role.MEMBER}
        )
        return Response(
            self._fresh(board.pk),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )