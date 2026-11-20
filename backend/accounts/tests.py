from django.core.cache import cache
from rest_framework.test import APITestCase

from .models import User


class RegisterTests(APITestCase):
    url = "/api/auth/register/"

    def setUp(self):
        cache.clear()  # throttle counters (added in Part B) live in the cache

    def register(self, **overrides):
        data = {"username": "newfriend", "display_name": "New", "password": "Maple-River-7421"}
        data.update(overrides)
        return self.client.post(self.url, data, format="json")

    def test_registration_is_open_and_hashes_with_argon2(self):
        response = self.register()
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.get(username="newfriend").password.startswith("argon2"))
        self.assertNotIn("password", response.data)

    def test_weak_passwords_are_rejected(self):
        for bad in ["password", "12345678", "newfriend1"]:
            response = self.register(password=bad)
            self.assertEqual(response.status_code, 400, bad)
            self.assertIn("password", response.data)

    def test_duplicate_username_is_rejected(self):
        self.register()
        self.assertEqual(self.register().status_code, 400)