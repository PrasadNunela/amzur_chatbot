"""Route handlers for DataFrame question answering."""

from __future__ import annotations

import asyncio
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from gspread.exceptions import APIError, SpreadsheetNotFound, WorksheetNotFound
from pydantic import BaseModel, Field

from app.services.agent_service import AgentExecutionError, AgentService
from app.services.sheets_service import SheetsService

router = APIRouter(tags=["query"])


class QueryRequest(BaseModel):
    """Request payload for natural-language DataFrame querying."""

    file_source: str = Field(
        ...,
        min_length=1,
        description="CSV/XLSX file path or Google Sheets URL",
    )
    user_question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Natural-language question about the loaded data",
    )


class QueryResponse(BaseModel):
    """Response payload for the query endpoint."""

    answer: str
    row_count: int
    column_count: int


@router.post("/query", response_model=QueryResponse)
async def query_dataframe(payload: QueryRequest) -> QueryResponse:
    """Load tabular data and answer a user question with a Pandas dataframe agent."""
    try:
        dataframe = SheetsService.load_dataframe(payload.file_source)

        answer = await AgentService.answer_question(
            dataframe=dataframe,
            user_question=payload.user_question,
        )

        return QueryResponse(
            answer=answer,
            row_count=int(dataframe.shape[0]),
            column_count=int(dataframe.shape[1]),
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "file_not_found", "message": str(exc)},
        ) from exc
    except (SpreadsheetNotFound, WorksheetNotFound) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "spreadsheet_not_found", "message": str(exc)},
        ) from exc
    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": "google_sheets_api_error", "message": str(exc)},
        ) from exc
    except (ValueError, pd.errors.ParserError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_input", "message": str(exc)},
        ) from exc
    except asyncio.TimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={"error": "agent_timeout", "message": "Agent execution timed out"},
        ) from exc
    except AgentExecutionError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "agent_error", "message": str(exc)},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "internal_error", "message": str(exc)},
        ) from exc


@router.post("/query/upload", response_model=QueryResponse)
async def query_uploaded_csv(
    file: UploadFile = File(...),
    user_question: str = Form(...),
) -> QueryResponse:
    """Accept a CSV upload and answer a question about its data."""
    try:
        filename = (file.filename or "").lower()
        if not filename.endswith(".csv"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "invalid_file_type", "message": "Only .csv files are allowed"},
            )

        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "empty_file", "message": "Uploaded CSV file is empty"},
            )

        dataframe = pd.read_csv(BytesIO(content))
        answer = await AgentService.answer_question(
            dataframe=dataframe,
            user_question=user_question,
        )

        return QueryResponse(
            answer=answer,
            row_count=int(dataframe.shape[0]),
            column_count=int(dataframe.shape[1]),
        )

    except HTTPException:
        raise
    except asyncio.TimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={"error": "agent_timeout", "message": "Agent execution timed out"},
        ) from exc
    except (ValueError, pd.errors.ParserError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_input", "message": str(exc)},
        ) from exc
    except AgentExecutionError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "agent_error", "message": str(exc)},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "internal_error", "message": str(exc)},
        ) from exc
