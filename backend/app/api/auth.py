from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status

from app.api.dependencies import get_current_admin
from app.core.security import create_access_token
from app.core.security import verify_admin_credentials
from app.schemas.auth import CurrentUserResponse
from app.schemas.auth import LoginRequest
from app.schemas.auth import TokenResponse

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
async def login(
    credentials: LoginRequest,
):
    if not verify_admin_credentials(
        credentials.username,
        credentials.password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return TokenResponse(
        access_token=create_access_token(
            subject=credentials.username,
            role="admin",
        )
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
async def read_current_user(
    current_user: CurrentUserResponse = Depends(
        get_current_admin
    ),
):
    return current_user
