"""Pydantic schemas for the Tic-Tac-Toe LLM Agent API."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


# Each cell is "X", "O", or "" (empty)
Cell = Literal["X", "O", ""]
Marker = Literal["X", "O"]
GameStatus = Literal["ongoing", "ai_win", "user_win", "draw"]


class GameMoveRequest(BaseModel):
    """Request body for the AI move endpoint."""

    board: list[Cell] = Field(
        ...,
        description="9-element list representing the 3x3 board. Each cell is 'X', 'O', or ''.",
        min_length=9,
        max_length=9,
    )
    user_marker: Marker = Field(
        ...,
        description="The marker the human player is using ('X' or 'O').",
    )

    @field_validator("board")
    @classmethod
    def validate_board(cls, board: list[Cell]) -> list[Cell]:
        if len(board) != 9:
            raise ValueError("Board must contain exactly 9 cells.")
        return board


class GameMoveResponse(BaseModel):
    """Response body with the AI's chosen move and game outcome."""

    move: int = Field(
        ...,
        ge=0,
        le=8,
        description="Cell index (0–8) where the AI placed its marker.",
    )
    trash_talk: str = Field(
        ...,
        description="Witty, context-aware taunt from the AI.",
    )
    board: list[Cell] = Field(
        ...,
        description="Updated board state after the AI's move.",
    )
    game_status: GameStatus = Field(
        ...,
        description="Game state after the AI's move.",
    )


class LLMMovePayload(BaseModel):
    """Internal schema for parsing the raw LLM JSON response."""

    move: int = Field(..., ge=0, le=8)
    trash_talk: str
