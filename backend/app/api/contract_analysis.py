"""API router for legal contract analysis."""

import json
from datetime import datetime
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_current_user, get_db
from app.schemas.contract_analysis import (
    ContractAnalysisResponseSchema,
    ContractAnalysisSaveRequestSchema,
    SavedContractAnalysisListItemSchema,
    SavedContractAnalysisSchema,
)
from app.services.contract_analysis import ContractAnalysisService

router = APIRouter(prefix="/contract-analysis", tags=["contract-analysis"])


@router.post("/analyze", response_model=ContractAnalysisResponseSchema)
async def analyze_contract(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
) -> ContractAnalysisResponseSchema:
    """Analyze uploaded PDF/DOCX contract and return structured report."""
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_file", "message": "No filename provided."},
        )

    filename = file.filename.lower()
    if not (filename.endswith(".pdf") or filename.endswith(".docx")):
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_file_type", "message": "Only PDF and DOCX files are supported."},
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail={"error": "empty_file", "message": "Uploaded file is empty."},
        )

    max_size = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(file_bytes) > max_size:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "file_too_large",
                "message": f"File exceeds {settings.MAX_UPLOAD_MB} MB limit.",
            },
        )

    return await ContractAnalysisService.analyze_contract(
        filename=file.filename,
        file_bytes=file_bytes,
        user_email=current_user["email"],
    )


@router.post("/reports", response_model=SavedContractAnalysisSchema)
async def save_contract_report(
    payload: ContractAnalysisSaveRequestSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> SavedContractAnalysisSchema:
    """Persist a generated contract analysis report for the authenticated user."""
    user_id = UUID(current_user["id"])
    record = await ContractAnalysisService.save_report(db, user_id=user_id, report=payload.report)
    return SavedContractAnalysisSchema(
        id=record.id,
        filename=record.filename,
        created_at=record.created_at,
        uploaded_filename=record.uploaded_filename,
        report=payload.report,
    )


@router.post("/reports/with-file", response_model=SavedContractAnalysisSchema)
async def save_contract_report_with_file(
    report_json: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> SavedContractAnalysisSchema:
    """Persist a generated report and uploaded contract file together."""
    user_id = UUID(current_user["id"])

    try:
        report = ContractAnalysisResponseSchema.model_validate_json(report_json)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_report_json", "message": "Invalid report payload."},
        ) from exc

    if not file.filename:
        raise HTTPException(status_code=400, detail={"error": "invalid_file", "message": "No filename provided."})

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail={"error": "empty_file", "message": "Uploaded file is empty."})

    max_size = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(file_bytes) > max_size:
        raise HTTPException(
            status_code=413,
            detail={"error": "file_too_large", "message": f"File exceeds {settings.MAX_UPLOAD_MB} MB limit."},
        )

    record = await ContractAnalysisService.save_report(
        db,
        user_id=user_id,
        report=report,
        uploaded_file=(file.filename, file.content_type, file_bytes),
    )
    return SavedContractAnalysisSchema(
        id=record.id,
        filename=record.filename,
        created_at=record.created_at,
        uploaded_filename=record.uploaded_filename,
        report=report,
    )


@router.get("/reports", response_model=list[SavedContractAnalysisListItemSchema])
async def list_saved_reports(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[SavedContractAnalysisListItemSchema]:
    """List saved contract analysis reports for the current user."""
    user_id = UUID(current_user["id"])
    reports = await ContractAnalysisService.list_reports(db, user_id=user_id)
    items: list[SavedContractAnalysisListItemSchema] = []
    for report in reports:
        try:
            analyzed_at_raw = json.loads(report.report_json).get("analyzed_at")
            analyzed_at = datetime.fromisoformat(str(analyzed_at_raw).replace("Z", "+00:00"))
        except Exception:
            analyzed_at = report.created_at

        items.append(
            SavedContractAnalysisListItemSchema(
                id=report.id,
                filename=report.filename,
                created_at=report.created_at,
                analyzed_at=analyzed_at,
                uploaded_filename=report.uploaded_filename,
            )
        )
    return items


@router.get("/reports/{report_id}", response_model=SavedContractAnalysisSchema)
async def get_saved_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> SavedContractAnalysisSchema:
    """Get one saved contract analysis report."""
    user_id = UUID(current_user["id"])
    report = await ContractAnalysisService.get_report(db, report_id=report_id, user_id=user_id)
    if not report:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Saved report not found"})

    parsed_report = ContractAnalysisService.deserialize_report(report)
    return SavedContractAnalysisSchema(
        id=report.id,
        filename=report.filename,
        created_at=report.created_at,
        uploaded_filename=report.uploaded_filename,
        report=parsed_report,
    )


@router.delete("/reports/{report_id}")
async def delete_saved_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Delete one saved contract analysis report."""
    user_id = UUID(current_user["id"])
    deleted = await ContractAnalysisService.delete_report(db, report_id=report_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Saved report not found"})
    return {"message": "Saved report deleted"}


@router.get("/reports/{report_id}/file")
async def download_saved_report_file(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> FileResponse:
    """Download the uploaded contract file associated with a saved report."""
    user_id = UUID(current_user["id"])
    report = await ContractAnalysisService.get_report(db, report_id=report_id, user_id=user_id)
    if not report:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Saved report not found"})

    file_path = ContractAnalysisService.get_uploaded_file_path(report)
    if not file_path:
        raise HTTPException(status_code=404, detail={"error": "file_not_found", "message": "No uploaded file found for this report."})

    media_type = report.uploaded_file_mime_type or "application/octet-stream"
    filename = report.uploaded_filename or Path(file_path).name
    return FileResponse(path=file_path, media_type=media_type, filename=filename)
