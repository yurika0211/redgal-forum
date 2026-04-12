#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080/api/v1}"
SUPER_ADMIN_ACCOUNT="${SUPER_ADMIN_ACCOUNT:-}"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-}"
TMP_BODY="/tmp/rubedo_route_regression_body.json"

pass_count=0
fail_count=0

record_pass() {
  echo "PASS: $1"
  pass_count=$((pass_count + 1))
}

record_fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}

http_status() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local token="${4:-}"

  if [[ -n "$body" && -n "$token" ]]; then
    curl -sS -o "$TMP_BODY" -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "$body"
  elif [[ -n "$body" ]]; then
    curl -sS -o "$TMP_BODY" -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" -d "$body"
  elif [[ -n "$token" ]]; then
    curl -sS -o "$TMP_BODY" -w "%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $token"
  else
    curl -sS -o "$TMP_BODY" -w "%{http_code}" -X "$method" "$url"
  fi
}

echo "== Base URL: $BASE_URL =="

health_code="$(http_status GET "$BASE_URL/health")"
if [[ "$health_code" == "200" ]]; then
  record_pass "GET /health => 200"
else
  record_fail "GET /health expected 200, got $health_code"
fi

ts="$(date +%s)"
username="route_probe_${ts}"
student_id="S${ts}"
register_payload="{\"student_id\":\"$student_id\",\"username\":\"$username\",\"password\":\"route-probe-pass\"}"
register_code="$(http_status POST "$BASE_URL/auth/register" "$register_payload")"
if [[ "$register_code" == "201" ]]; then
  record_pass "POST /auth/register => 201"
else
  record_fail "POST /auth/register expected 201, got $register_code"
fi

friends_code="$(http_status GET "$BASE_URL/users/$username/friends")"
if [[ "$friends_code" == "200" ]]; then
  record_pass "GET /users/:username/friends (existing user) => 200"
else
  record_fail "GET /users/:username/friends expected 200, got $friends_code"
fi

missing_friends_code="$(http_status GET "$BASE_URL/users/nonexistent_route_probe_user/friends")"
if [[ "$missing_friends_code" == "404" ]]; then
  record_pass "GET /users/:username/friends (missing user) => 404"
else
  record_fail "GET /users/:username/friends (missing user) expected 404, got $missing_friends_code"
fi

super_unauth_code="$(http_status GET "$BASE_URL/super-admin/forum/settings")"
if [[ "$super_unauth_code" == "401" ]]; then
  record_pass "GET /super-admin/forum/settings (no token) => 401"
else
  record_fail "GET /super-admin/forum/settings (no token) expected 401, got $super_unauth_code"
fi

if [[ -n "$SUPER_ADMIN_ACCOUNT" && -n "$SUPER_ADMIN_PASSWORD" ]]; then
  super_login_payload="{\"account\":\"$SUPER_ADMIN_ACCOUNT\",\"password\":\"$SUPER_ADMIN_PASSWORD\"}"
  super_login_code="$(http_status POST "$BASE_URL/auth/login" "$super_login_payload")"
  super_token=""
  if [[ "$super_login_code" == "200" ]]; then
    super_token="$(jq -r '.data.access_token // empty' "$TMP_BODY")"
  fi

  if [[ -n "$super_token" ]]; then
    super_auth_code="$(http_status GET "$BASE_URL/super-admin/forum/settings" "" "$super_token")"
    if [[ "$super_auth_code" == "200" ]]; then
      record_pass "GET /super-admin/forum/settings (super-admin token) => 200"
    else
      record_fail "GET /super-admin/forum/settings (super-admin token) expected 200, got $super_auth_code"
    fi
  else
    record_fail "POST /auth/login for super admin failed (code=$super_login_code)"
  fi
else
  echo "SKIP: super-admin token check (set SUPER_ADMIN_ACCOUNT and SUPER_ADMIN_PASSWORD)"
fi

echo ""
echo "Summary: PASS=$pass_count FAIL=$fail_count"
if [[ "$fail_count" -gt 0 ]]; then
  echo "Last response body:"
  cat "$TMP_BODY" || true
  exit 1
fi
