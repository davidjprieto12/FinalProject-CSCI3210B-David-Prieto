import django_filters

from .models import Event

class EventFilter(django_filters.FilterSet):
    board = django_filters.NumberFilter(field_name="board_id")

    class Meta:
        model = Event
        fields = ["status"]