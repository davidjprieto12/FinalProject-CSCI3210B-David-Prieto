from rest_framework.permissions import SAFE_METHODS, BasePermission

from boards.models import Membership

class IsCreatorOrBoardOwner(BasePermission):
    # Members can read; only the event's creator or the board's owner can change or delete.

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if obj.created_by_id == request.user.id:
            return True
        return Membership.objects.filter(
            board_id=obj.board_id, user=request.user, role=Membership.Role.OWNER
        ).exists()