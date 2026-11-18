from rest_framework import serializers

from .models import Board


class BoardSerializer(serializers.ModelSerializer):
    # Both come from annotations added in BoardViewSet.get_queryset
    member_count = serializers.IntegerField(read_only=True)
    my_role = serializers.CharField(read_only=True)

    class Meta:
        model = Board
        fields = ["id", "name", "invite_code", "owner", "created_at", "member_count", "my_role"]
        read_only_fields = ["invite_code", "owner", "created_at"]


class JoinBoardSerializer(serializers.Serializer):
    invite_code = serializers.CharField(max_length=64)