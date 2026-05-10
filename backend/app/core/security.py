import base64
import hashlib
import hmac
import json
from datetime import UTC
from datetime import datetime
from datetime import timedelta
from typing import Any

from fastapi import HTTPException
from fastapi import status

from app.core.settings import settings


def _base64url_encode(data: bytes) -> str:
    return (
        base64.urlsafe_b64encode(data)
        .rstrip(b"=")
        .decode("ascii")
    )


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _json_encode(data: dict[str, Any]) -> bytes:
    return json.dumps(
        data,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def _sign(message: str) -> str:
    if not settings.SECRET_KEY:
        raise RuntimeError("SECRET_KEY is required for auth")

    digest = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        message.encode("ascii"),
        hashlib.sha256,
    ).digest()

    return _base64url_encode(digest)


def create_access_token(
    subject: str,
    role: str = "admin",
) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    header = {
        "alg": "HS256",
        "typ": "JWT",
    }
    payload = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    signing_input = ".".join([
        _base64url_encode(_json_encode(header)),
        _base64url_encode(_json_encode(payload)),
    ])
    signature = _sign(signing_input)

    return f"{signing_input}.{signature}"


def verify_access_token(token: str) -> dict[str, Any]:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        header_part, payload_part, signature = token.split(".")
    except ValueError as exc:
        raise credentials_error from exc

    signing_input = f"{header_part}.{payload_part}"
    expected_signature = _sign(signing_input)

    if not hmac.compare_digest(signature, expected_signature):
        raise credentials_error

    try:
        payload = json.loads(
            _base64url_decode(payload_part).decode("utf-8")
        )
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise credentials_error from exc

    expires_at = payload.get("exp")

    if (
        not isinstance(expires_at, int)
        or expires_at < int(datetime.now(UTC).timestamp())
    ):
        raise credentials_error

    return payload


def verify_admin_credentials(
    username: str,
    password: str,
) -> bool:
    expected_password = settings.ADMIN_PASSWORD

    if not expected_password and settings.APP_ENV != "production":
        expected_password = "admin"

    if not expected_password:
        return False

    username_matches = hmac.compare_digest(
        username,
        settings.ADMIN_USERNAME,
    )
    password_matches = hmac.compare_digest(
        password,
        expected_password,
    )

    return username_matches and password_matches
