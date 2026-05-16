"""Service utilities for loading tabular data from files or Google Sheets."""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import gspread
import pandas as pd
from gspread.exceptions import APIError, SpreadsheetNotFound, WorksheetNotFound

from app.config import query_settings


class SheetsService:
    """Load tabular data into a Pandas DataFrame from supported sources."""

    SHEET_ID_PATTERN = re.compile(r"/spreadsheets/d/([a-zA-Z0-9-_]+)")

    @classmethod
    def load_dataframe(cls, file_source: str) -> pd.DataFrame:
        """Load a DataFrame from CSV, XLSX, or Google Sheets URL."""
        source = file_source.strip()
        if not source:
            raise ValueError("file_source cannot be empty")

        if cls._is_google_sheets_url(source):
            return cls._load_google_sheet(source)

        return cls._load_local_file(source)

    @classmethod
    def _is_google_sheets_url(cls, source: str) -> bool:
        """Return True when the source looks like a Google Sheets URL."""
        return "docs.google.com/spreadsheets" in source

    @classmethod
    def _extract_sheet_id(cls, spreadsheet_url: str) -> str:
        """Extract a spreadsheet ID from a Google Sheets URL."""
        match = cls.SHEET_ID_PATTERN.search(spreadsheet_url)
        if not match:
            raise ValueError("Could not extract spreadsheet ID from Google Sheets URL")
        return match.group(1)

    @classmethod
    def _extract_gid(cls, spreadsheet_url: str) -> int | None:
        """Extract optional gid from URL fragment/query."""
        parsed = urlparse(spreadsheet_url)

        fragment_params = parse_qs(parsed.fragment)
        if "gid" in fragment_params:
            try:
                return int(fragment_params["gid"][0])
            except (ValueError, TypeError):
                return None

        query_params = parse_qs(parsed.query)
        if "gid" in query_params:
            try:
                return int(query_params["gid"][0])
            except (ValueError, TypeError):
                return None

        return None

    @classmethod
    def _load_google_sheet(cls, spreadsheet_url: str) -> pd.DataFrame:
        """Load DataFrame from a Google Sheet using service-account credentials."""
        spreadsheet_id = cls._extract_sheet_id(spreadsheet_url)
        gid = cls._extract_gid(spreadsheet_url)

        client = gspread.service_account_from_dict(
            query_settings.google_service_account_dict
        )

        spreadsheet = client.open_by_key(spreadsheet_id)

        worksheet = spreadsheet.sheet1
        if gid is not None:
            try:
                worksheet = next(ws for ws in spreadsheet.worksheets() if ws.id == gid)
            except StopIteration as exc:
                raise WorksheetNotFound(f"Worksheet with gid={gid} not found") from exc

        records = worksheet.get_all_records()
        if records:
            dataframe = pd.DataFrame(records)
        else:
            values = worksheet.get_all_values()
            if not values:
                raise ValueError("Google Sheet is empty")
            header, *rows = values
            dataframe = pd.DataFrame(rows, columns=header)

        if dataframe.empty:
            raise ValueError("Loaded Google Sheet has no rows")

        return dataframe

    @classmethod
    def _load_local_file(cls, file_source: str) -> pd.DataFrame:
        """Load DataFrame from a local CSV or XLSX file path."""
        file_path = Path(file_source)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_source}")

        suffix = file_path.suffix.lower()
        if suffix == ".csv":
            dataframe = pd.read_csv(file_path)
        elif suffix in {".xlsx", ".xlsm", ".xltx", ".xltm"}:
            dataframe = pd.read_excel(file_path, engine="openpyxl")
        else:
            raise ValueError("Unsupported file type. Use CSV, XLSX, or a Google Sheets URL")

        if dataframe.empty:
            raise ValueError("Loaded file has no rows")

        return dataframe


__all__ = [
    "SheetsService",
    "APIError",
    "SpreadsheetNotFound",
    "WorksheetNotFound",
]
