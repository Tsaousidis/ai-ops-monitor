from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.security import HTTPBearer

from app.core.security import verify_access_token
from app.db.session import AsyncSessionLocal
from app.schemas.auth import CurrentUserResponse

bearer_scheme = HTTPBearer()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
) -> CurrentUserResponse:
    payload = verify_access_token(credentials.credentials)
    username = payload.get("sub")
    role = payload.get("role")

    if not isinstance(username, str) or role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges are required",
        )

    return CurrentUserResponse(
        username=username,
        role=role,
    )
