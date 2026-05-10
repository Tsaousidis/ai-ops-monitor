from fastapi import APIRouter
from fastapi import HTTPException
from fastapi import status
from fastapi import WebSocket
from fastapi import WebSocketDisconnect

from app.core.security import verify_access_token
from app.websocket.websocket_manager import (
    manager,
)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
):
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION
        )
        return

    try:
        payload = verify_access_token(token)
    except HTTPException:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION
        )
        return

    if payload.get("role") != "admin":
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION
        )
        return

    await manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(websocket)
