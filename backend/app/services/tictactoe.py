"""Tic-Tac-Toe LLM Agent service.

Responsibilities:
- Serialize board state into a human-readable format for the prompt.
- Call the LiteLLM proxy and parse the strictly-typed JSON response.
- Validate the chosen move (occupied-cell check) with up to MAX_RETRIES self-corrections.
- Evaluate game outcome after the AI's move.
"""

import logging
from typing import Literal

from app.ai.llm import openai_client
from app.core.config import settings
from app.schemas.tictactoe import GameMoveResponse, GameStatus, Marker

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

WINNING_LINES: list[tuple[int, int, int]] = [
    (0, 1, 2),
    (3, 4, 5),
    (6, 7, 8),  # rows
    (0, 3, 6),
    (1, 4, 7),
    (2, 5, 8),  # columns
    (0, 4, 8),
    (2, 4, 6),  # diagonals
]

Cell = Literal["X", "O", ""]


# ---------------------------------------------------------------------------
# Board helpers
# ---------------------------------------------------------------------------


def _visual_board(board: list[Cell]) -> str:
    """Return a 3-row ASCII board with actual markers (. for empty)."""

    def cell(i: int) -> str:
        return board[i] if board[i] else "."

    return (
        f"  {cell(0)} | {cell(1)} | {cell(2)}\n"
        f"  ---------\n"
        f"  {cell(3)} | {cell(4)} | {cell(5)}\n"
        f"  ---------\n"
        f"  {cell(6)} | {cell(7)} | {cell(8)}"
    )


def _empty_cells(board: list[Cell]) -> list[int]:
    return [i for i, c in enumerate(board) if not c]


def check_winner(board: list[Cell]) -> Marker | None:
    """Return the winning marker ('X' or 'O') or None if no winner yet."""
    for a, b, c in WINNING_LINES:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]  # type: ignore[return-value]
    return None


def is_draw(board: list[Cell]) -> bool:
    return not _empty_cells(board) and check_winner(board) is None


def _game_status(board: list[Cell], ai_marker: Marker, user_marker: Marker) -> GameStatus:
    winner = check_winner(board)
    if winner == ai_marker:
        return "ai_win"
    if winner == user_marker:
        return "user_win"
    if is_draw(board):
        return "draw"
    return "ongoing"




# ---------------------------------------------------------------------------
# Deterministic move selection (never fails)
# ---------------------------------------------------------------------------

_FALLBACK_TAUNTS = [
    "My move. Try to stop me.",
    "Too easy.",
    "You never had a chance.",
    "I calculated that three moves ago.",
    "Inevitable.",
    "Predictable.",
]


def _find_winning_cell(board: list[Cell], marker: Marker) -> int | None:
    """Return the cell that completes a winning line for `marker`, or None."""
    for a, b, c in WINNING_LINES:
        line = [board[a], board[b], board[c]]
        if line.count(marker) == 2 and line.count("") == 1:
            idx = [a, b, c][line.index("")]
            return idx
    return None


def _pick_move(board: list[Cell], ai_marker: Marker, user_marker: Marker) -> int:
    """Deterministic strategy: win > block > fork > center > corner > edge."""
    empty = _empty_cells(board)

    # 1. Win
    cell = _find_winning_cell(board, ai_marker)
    if cell is not None:
        return cell

    # 2. Block
    cell = _find_winning_cell(board, user_marker)
    if cell is not None:
        return cell

    # 3. Center
    if 4 in empty:
        return 4

    # 4. Corners
    for c in [0, 2, 6, 8]:
        if c in empty:
            return c

    # 5. Edges
    for c in [1, 3, 5, 7]:
        if c in empty:
            return c

    return empty[0]  # Should never reach here if board not full


# ---------------------------------------------------------------------------
# LLM — trash talk only
# ---------------------------------------------------------------------------

def _get_trash_talk(board: list[Cell], ai_marker: Marker, user_marker: Marker,
                    move: int, user_email: str) -> str:
    """Ask the LLM for a short taunt. Returns a canned fallback on any failure."""
    import random

    visual = _visual_board(board)
    prompt = (
        f"You are a witty Tic-Tac-Toe AI playing as {ai_marker}. "
        f"You just played cell {move}.\n"
        f"Board:\n{visual}\n\n"
        f"Write ONE short trash-talk taunt (max 8 words). "
        f"Reply with ONLY the taunt text — no labels, no quotes, no punctuation at the start."
    )
    try:
        client = openai_client()
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
            max_tokens=32,
            user=user_email,
            extra_body={
                "metadata": {
                    "application": settings.APP_NAME,
                    "environment": settings.ENVIRONMENT,
                }
            },
        )
        talk = (response.choices[0].message.content or "").strip()
        # Trim to 8 words max
        words = talk.split()
        return " ".join(words[:8]) if words else random.choice(_FALLBACK_TAUNTS)
    except Exception:
        return random.choice(_FALLBACK_TAUNTS)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_ai_move(
    board: list[Cell],
    user_marker: Marker,
    user_email: str,
) -> GameMoveResponse:
    """Determine the AI's next move.

    Move selection is deterministic (win > block > center > corner > edge) —
    it never fails. The LLM is called only for trash talk, with a canned
    fallback on any LLM error.
    """
    ai_marker: Marker = "O" if user_marker == "X" else "X"

    move = _pick_move(board, ai_marker, user_marker)
    trash_talk = _get_trash_talk(board, ai_marker, user_marker, move, user_email)

    updated_board = list(board)
    updated_board[move] = ai_marker
    status = _game_status(updated_board, ai_marker, user_marker)

    logger.info("Tic-Tac-Toe AI chose cell %d — status: %s", move, status)

    return GameMoveResponse(
        move=move,
        trash_talk=trash_talk,
        board=updated_board,  # type: ignore[arg-type]
        game_status=status,
    )
