from rest_framework.test import APITestCase

from accounts.models import User
from .models import Board, Membership
from events.models import Event, RSVP


def make_board(owner, name="Test board"):
    board = Board.objects.create(name=name, owner=owner)
    Membership.objects.create(board=board, user=owner, role=Membership.Role.OWNER)
    return board


class BoardApiTests(APITestCase):
    def setUp(self):
        self.alex = User.objects.create_user(username="alex", password="testpass123")
        self.sam = User.objects.create_user(username="sam", password="testpass123")
        self.client.force_authenticate(self.alex)

    def test_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/boards/").status_code, 401)

    def test_create_makes_creator_the_owner(self):
        response = self.client.post("/api/boards/", {"name": "Friends"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["my_role"], "owner")
        self.assertEqual(response.data["member_count"], 1)
        self.assertTrue(response.data["invite_code"])

    def test_blank_name_is_rejected(self):
        response = self.client.post("/api/boards/", {"name": "   "}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_join_with_valid_code(self):
        board = make_board(self.sam)
        response = self.client.post(
            "/api/boards/join/", {"invite_code": board.invite_code}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["my_role"], "member")
        self.assertEqual(response.data["member_count"], 2)

    def test_joining_twice_does_not_duplicate(self):
        board = make_board(self.sam)
        payload = {"invite_code": board.invite_code}
        self.client.post("/api/boards/join/", payload, format="json")
        again = self.client.post("/api/boards/join/", payload, format="json")
        self.assertEqual(again.status_code, 200)
        self.assertEqual(board.memberships.count(), 2)

    def test_invalid_code_is_rejected(self):
        response = self.client.post("/api/boards/join/", {"invite_code": "nope"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("invite_code", response.data)

class BoardManagementTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="testpass123")
        self.member = User.objects.create_user(username="member", password="testpass123")
        self.board = make_board(self.owner)
        Membership.objects.create(board=self.board, user=self.member)
        self.url = f"/api/boards/{self.board.pk}/"

    def test_only_owner_can_rename(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.patch(self.url, {"name": "X"}, format="json").status_code, 403)
        self.client.force_authenticate(self.owner)
        response = self.client.patch(self.url, {"name": "Renamed"}, format="json")
        self.assertEqual((response.status_code, response.data["name"]), (200, "Renamed"))

    def test_regenerated_code_replaces_old_one(self):
        old = self.board.invite_code
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.post(self.url + "regenerate-code/").status_code, 200)
        self.board.refresh_from_db()
        self.assertNotEqual(self.board.invite_code, old)
        self.client.force_authenticate(User.objects.create_user(username="newbie", password="testpass123"))
        join = self.client.post("/api/boards/join/", {"invite_code": old}, format="json")
        self.assertEqual(join.status_code, 400)

    def test_removing_member_revokes_access_and_frees_their_rsvp(self):
        event = Event.objects.create(title="Pizza", board=self.board, status="open", created_by=self.owner)
        RSVP.objects.create(event=event, user=self.member, response="going")
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.delete(f"{self.url}members/{self.member.pk}/").status_code, 204)
        self.assertEqual(RSVP.objects.count(), 0)
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_member_cannot_remove_others_and_owner_cannot_be_removed(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.delete(f"{self.url}members/{self.owner.pk}/").status_code, 403)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.delete(f"{self.url}members/{self.owner.pk}/").status_code, 400)

    def test_member_can_leave_but_owner_cannot(self):
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.post(self.url + "leave/").status_code, 400)
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.post(self.url + "leave/").status_code, 204)
        self.assertFalse(Membership.objects.filter(board=self.board, user=self.member).exists())

    def test_only_owner_can_delete_board(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.delete(self.url).status_code, 403)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.delete(self.url).status_code, 204)
        self.assertFalse(Board.objects.filter(pk=self.board.pk).exists())