from rest_framework.test import APITestCase

from accounts.models import User
from .models import Board, Membership


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