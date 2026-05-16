"""Service for executing natural-language queries against a Pandas DataFrame."""

from __future__ import annotations

import asyncio
import re

import pandas as pd
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from langchain_openai import ChatOpenAI

from app.config import query_settings


class AgentExecutionError(RuntimeError):
    """Raised when the Pandas dataframe agent returns an invalid payload."""


class AgentService:
    """Build and execute a LangChain Pandas DataFrame agent."""

    USER_COLUMN_CANDIDATES = (
        "user_id",
        "userid",
        "user",
        "customer_id",
        "customer",
        "member_id",
        "member",
        "client_id",
        "client",
        "account_id",
        "account",
        "email",
        "username",
    )

    SPEND_COLUMN_CANDIDATES = (
        "total_amount",
        "amount_paid",
        "amount_spent",
        "amount",
        "purchase_amount",
        "total_purchase",
        "total_spend",
        "spend",
        "revenue",
        "price",
        "sales",
        "order_total",
        "transaction_amount",
    )

    TOP_SPENDER_KEYWORDS = (
        "purchased the most",
        "spent most",
        "spent the most",
        "highest spending",
        "highest-spending",
        "top spender",
        "top spenders",
        "most revenue",
        "most total amount",
    )

    TOTAL_SPEND_KEYWORDS = (
        "total amount spent",
        "total spend",
        "amount spent",
        "spent on",
        "how much spent",
        "total revenue",
    )

    CATEGORY_BREAKDOWN_KEYWORDS = (
        "category wise",
        "category-wise",
        "each category",
        "by category",
        "per category",
        "all categories",
    )

    STRUCTURED_VIEW_KEYWORDS = (
        "table",
        "tabular",
        "list",
        "structured",
        "grid",
    )

    @classmethod
    def _detect_user_like_column(cls, dataframe: pd.DataFrame) -> str | None:
        """Return the most likely user identifier column if one exists."""
        normalized_to_original = {
            str(column).strip().lower(): str(column)
            for column in dataframe.columns
        }

        for candidate in cls.USER_COLUMN_CANDIDATES:
            if candidate in normalized_to_original:
                return normalized_to_original[candidate]

        for normalized, original in normalized_to_original.items():
            if "user" in normalized or "customer" in normalized or "member" in normalized:
                return original

        return None

    @classmethod
    def _detect_spend_like_column(cls, dataframe: pd.DataFrame) -> str | None:
        """Return the most likely spend/revenue column if one exists."""
        normalized_to_original = {
            str(column).strip().lower(): str(column)
            for column in dataframe.columns
        }

        for candidate in cls.SPEND_COLUMN_CANDIDATES:
            if candidate in normalized_to_original:
                return normalized_to_original[candidate]

        ranked_columns: list[tuple[int, str]] = []
        for normalized, original in normalized_to_original.items():
            score = 0
            if "total" in normalized and "amount" in normalized:
                score += 100
            if "amount" in normalized:
                score += 50
            if "spend" in normalized or "revenue" in normalized or "sales" in normalized:
                score += 40
            if "price" in normalized:
                score += 10
            if "unit_price" in normalized:
                score -= 20

            if score > 0:
                ranked_columns.append((score, original))

        if ranked_columns:
            ranked_columns.sort(key=lambda item: item[0], reverse=True)
            return ranked_columns[0][1]

        return None

    @classmethod
    def _build_pandas_agent_prefix(cls, dataframe: pd.DataFrame) -> str:
        """Build a prompt prefix tailored to the dataset schema."""
        user_column = cls._detect_user_like_column(dataframe)
        spend_column = cls._detect_spend_like_column(dataframe)
        if user_column:
            total_users_example = f"df[{user_column!r}].count()"
            unique_users_example = f"df[{user_column!r}].nunique()"
            column_guidance = (
                f"The most likely user identifier column in this dataset is {user_column!r}. "
                f"Prefer using that column for user-related metrics unless another column is clearly more appropriate."
            )
        else:
            total_users_example = "len(df)"
            unique_users_example = "df[<user_like_column>].nunique()"
            column_guidance = (
                "No obvious user identifier column was detected automatically. "
                "Inspect df.columns first and choose the most appropriate user-like column before computing unique-user metrics."
            )

        if spend_column:
            spend_guidance = (
                f"The most likely spend/revenue column is {spend_column!r}. "
                "Treat this as potentially currency-formatted text and clean it before any numeric ranking or aggregation."
            )
            spend_column_example = spend_column
            spend_cleaning_example = (
                f"clean_df[{spend_column!r}] = pd.to_numeric("
                f"clean_df[{spend_column!r}].astype(str).str.replace(r'[\\$,\\s]', '', regex=True), "
                "errors='coerce')"
            )
            grouped_spend_example = (
                f"top_spenders = clean_df.groupby({user_column!r})[{spend_column!r}]"
                ".sum().sort_values(ascending=False)"
                if user_column
                else (
                    f"top_spenders = clean_df.groupby('<user_like_column>')[{spend_column!r}]"
                    ".sum().sort_values(ascending=False)"
                )
            )
        else:
            spend_guidance = (
                "No obvious spend/revenue column was detected automatically. "
                "Identify the column that represents money or numeric purchase totals before performing any top-spender analysis."
            )
            spend_column_example = "<spend_column>"
            spend_cleaning_example = (
                "clean_df['<spend_column>'] = pd.to_numeric("
                "clean_df['<spend_column>'].astype(str).str.replace(r'[\\$,\\s]', '', regex=True), "
                "errors='coerce')"
            )
            grouped_spend_example = (
                "top_spenders = clean_df.groupby('<user_like_column>')['<spend_column>'].sum()"
                ".sort_values(ascending=False)"
            )

        return f"""You are a data analyst working with a pandas DataFrame named df.

{column_guidance}
{spend_guidance}

Mandatory numeric-cleaning rules (must follow before any max/sort/top-spender logic):
- Always verify whether numeric-looking columns contain string characters like '$', ',', spaces, tabs, or other formatting tokens.
- Before using .max(), .nlargest(), .idxmax(), or .sort_values() on spend/revenue/price columns, create a cleaned numeric version with regex/string replacement and pd.to_numeric.
- Use a cleaning step equivalent to: {spend_cleaning_example}
- Never rank or aggregate on raw currency strings.

Top spender interpretation rules:
- "purchased the most", "highest-spending users", "top spenders", or "most revenue" means sorting by cleaned numeric spend in descending order.
- If users can appear on multiple rows, you must group by the user identifier and sum cleaned spend first, then rank descending.
- Use logic equivalent to: {grouped_spend_example}
- If there is only one row per user, direct descending sorting on the cleaned numeric spend column is acceptable.

Markdown table formatting rules (strict):
- If the user explicitly asks for a table, list, or structured view, you must output the final result as a properly formatted Markdown table.
- If the result contains more than 3 rows, you must output the final result as a properly formatted Markdown table even if the user did not explicitly ask.
- Convert the final DataFrame slice to markdown using .to_markdown() before producing the final answer. Use code equivalent to: final_table = result_df.to_markdown(index=False)
- Include all user-requested columns in the markdown table. Do not replace rows or columns with ellipses (...).
- If many rows are returned, limit rows only when necessary for readability and explicitly state the applied row limit.
- Ensure there is one empty line before the markdown table and one empty line after it.
- Output strict standard markdown table syntax with no trailing spaces in table rows.
- Do not wrap markdown tables in triple-backtick code blocks unless the user explicitly asks for a code block.

Follow these business glossary rules exactly when users ask for aggregate counts:
- \"Overall users\" or \"Total users\" means the total number of occurrences or records, not the distinct number of users.
- \"Unique users\" or \"Distinct users\" means the count of non-repeating users.
- If a query asks for \"all\", \"overall\", or \"total\" users, prefer record volume metrics like {total_users_example} or len(df), depending on the dataset structure.
- Do not use nunique() unless the user explicitly asks for \"unique\" or \"distinct\" users, or the question clearly requires de-duplication.

Ambiguity handling:
- If the user asks something ambiguous like \"how many users?\", inspect the DataFrame structure.
- If you decide the best answer is a unique-user metric, your final response must explicitly say: \"There are X unique users across Y total records.\"
- When both metrics are easy to compute and ambiguity remains, prefer giving both metrics in the final answer so the business meaning is clear.

Few-shot examples:

Example 1:
Question: \"How many overall users are in this dataset?\"
Python:
total_users = {total_users_example}
final_answer = f\"There are {{{{total_users}}}} total user records in the dataset.\"

Example 2:
Question: \"How many unique users are there?\"
Python:
unique_users = {unique_users_example}
total_records = {total_users_example}
final_answer = f\"There are {{{{unique_users}}}} unique users across {{{{total_records}}}} total records.\"

Example 3:
Question: \"How many users?\"
Python:
unique_users = {unique_users_example}
total_records = {total_users_example}
final_answer = f\"There are {{{{unique_users}}}} unique users across {{{{total_records}}}} total records.\"

Example 4:
Question: \"Which users purchased the most?\"
Python:
clean_df = df.copy()
{spend_cleaning_example}
clean_df = clean_df.dropna(subset=[{spend_column_example!r}])
{grouped_spend_example}
top_5 = top_spenders.head(5)
final_answer = (
    "CALCULATION_CHECK\\n"
    f"Top spenders (descending):\\n{{{{top_5.to_string()}}}}\\n"
    f"Highest spender total: {{{{float(top_5.iloc[0]) if len(top_5) else 0.0}}}}"
)

Verification output requirements:
- In your final response, include a short "CALCULATION_CHECK" section.
- Show the exact cleaned numeric column used, the aggregation method used (groupby+sum or direct sort), and the top results table.
- Ensure the final numeric values shown are from the cleaned numeric data, not the raw string column.

Table rendering requirements:
- For tabular outputs, include the markdown table in the final response body (not only in analysis text).
- Prefer pandas DataFrame.to_markdown() output over plain bullet points when showing multiple records.

Defensive categorical filtering rules (CRITICAL for avoiding zero-row results):
- When filtering by text/string columns (category, product type, region, etc.), ALWAYS apply case-insensitive + strip-whitespace logic.
- Mandatory exact-match pattern: df[df['category_column'].str.lower().str.strip() == 'search_term'.lower().strip()]
- If exact matching returns 0 rows, IMMEDIATELY attempt partial matching using .str.contains('search_term', case=False, na=False).
- If both exact and partial matching return 0 rows, print the top 5 unique values in that column to help debug the mismatch.
- Example debugging code: print(df['category_column'].unique()[:5])
- Never assume a category value exists without validation. Always compare case-normalized strings.
- Common patterns that cause zero-row bugs: "Clothing" vs "clothing", " Clothing " (leading/trailing spaces), "Clothing & Apparel" vs "Clothing".

Categorical query handling examples:

Example 1 (Exact match succeeds):
Question: "How much was spent on clothing?"
Category values in df: ["Clothing", "Electronics", "Books"]
Python:
category_col = 'category_column'  # Identify the category column
search_term = 'clothing'  # Extract from user query
normalized_rows = df[df[category_col].str.lower().str.strip() == search_term.lower().strip()]
if len(normalized_rows) > 0:
    result = normalized_rows[spend_column].sum()
    final_answer = f"Total spent on {{search_term}}: ${{result:,.2f}}"

Example 2 (Exact match fails, partial match succeeds):
Question: "What was the total for Clothing & Apparel?"
Category values in df: ["Clothing & Accessories", "Electronics", "Books"]
Python:
category_col = 'category_column'
search_term = 'clothing & apparel'
normalized_rows = df[df[category_col].str.lower().str.strip() == search_term.lower().strip()]
if len(normalized_rows) == 0:
    # Fallback to partial matching
    normalized_rows = df[df[category_col].str.lower().str.contains(search_term.lower(), na=False, regex=False)]
if len(normalized_rows) > 0:
    result = normalized_rows[spend_column].sum()
    final_answer = f"Total spent on {{search_term}}: ${{result:,.2f}}"
else:
    # Debug: show available values
    unique_vals = df[category_col].dropna().unique()[:5]
    final_answer = f"No data found for '{{search_term}}'. Available categories: {{', '.join(str(v) for v in unique_vals)}}"

STRICT FILTER-FIRST EXECUTION RULES (CRITICAL for multi-conditional queries):
========================================================================
When a query contains MULTIPLE conditions (e.g., "top 5 users in electronics category" or "best customers in specific region"), you MUST enforce this exact three-step pipeline:

STEP 1 — FILTER BY PRIMARY CONDITION FIRST:
- Identify the filtering attribute (category, region, product type, date range, etc.) mentioned in the query.
- ALWAYS apply the filter BEFORE any aggregation or sorting.
- Use case-insensitive, whitespace-stripped comparison: df[df['column'].str.lower().str.strip() == 'value'.lower().strip()]
- Store the filtered subset in a new variable: filtered_df = df[df[...]]
- If the filter returns 0 rows, check available values and retry with partial matching or debug output.

STEP 2 — AGGREGATE ON THE FILTERED SUBSET:
- ONLY apply groupby(), sum(), mean(), count(), etc. on the filtered_df, NOT the original df.
- If the query asks for "top users", group by user column and sum the relevant metric: filtered_df.groupby('user_column')['metric_column'].sum()
- Clean numeric values BEFORE aggregation: convert currency strings to float using pd.to_numeric()
- Example: top_spenders_in_category = filtered_df.groupby('user_id')[cleaned_spend_column].sum()

STEP 3 — SORT AND SLICE:
- After aggregation is complete, apply sorting and slicing: aggregated.sort_values(ascending=False).head(N)
- Do NOT skip this step or apply it on raw data.
- Example: top_5 = top_spenders_in_category.nlargest(5)

EXPLICIT CROSS-CHECKING GUARDRAIL (mandatory before final output):
- Before generating your final answer, PAUSE and verify:
  ✓ Did I apply the specific filter condition mentioned (e.g., category='electronics')?
  ✓ Did I filter FIRST, before grouping or sorting?
  ✓ Did I apply groupby/sum on the filtered subset, not the entire dataset?
  ✓ Does my code explicitly show the filter condition?
- If the answer to any question is "no", revise your code immediately.

TRANSPARENCY IN RESPONSE (mandatory):
- Your final natural language output MUST explicitly state the filter condition applied.
- Format: "Here are the TOP N [metric] specifically within [filter_condition]:..."
- Example: "Here are the top 5 spenders specifically within the Electronics category:" ✓
- Counter-example: "Here are the top 5 spenders:" ✗ (Missing category qualifier)

MULTI-CONDITIONAL QUERY EXAMPLES (strict step-by-step):

Example A:
Question: "List top 5 users who spent the most on electronics."
STEP 1 (FILTER): electronics_df = df[df['category'].str.lower().str.strip() == 'electronics']
STEP 2 (AGGREGATE): grouped = electronics_df.groupby('user_id')[cleaned_spend_column].sum()
STEP 3 (SORT): top_5 = grouped.nlargest(5)
OUTPUT: "Here are the top 5 spenders specifically within the Electronics category:"

Example B:
Question: "Which customers have the highest spending in the Home & Kitchen category?"
STEP 1 (FILTER): home_kitchen_df = df[df['category'].str.lower().str.contains('home', na=False) & df['category'].str.lower().str.contains('kitchen', na=False)]
STEP 2 (AGGREGATE): grouped = home_kitchen_df.groupby('customer_id')[cleaned_spend_column].sum()
STEP 3 (SORT): top_customers = grouped.nlargest(10)
OUTPUT: "Here are the top customers specifically with spending in the Home & Kitchen category:"

Example C:
Question: "Show me top performers (users with most purchases) in the clothing region."
STEP 1 (FILTER): clothing_df = df[df['category'].str.lower().str.strip() == 'clothing']
STEP 2 (AGGREGATE): purchase_counts = clothing_df.groupby('user_id').size()  # Count of purchases per user
STEP 3 (SORT): top_performers = purchase_counts.nlargest(5)
OUTPUT: "Here are the top 5 performers (by purchase count) specifically within the Clothing category:"

CRITICAL ERROR DETECTION (common mistakes):
❌ MISTAKE 1: "I sorted the entire df first, then filtered afterwards" → WRONG ORDER, YIELDS INCORRECT RESULTS
❌ MISTAKE 2: "I aggregated on the original df, then tried to apply the filter" → WRONG ORDER, LOSES DATA
❌ MISTAKE 3: "I filtered by one condition but my output doesn't mention it" → TRANSPARENCY FAILURE, USER CONFUSED
❌ MISTAKE 4: "I found 0 rows from the filter and gave up without showing available values" → UNHELPFUL, FIX WITH DEBUG OUTPUT
✅ CORRECT: Filter → Aggregate → Sort → Output with explicit filter statement in response

Always write correct pandas code, use the real column names from df, and ensure your final answer matches the metric definition above."""

    @classmethod
    def _is_top_spender_query(cls, question: str) -> bool:
        """Return True if the query asks for top spenders/highest purchases."""
        normalized = question.strip().lower()
        if not normalized:
            return False

        if any(keyword in normalized for keyword in cls.TOP_SPENDER_KEYWORDS):
            return True

        has_top_pattern = "top" in normalized and (
            "spend" in normalized
            or "purchase" in normalized
            or "revenue" in normalized
            or "amount" in normalized
        )
        return has_top_pattern

    @staticmethod
    def _extract_top_n(question: str, default: int = 5) -> int:
        """Extract top-N value from natural language query."""
        match = re.search(r"\btop\s+(\d{1,3})\b", question.lower())
        if not match:
            return default

        value = int(match.group(1))
        return max(1, min(value, 100))

    @classmethod
    def _wants_structured_view(cls, question: str) -> bool:
        """Return True if user explicitly asks for table/list/structured output."""
        normalized = question.lower()
        return any(keyword in normalized for keyword in cls.STRUCTURED_VIEW_KEYWORDS)

    @classmethod
    def _is_total_spend_query(cls, question: str) -> bool:
        """Return True if question asks for total monetary spend (not ranking)."""
        normalized = question.strip().lower()
        if not normalized:
            return False

        if any(keyword in normalized for keyword in cls.TOTAL_SPEND_KEYWORDS):
            return True

        mentions_total = "total" in normalized and (
            "spend" in normalized or "spent" in normalized or "amount" in normalized or "revenue" in normalized
        )
        return mentions_total

    @classmethod
    def _is_category_breakdown_query(cls, question: str) -> bool:
        """Return True for queries asking spend totals split by category."""
        normalized = question.strip().lower()
        if not normalized:
            return False

        if any(keyword in normalized for keyword in cls.CATEGORY_BREAKDOWN_KEYWORDS):
            return True

        mentions_category = "category" in normalized or "categories" in normalized
        mentions_spend = "spend" in normalized or "spent" in normalized or "amount" in normalized or "revenue" in normalized
        return mentions_category and mentions_spend

    @classmethod
    def _is_top_spenders_in_category_query(cls, question: str) -> bool:
        """Return True for queries asking top spenders/users filtered by a specific category."""
        normalized = question.strip().lower()
        if not normalized:
            return False

        # Check for "top" + "spender/customer/user" + "in/on"
        has_top_pattern = ("top" in normalized or "highest" in normalized) and (
            "spend" in normalized or "purchase" in normalized or "customer" in normalized or "user" in normalized
        )
        
        # Check for "in" or "on" followed by a category reference
        # Either the word "category" is explicitly mentioned, OR "in/on" appears with reasonable context
        has_category_context = (
            ("in " in normalized or "on " in normalized) and
            ("category" in normalized or "categories" in normalized)
        ) or (
            # More flexible: if query has top+spender pattern and mentions "in" or "on",
            # it's likely a category filter even if category word isn't explicit
            ("in " in normalized or "on " in normalized) and
            # But exclude false positives like "in total" or "on average"
            not ("in total" in normalized or "on average" in normalized)
        )

        return has_top_pattern and has_category_context

    @staticmethod
    def _contains_markdown_table(text: str) -> bool:
        """Return True when output looks like a markdown table."""
        if not text:
            return False

        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if len(lines) < 2:
            return False

        for index in range(len(lines) - 1):
            header = lines[index]
            separator = lines[index + 1]
            if "|" not in header or "|" not in separator:
                continue
            normalized_separator = separator.replace("|", "").replace(":", "").replace("-", "")
            if normalized_separator == "":
                return True

        return False

    @staticmethod
    def _dedupe_markdown_tables(text: str) -> str:
        """Remove repeated identical markdown table blocks while preserving order."""
        if not text or "|" not in text:
            return text

        lines = text.splitlines()
        result: list[str] = []
        seen_tables: set[str] = set()
        i = 0

        def is_table_line(line: str) -> bool:
            stripped = line.strip()
            return stripped.count("|") >= 2

        def is_separator_line(line: str) -> bool:
            stripped = line.strip()
            if "|" not in stripped:
                return False
            core = stripped.replace("|", "").replace(":", "").replace("-", "").replace(" ", "")
            return core == ""

        while i < len(lines):
            current = lines[i]
            if i + 1 < len(lines) and is_table_line(current) and is_separator_line(lines[i + 1]):
                table_lines = [current, lines[i + 1]]
                i += 2
                while i < len(lines) and is_table_line(lines[i]):
                    table_lines.append(lines[i])
                    i += 1

                normalized_table = "\n".join(line.rstrip() for line in table_lines).strip()
                if normalized_table not in seen_tables:
                    seen_tables.add(normalized_table)
                    result.extend(table_lines)
                continue

            result.append(current)
            i += 1

        return "\n".join(result)

    @staticmethod
    def _clean_currency_series(series: pd.Series) -> pd.Series:
        """Convert currency-like values to numeric safely."""
        as_text = series.astype(str)
        normalized = as_text.str.replace(r"[^0-9.\-]", "", regex=True)
        return pd.to_numeric(normalized, errors="coerce")

    @classmethod
    def _fuzzy_filter_by_category(
        cls,
        dataframe: pd.DataFrame,
        category_column: str,
        search_term: str,
    ) -> tuple[pd.DataFrame, dict[str, str]]:
        """
        Defensively filter a dataframe by categorical value using case-insensitive + strip matching.

        Returns:
            (filtered_dataframe, debug_info_dict)
            debug_info_dict contains keys: 'match_type', 'matched_value', 'unique_sample', 'row_count'
        """
        debug_info: dict[str, str] = {
            "match_type": "none",
            "matched_value": "",
            "unique_sample": "",
            "row_count": "0",
        }

        if not search_term or category_column not in dataframe.columns:
            return dataframe.iloc[0:0].copy(), debug_info

        # Normalize the search term
        normalized_search = search_term.strip().lower()

        # Get unique values normalized for comparison
        unique_values = (
            dataframe[category_column]
            .dropna()
            .astype(str)
            .unique()
            .tolist()
        )

        # EXACT MATCH (case-insensitive + stripped)
        for unique_val in unique_values:
            if unique_val.strip().lower() == normalized_search:
                filtered = dataframe[
                    dataframe[category_column].astype(str).str.lower().str.strip()
                    == normalized_search
                ].copy()
                if not filtered.empty:
                    debug_info["match_type"] = "exact"
                    debug_info["matched_value"] = unique_val
                    debug_info["row_count"] = str(len(filtered))
                    return filtered, debug_info

        # PARTIAL MATCH (.str.contains())
        filtered = dataframe[
            dataframe[category_column].astype(str).str.lower().str.contains(
                normalized_search, na=False, regex=False
            )
        ].copy()
        if not filtered.empty:
            matched_sample = (
                dataframe[
                    dataframe[category_column].astype(str).str.lower().str.contains(
                        normalized_search, na=False, regex=False
                    )
                ][category_column]
                .iloc[0]
                if len(filtered) > 0
                else ""
            )
            debug_info["match_type"] = "partial"
            debug_info["matched_value"] = str(matched_sample)
            debug_info["row_count"] = str(len(filtered))
            return filtered, debug_info

        # NO MATCH: Return empty + debug sample of available values
        sample_vals = [str(v).strip() for v in unique_values[:5]]
        debug_info["match_type"] = "none"
        debug_info["unique_sample"] = ", ".join(sample_vals)
        debug_info["row_count"] = "0"
        return dataframe.iloc[0:0].copy(), debug_info


    @classmethod
    def _answer_top_spender_query(cls, dataframe: pd.DataFrame, question: str) -> str | None:
        """Deterministic path for top-spender requests to guarantee numeric correctness."""
        user_column = cls._detect_user_like_column(dataframe)
        spend_column = cls._detect_spend_like_column(dataframe)
        if not user_column or not spend_column:
            return None

        top_n = cls._extract_top_n(question, default=5)
        clean_df = dataframe.copy()
        clean_spend_col = f"{spend_column}__numeric"
        clean_df[clean_spend_col] = cls._clean_currency_series(clean_df[spend_column])

        # Ensure grouping is performed on clean numeric values only.
        grouped = (
            clean_df.dropna(subset=[clean_spend_col])
            .groupby(user_column)[clean_spend_col]
            .sum()
            .sort_values(ascending=False)
        )
        top_spenders = grouped.head(top_n)
        if top_spenders.empty:
            return "No valid numeric spend values were found after cleaning."

        top_df = top_spenders.rename("total_spend").reset_index()
        top_df["total_spend"] = top_df["total_spend"].map(lambda value: f"${float(value):,.2f}")
        wants_structured = cls._wants_structured_view(question)
        force_markdown_table = wants_structured or len(top_df) > 3

        lines = [f"The top {len(top_spenders)} users by total spend are:"]
        if force_markdown_table:
            lines.append(top_df.to_markdown(index=False))
        else:
            for idx, row in top_df.iterrows():
                lines.append(f"{idx + 1}. {row[user_column]} - {row['total_spend']}")

        lines.append("CALCULATION_CHECK")
        lines.append(f"Cleaned numeric column used: {clean_spend_col}")
        lines.append(f"Aggregation method: groupby('{user_column}').sum()")
        lines.append(f"Rows considered after numeric cleaning: {int(clean_df[clean_spend_col].notna().sum())}")
        lines.append(f"Returned top rows: {len(top_spenders)}")
        lines.append(f"Highest total spend in result: {float(top_spenders.iloc[0]):.2f}")
        return cls._dedupe_markdown_tables("\n".join(lines))

    @classmethod
    def _answer_top_spenders_in_category_query(
        cls, dataframe: pd.DataFrame, question: str
    ) -> str | None:
        """
        Deterministic path for "top spenders in category" queries using strict Filter-First pattern.
        
        Enforces: STEP 1 (FILTER) → STEP 2 (AGGREGATE) → STEP 3 (SORT)
        """
        user_column = cls._detect_user_like_column(dataframe)
        spend_column = cls._detect_spend_like_column(dataframe)
        category_column = None
        
        # Detect category column
        for column in dataframe.columns:
            if "category" in str(column).strip().lower():
                category_column = str(column)
                break

        if not user_column or not spend_column or not category_column:
            return None

        top_n = cls._extract_top_n(question, default=5)

        # ==========================================
        # STEP 1 (FILTER) — Apply category filter first
        # ==========================================
        unique_categories = (
            dataframe[category_column].dropna().astype(str).str.strip().unique().tolist()
        )
        normalized_question = question.lower()
        matched_category = None
        matched_category_label = None

        # Sort by length to prioritize longer/more specific matches
        sorted_categories = sorted(unique_categories, key=len, reverse=True)

        # Try exact match first
        for category in sorted_categories:
            category_normalized = category.lower().strip()
            if category_normalized in normalized_question:
                matched_category = category
                matched_category_label = category
                break

        # Fallback: Try fuzzy filter for any multi-word search
        if matched_category is None:
            question_words = [
                word.strip() for word in normalized_question.split() if len(word.strip()) > 2
            ]
            for search_word in question_words:
                category_filtered, match_info = cls._fuzzy_filter_by_category(
                    dataframe, category_column, search_word
                )
                if not category_filtered.empty and match_info["match_type"] != "none":
                    matched_category = category_filtered[category_column].iloc[0]
                    matched_category_label = match_info["matched_value"]
                    break

        # If no category match found, show debug info and return None
        if matched_category is None:
            sample_vals = [str(v).strip() for v in sorted_categories[:5]]
            debug_msg = (
                f"Could not match a specific category from your query. Available categories: "
                f"{', '.join(sample_vals)}"
            )
            return debug_msg

        # Apply the category filter
        category_filtered_df = dataframe[
            dataframe[category_column].astype(str).str.lower().str.strip()
            == matched_category.lower().strip()
        ].copy()

        if category_filtered_df.empty:
            return (
                f"No records found for category '{matched_category_label}'. "
                f"Available categories: {', '.join(str(v).strip() for v in sorted_categories[:5])}"
            )

        # ==========================================
        # STEP 2 (AGGREGATE) — Group by user on filtered data
        # ==========================================
        clean_df = category_filtered_df.copy()
        clean_spend_col = f"{spend_column}__numeric"
        clean_df[clean_spend_col] = cls._clean_currency_series(clean_df[spend_column])

        grouped = (
            clean_df.dropna(subset=[clean_spend_col])
            .groupby(user_column)[clean_spend_col]
            .sum()
        )

        # ==========================================
        # STEP 3 (SORT/SLICE) — Sort descending and take top N
        # ==========================================
        top_spenders = grouped.sort_values(ascending=False).head(top_n)

        if top_spenders.empty:
            return (
                f"No valid numeric spend values found for users in the '{matched_category_label}' category "
                f"after cleaning currency values."
            )

        top_df = top_spenders.rename("total_spend").reset_index()
        top_df["total_spend"] = top_df["total_spend"].map(lambda value: f"${float(value):,.2f}")

        wants_structured = cls._wants_structured_view(question)
        force_markdown_table = wants_structured or len(top_df) > 3

        # ==========================================
        # TRANSPARENCY IN RESPONSE — Explicitly state the filter condition
        # ==========================================
        lines = [
            f"Here are the top {len(top_spenders)} spenders specifically within the {matched_category_label} category:"
        ]
        if force_markdown_table:
            lines.append(top_df.to_markdown(index=False))
        else:
            for idx, row in top_df.iterrows():
                lines.append(f"{idx + 1}. {row[user_column]} - {row['total_spend']}")

        lines.append("")
        lines.append("CALCULATION_CHECK")
        lines.append(f"STEP 1 (FILTER): {category_column} = '{matched_category_label}'")
        lines.append(f"STEP 2 (AGGREGATE): groupby('{user_column}')['{clean_spend_col}'].sum()")
        lines.append(f"STEP 3 (SORT): sort_values(ascending=False).head({top_n})")
        lines.append(f"Rows in category '{matched_category_label}': {int(len(category_filtered_df))}")
        lines.append(
            f"Rows with valid numeric spend after cleaning: {int(clean_df[clean_spend_col].notna().sum())}"
        )
        lines.append(f"Top spenders returned: {len(top_spenders)}")
        lines.append(f"Highest spend in result: ${float(top_spenders.iloc[0]) if len(top_spenders) > 0 else 0:.2f}")
        return cls._dedupe_markdown_tables("\n".join(lines))

    @classmethod
    def _answer_total_spend_query(cls, dataframe: pd.DataFrame, question: str) -> str | None:
        """Deterministic path for total spend questions, including optional category filtering with fuzzy matching."""
        spend_column = cls._detect_spend_like_column(dataframe)
        if not spend_column:
            return None

        clean_df = dataframe.copy()
        clean_spend_col = f"{spend_column}__numeric"
        clean_df[clean_spend_col] = cls._clean_currency_series(clean_df[spend_column])

        filtered_df = clean_df.dropna(subset=[clean_spend_col]).copy()
        applied_filter_label = "all records"
        category_column = None
        matched_category_value = None

        # Detect category column
        for column in dataframe.columns:
            if "category" in str(column).strip().lower():
                category_column = str(column)
                break

        # If category column exists, try to match it against the question using fuzzy filtering
        if category_column:
            normalized_question = question.lower()
            unique_categories = (
                filtered_df[category_column]
                .dropna()
                .astype(str)
                .str.strip()
                .unique()
                .tolist()
            )

            # Sort categories by length (descending) to prioritize more specific matches
            # e.g., "Clothing & Accessories" before "Clothing"
            sorted_categories = sorted(unique_categories, key=len, reverse=True)

            # Try to find category mention in question using fuzzy filter
            for category in sorted_categories:
                # Use fuzzy filter to attempt match
                category_filtered, match_info = cls._fuzzy_filter_by_category(
                    filtered_df, category_column, category
                )
                if not category_filtered.empty:
                    # Check if this category was mentioned in the question
                    category_normalized = category.lower().strip()
                    if category_normalized in normalized_question:
                        filtered_df = category_filtered
                        matched_category_value = category
                        applied_filter_label = f"{category_column} = {category}"
                        break

            # If no exact match found, try searching for any multi-word term in the question
            if matched_category_value is None:
                question_words = [
                    word.strip() for word in normalized_question.split() if len(word.strip()) > 2
                ]
                for search_word in question_words:
                    category_filtered, match_info = cls._fuzzy_filter_by_category(
                        filtered_df, category_column, search_word
                    )
                    if not category_filtered.empty and match_info["match_type"] != "none":
                        filtered_df = category_filtered
                        matched_category_value = match_info["matched_value"]
                        applied_filter_label = f"{category_column} = {matched_category_value}"
                        break

        total_spend = float(filtered_df[clean_spend_col].sum()) if not filtered_df.empty else 0.0
        wants_structured = cls._wants_structured_view(question)

        # If filtering returned 0 rows, include debug info
        debug_note = ""
        if filtered_df.empty and category_column:
            unique_vals = dataframe[category_column].dropna().astype(str).unique()[:5]
            debug_note = (
                f"\nDEBUG: No matching records found for the requested category. "
                f"Available categories: {', '.join(str(v).strip() for v in unique_vals)}"
            )

        if wants_structured:
            table_df = pd.DataFrame(
                [
                    {
                        "filter": applied_filter_label,
                        "total_spend": f"${total_spend:,.2f}",
                        "rows_count": int(len(filtered_df)),
                    }
                ]
            )
            lines = ["Total spend calculation:", table_df.to_markdown(index=False)]
        else:
            lines = [f"Total amount spent ({applied_filter_label}) is ${total_spend:,.2f}."]

        lines.append("CALCULATION_CHECK")
        lines.append(f"Cleaned numeric column used: {clean_spend_col}")
        lines.append(f"Applied filter: {applied_filter_label}")
        lines.append(f"Rows considered after filtering: {int(len(filtered_df))}")
        lines.append(f"Computed total spend: {total_spend:.2f}")
        if debug_note:
            lines.append(debug_note)
        return cls._dedupe_markdown_tables("\n".join(lines))


    @classmethod
    def _answer_category_breakdown_query(cls, dataframe: pd.DataFrame, question: str) -> str | None:
        """Deterministic path for category-wise spend totals with defensive string matching."""
        spend_column = cls._detect_spend_like_column(dataframe)
        if not spend_column:
            return None

        category_column = None
        for column in dataframe.columns:
            if "category" in str(column).strip().lower():
                category_column = str(column)
                break

        if not category_column:
            return None

        clean_df = dataframe.copy()
        clean_spend_col = f"{spend_column}__numeric"
        clean_df[clean_spend_col] = cls._clean_currency_series(clean_df[spend_column])
        filtered_df = clean_df.dropna(subset=[clean_spend_col]).copy()

        # Normalize category column: strip whitespace and convert to string
        filtered_df[f"{category_column}__normalized"] = (
            filtered_df[category_column].astype(str).str.strip()
        )

        grouped = (
            filtered_df.groupby(f"{category_column}__normalized", dropna=True)[clean_spend_col]
            .sum()
            .sort_values(ascending=False)
        )

        if grouped.empty:
            return "No valid numeric spend values were found for category-wise totals."

        breakdown_df = grouped.rename("total_spend").reset_index()
        breakdown_df = breakdown_df.rename(columns={f"{category_column}__normalized": category_column})
        display_df = breakdown_df.copy()
        display_df["total_spend"] = display_df["total_spend"].map(lambda value: f"${float(value):,.2f}")

        lines = ["Category-wise total spend:", display_df.to_markdown(index=False)]
        lines.append("CALCULATION_CHECK")
        lines.append(f"Category column used: {category_column}")
        lines.append(f"Cleaned numeric column used: {clean_spend_col}")
        lines.append("Aggregation method: groupby(category).sum()")
        lines.append(f"Rows considered after numeric cleaning: {int(len(filtered_df))}")
        lines.append(f"Returned category rows: {int(len(grouped))}")
        lines.append(f"Grand total across all categories: {float(grouped.sum()):.2f}")
        lines.append("NOTE: All category values have been normalized (whitespace stripped) for accuracy.")
        return cls._dedupe_markdown_tables("\n".join(lines))


    @staticmethod
    def _build_llm() -> ChatOpenAI:
        """Create a chat model client via the OpenAI-compatible LiteLLM endpoint."""
        return ChatOpenAI(
            model=query_settings.active_chat_model,
            base_url=query_settings.LITELLM_PROXY_URL,
            api_key=query_settings.LITELLM_API_KEY,
            timeout=query_settings.PANDAS_AGENT_TIMEOUT_SECONDS,
            max_retries=2,
        )

    @classmethod
    async def answer_question(cls, dataframe: pd.DataFrame, user_question: str) -> str:
        """Run a user question against the DataFrame and return a clean answer string."""
        if dataframe.empty:
            raise ValueError("DataFrame is empty")

        question = user_question.strip()
        if not question:
            raise ValueError("user_question cannot be empty")

        # Check for "top spenders in category" FIRST (more specific than plain top spender)
        deterministic_top_spenders_in_category = (
            cls._answer_top_spenders_in_category_query(dataframe, question)
            if cls._is_top_spenders_in_category_query(question)
            else None
        )
        if deterministic_top_spenders_in_category:
            return deterministic_top_spenders_in_category

        deterministic_top_spenders = cls._answer_top_spender_query(dataframe, question) if cls._is_top_spender_query(question) else None
        if deterministic_top_spenders:
            return deterministic_top_spenders

        deterministic_category_breakdown = (
            cls._answer_category_breakdown_query(dataframe, question)
            if cls._is_category_breakdown_query(question)
            else None
        )
        if deterministic_category_breakdown:
            return deterministic_category_breakdown

        deterministic_total_spend = cls._answer_total_spend_query(dataframe, question) if cls._is_total_spend_query(question) else None
        if deterministic_total_spend:
            return deterministic_total_spend

        llm = cls._build_llm()
        prompt_prefix = cls._build_pandas_agent_prefix(dataframe)
        agent = create_pandas_dataframe_agent(
            llm=llm,
            df=dataframe,
            agent_type="tool-calling",
            prefix=prompt_prefix,
            allow_dangerous_code=True,
            agent_executor_kwargs={"handle_parsing_errors": True},
            verbose=False,
            return_intermediate_steps=True,
            max_iterations=query_settings.PANDAS_AGENT_MAX_ITERATIONS,
        )

        wants_structured_view = cls._wants_structured_view(question)

        def _invoke_agent(input_question: str) -> dict | str:
            return agent.invoke({"input": input_question})

        result = await asyncio.wait_for(
            asyncio.to_thread(_invoke_agent, question),
            timeout=query_settings.PANDAS_AGENT_TIMEOUT_SECONDS,
        )

        output = result.get("output") if isinstance(result, dict) else None
        if not isinstance(output, str) or not output.strip():
            raise AgentExecutionError("Agent did not return a valid textual answer")

        if wants_structured_view and not cls._contains_markdown_table(output):
            retry_question = (
                f"{question}\n\n"
                "FORMAT REQUIREMENT (MANDATORY): Return the final answer as a markdown table using "
                "DataFrame.to_markdown(index=False). Include all requested columns and do not use ellipses (...). "
                "Do not return bullet points or paragraphs when tabular data is requested."
            )
            retry_result = await asyncio.wait_for(
                asyncio.to_thread(_invoke_agent, retry_question),
                timeout=query_settings.PANDAS_AGENT_TIMEOUT_SECONDS,
            )
            retry_output = retry_result.get("output") if isinstance(retry_result, dict) else None
            if isinstance(retry_output, str) and retry_output.strip():
                output = retry_output

        return cls._dedupe_markdown_tables(output.strip())
