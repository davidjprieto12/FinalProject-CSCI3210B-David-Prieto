from rest_framework.routers import DefaultRouter
from .views import EventViewSet, CommentViewSet

router = DefaultRouter()
router.register("events", EventViewSet, basename="event")
router.register("comments", CommentViewSet, basename="comment")
urlpatterns = router.urls