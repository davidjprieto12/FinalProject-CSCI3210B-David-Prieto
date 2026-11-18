from django.db import transaction
from django.db.models import Count, OuterRef, Subquery
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Board, Membership
from .serializers import BoardSerializer, JoinBoardSerializer


class BoardViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
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