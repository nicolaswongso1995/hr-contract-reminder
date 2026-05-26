"""
Mekari Talenta API Client
=========================
Implements HMAC-SHA256 request signing per the Mekari API v3 spec.
Docs: https://documenter.getpostman.com/view/12246325/Tzm3nx7x

Authentication flow:
  1. Sign each request with HMAC-SHA256 using client_id + client_secret
  2. POST /oauth/token  →  get Bearer access token (valid 1 h)
  3. Use Bearer token for all subsequent calls
"""

import hmac
import hashlib
import base64
import json
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone


class TalentaClient:
    def __init__(self, client_id: str, client_secret: str, company_id: str,
                 base_url: str = "https://api.mekari.com"):
        self.client_id     = client_id
        self.client_secret = client_secret
        self.company_id    = company_id
        self.base_url      = base_url.rstrip("/")
        self._token        = None
        self._token_expiry = 0

    # ── HMAC signing ──────────────────────────────────────────

    def _date_header(self) -> str:
        return datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")

    def _hmac_signature(self, method: str, path: str, date: str) -> str:
        request_target = f"{method.lower()} {path}"
        signing_string = f"date: {date}\nrequest-target: {request_target}"
        raw = hmac.new(
            self.client_secret.encode("utf-8"),
            signing_string.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return base64.b64encode(raw).decode()

    def _auth_header(self, method: str, path: str, date: str) -> str:
        sig = self._hmac_signature(method, path, date)
        return (
            f'hmac keyId="{self.client_id}",'
            f'algorithm="hmac-sha256",'
            f'headers="date request-target",'
            f'signature="{sig}"'
        )

    # ── OAuth token ───────────────────────────────────────────

    def _get_token(self) -> str:
        """Return cached token or fetch a fresh one."""
        if self._token and time.time() < self._token_expiry:
            return self._token

        path  = "/oauth/token"
        date  = self._date_header()
        auth  = self._auth_header("POST", path, date)
        body  = urllib.parse.urlencode({
            "grant_type":    "client_credentials",
            "client_id":     self.client_id,
            "client_secret": self.client_secret,
        }).encode()

        req = urllib.request.Request(
            self.base_url + path,
            data=body,
            method="POST",
            headers={
                "Content-Type":  "application/x-www-form-urlencoded",
                "Authorization": auth,
                "Date":          date,
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())

        self._token        = data["access_token"]
        self._token_expiry = time.time() + data.get("expires_in", 3600) - 60
        return self._token

    # ── Generic request ───────────────────────────────────────

    def _get(self, path: str) -> dict:
        token = self._get_token()
        req   = urllib.request.Request(
            self.base_url + path,
            method="GET",
            headers={
                "Authorization": f"Bearer {token}",
                "x-company-id":  self.company_id,
                "Content-Type":  "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())

    # ── Employee endpoints ────────────────────────────────────

    def get_employees_page(self, page: int = 1, per_page: int = 100) -> dict:
        """Fetch one page of contract employees."""
        path = f"/v3/employees?page={page}&per_page={per_page}&employment_type=contract"
        return self._get(path)

    def get_all_employees(self) -> list[dict]:
        """Fetch every page and return a flat list of raw employee dicts."""
        all_employees = []
        page = 1
        while True:
            resp = self.get_employees_page(page)
            data = resp.get("data", [])
            all_employees.extend(data)
            meta = resp.get("meta", {})
            if page >= meta.get("last_page", 1):
                break
            page += 1
        return all_employees

    @staticmethod
    def map_employee(raw: dict) -> dict:
        """Normalise a raw Talenta employee dict to our internal schema."""
        emp_id    = raw.get("nik") or raw.get("employee_id") or str(raw.get("id", ""))
        first     = raw.get("first_name", "")
        last      = raw.get("last_name",  "")
        position  = (raw.get("job_position") or {}).get("name", "")
        dept      = (raw.get("organization") or {}).get("name", "")
        branch    = (raw.get("branch") or {}).get("name", "")
        mgr_email = (raw.get("direct_manager") or {}).get("email")

        # Contract dates may live under employment or at root level
        empl = raw.get("employment") or raw
        start = empl.get("contract_start_date") or raw.get("join_date", "")
        end   = empl.get("contract_end_date",   "")

        return {
            "id":                  f"tal-{raw.get('id', emp_id)}",
            "employee_id":         emp_id,
            "name":                f"{first} {last}".strip(),
            "position":            position,
            "department":          dept,
            "branch":              branch,
            "email":               raw.get("email", ""),
            "phone":               raw.get("mobile_phone", ""),
            "contract_start_date": start,
            "contract_end_date":   end,
            "manager_email":       mgr_email,
            "talenta_id":          str(raw.get("id", "")),
        }
