"""FastAPI router for the Tic-Tac-Toe LLM Agent.

Single endpoint: POST /api/tictactoe/move
Delegates all business logic to app.services.tictactoe.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.db.session import get_current_user
from app.schemas.tictactoe import GameMoveRequest, GameMoveResponse
from app.services import tictactoe as tictactoe_service
from openai import OpenAIError

router = APIRouter(prefix="/tictactoe", tags=["tictactoe"])


@router.post("/move", response_model=GameMoveResponse)
async def make_ai_move(
    request: GameMoveRequest,
    current_user: dict = Depends(get_current_user),
) -> GameMoveResponse:
    """
    Request the LLM agent to choose its next Tic-Tac-Toe move.

    The caller sends the current board state and their marker; the service
    returns the AI's updated board, the chosen cell index, a witty trash-talk
    line, and the resulting game status.
    """
    try:
        return tictactoe_service.get_ai_move(
            board=list(request.board),
            user_marker=request.user_marker,
            user_email=current_user["email"],
        )
    except OpenAIError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "llm_error", "message": str(exc)},
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error": "agent_exhausted", "message": str(exc)},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": "unexpected", "message": str(exc)},
        )
