from django.shortcuts import render
from django.db.models import Count, OuterRef, Q, Subquery
from django.db import transaction
from django.utils import timezone

from rest_framework import viewsets, status, mixins
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from . import services
from .permissions import IsCreatorOrBoardOwner, IsCommentAuthorOrBoardOwner
from .models import Event, RSVP, ActivityLog, Comment
from .serializers import EventSerializer, TransitionSerializer, RSVPInputSerializer, CommentSerializer, ActivityLogSerializer

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from .filters import EventFilter

from boards.models import Membership

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, IsCreatorOrBoardOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = EventFilter
    search_fields = ["title", "description", "location"]
    ordering_fields = ["created_at", "starts_at"]

    def get_queryset(self):
        user = self.request.user
        my_rsvp = RSVP.objects.filter(
            event=OuterRef("pk"), user=user).values("response")[:1]
        return (
            Event.objects.filter(
                board_id__in=Membership.objects.filter(user=user).values("board_id")
            )
            .select_related("created_by")
            .annotate(
                going_count=Count("rsvps", filter=Q(rsvps__response="going")),
                my_rsvp=Subquery(my_rsvp),
            )
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        with transaction.atomic():
            event = serializer.save(created_by=self.request.user)
            ActivityLog.objects.create(
                event=event,
                actor=self.request.user,
                action="created",
                new_value=event.status,
            )

    def _fresh(self, pk):
        # Reread through get_queryset so the response has the annotations
        return EventSerializer(self.get_queryset().get(pk=pk)).data

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def transition(self, request, pk=None):
        event = self.get_object()
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = services.change_status(
            event, serializer.validated_data["status"], request.user
        )
        return Response(self._fresh(event.pk))

    @action(detail=True, methods=["put", "delete"], permission_classes=[IsAuthenticated])
    def rsvp(self, request, pk=None):
        event = self.get_object()
        if request.method == "PUT":
            serializer = RSVPInputSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            services.set_rsvp(event, request.user, serializer.validated_data["response"])
        else:
            services.remove_rsvp(event, request.user)
        return Response(self._fresh(event.pk))

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def activity(self, request, pk=None):
        event = self.get_object()
        entries = event.activity.select_related("actor")
        return Response(ActivityLogSerializer(entries, many=True).data)

    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticated])
    def comments(self, request, pk=None):
        event = self.get_object()
        if request.method == "POST":
            serializer = CommentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(event=event, author=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        queryset = event.comments.select_related("author")
        return Response(CommentSerializer(queryset, many=True).data)

class CommentViewSet(mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, IsCommentAuthorOrBoardOwner]
    http_method_names = ["patch", "delete", "head", "options"]

    def get_queryset(self):
        # Only comments on boards the user belongs to; everything else is a 404
        return Comment.objects.select_related("author", "event").filter(
            event__board_id__in=Membership.objects.filter(user=self.request.user).values("board_id")
        )

    def perform_update(self, serializer):
        serializer.save(edited_at=timezone.now())