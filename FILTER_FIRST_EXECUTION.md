# Filter-First Execution Rules: Multi-Conditional Query Handling

## Problem Statement

The LangChain Pandas agent was **ignoring multi-conditional filters**. When asked:

```
"List top 5 users who spent the most on electronics category"
```

The agent would:
1. ❌ Skip the category filter entirely
2. ❌ Aggregate ALL users (not just electronics buyers)
3. ❌ Return overall top 5 spenders, not category-specific

This violated the fundamental data pipeline principle: **FILTER FIRST, THEN AGGREGATE**.

---

## Solution: Strict Filter-First Architecture

### The Three-Step Pipeline (Mandatory Order)

Every multi-conditional query is now broken into three sequential steps:

#### **STEP 1: FILTER** (Apply conditions first)
```python
# Isolate rows matching the requested attribute
electronics_df = df[df['category'].str.lower().str.strip() == 'electronics']
```
**Why first?** Filtering reduces the dataset before any aggregation, ensuring only relevant data is processed.

#### **STEP 2: AGGREGATE** (Group on filtered data only)
```python
# Apply groupby/sum ONLY on the filtered subset, NOT the original df
grouped = electronics_df.groupby('user_id')['spend_amount'].sum()
```
**Why this order?** Aggregating on filtered data guarantees correct totals for the specific category.

#### **STEP 3: SORT/SLICE** (Rank within the filtered subset)
```python
# Sort filtered aggregation and take top N
top_5 = grouped.sort_values(ascending=False).head(5)
```
**Why last?** This ensures ranking applies to category-specific data, not overall data.

---

## Implementation Details

### 1. Query Detection: `_is_top_spenders_in_category_query()`

**Detects patterns like:**
- "List top 5 users who spent the most on electronics"
- "Which customers have highest spending in clothing?"
- "Show me top performers on jewelry category"

**Returns True** if query contains:
- Top/Highest + (spend/purchase/customer/user) **AND**
- (in/on) pattern (optionally without explicit "category" word)

**Filters out false positives:**
- "How many users in total?" → NO ("in total" is excluded)
- "Top performers on average" → NO ("on average" is excluded)
- "Total spent on electronics" → NO (not asking for top spenders)

### 2. Handler Method: `_answer_top_spenders_in_category_query()`

**Location:** `backend/app/services/agent_service.py`

**Implements the three-step pipeline:**

```python
@classmethod
def _answer_top_spenders_in_category_query(
    cls, dataframe: pd.DataFrame, question: str
) -> str | None:
    """
    Enforces: STEP 1 (FILTER) → STEP 2 (AGGREGATE) → STEP 3 (SORT)
    """
    
    # STEP 1: FILTER by category
    matched_category = detect_category_from_question(question)
    category_filtered_df = dataframe[
        dataframe['category'].str.lower().str.strip() == matched_category.lower().strip()
    ].copy()
    
    # STEP 2: AGGREGATE on filtered data
    grouped = category_filtered_df.groupby('user_id')['spend'].sum()
    
    # STEP 3: SORT and slice
    top_spenders = grouped.sort_values(ascending=False).head(top_n)
    
    return formatted_output_with_transparency(top_spenders, matched_category)
```

### 3. System Prompt Enhancement

**Added section:** "STRICT FILTER-FIRST EXECUTION RULES"

**Mandatory instructions:**
- Always identify the filtering attribute first
- Apply filter BEFORE any aggregation or sorting
- Use case-insensitive, whitespace-stripped comparison
- Include explicit cross-checking guardrail
- Provide transparency: state the filter condition in output

**Example from prompt:**
```python
# CORRECT sequence
STEP 1 (FILTER): electronics_df = df[df['category'].str.lower().str.strip() == 'electronics']
STEP 2 (AGGREGATE): grouped = electronics_df.groupby('user_id')[cleaned_spend_column].sum()
STEP 3 (SORT): top_5 = grouped.nlargest(5)

# WRONG sequences (explicitly prohibited)
❌ Sort first, filter after → WRONG ORDER, LOSES DATA
❌ Aggregate on original df, then filter → WRONG ORDER, INCORRECT RESULTS
```

### 4. Explicit Cross-Checking Guardrail

Before generating output, the agent must verify:

```python
# Verification checklist (embedded in prompt)
✓ Did I apply the specific filter condition mentioned (e.g., category='electronics')?
✓ Did I filter FIRST, before grouping or sorting?
✓ Did I apply groupby/sum on the filtered subset, not the entire dataset?
✓ Does my code explicitly show the filter condition?
```

**If any answer is "no", the agent revises the code immediately.**

### 5. Transparency in Response

**Mandatory format:**
```
"Here are the TOP N [metric] specifically within [filter_condition]:..."
```

**Example outputs:**
```
✓ "Here are the top 5 spenders specifically within the Electronics category:"
✓ "Here are the top 3 customers with highest spending in the Clothing category:"
✗ "Here are the top 5 spenders:" (Missing category qualifier)
```

**Calculation check includes all three steps:**
```
CALCULATION_CHECK
STEP 1 (FILTER): Category = 'Electronics'
STEP 2 (AGGREGATE): groupby('User_ID')['Total_Amount__numeric'].sum()
STEP 3 (SORT): sort_values(ascending=False).head(5)
Rows in category 'Electronics': 5
Rows with valid numeric spend after cleaning: 5
Top spenders returned: 5
Highest spend in result: $2,000.00
```

---

## Test Results: ALL PASSING ✅

### Test 1: Basic Filter-First Pattern
```
Query: "List top 2 users who spent the most on electronics"
Dataset: 10 transactions across 3 categories

Expected Results (after FILTER):
  - Electronics rows: 5 transactions
  - After AGGREGATE: CUST-001: $2000, CUST-002: $900, CUST-005: $500
  - After SORT: Top 2 = CUST-001 ($2000), CUST-002 ($900)

Actual Results:
  ✓ CUST-001: $2,000.00
  ✓ CUST-002: $900.00
  ✓ Shows all three steps in CALCULATION_CHECK
  ✓ Transparency: "specifically within the Electronics category"
```

### Test 2: Query Detection
```
✓ "List top 5 users who spent the most on electronics" → Detected
✓ "Which customers have highest spending in clothing?" → Detected
✓ "Top 3 spenders in the home category" → Detected
✓ "Show me top users on jewelry" → Detected
✓ "Top spenders overall" → NOT detected (no "in/on")
✓ "Total spent on electronics" → NOT detected (not top spender)
✓ "How many users in total?" → NOT detected (false positive excluded)
```

### Test 3: Defensive String Matching
```
Query: "Top 2 users on Electronics" (exact match)
Query: "Top 2 users on electronics" (case variation)
Query: "Top 2 users on  Electronics " (whitespace)

All matched correctly due to .str.lower().str.strip()
```

### Test 4: Category Prioritization
```
Dataset: Both "Clothing" and "Clothing & Accessories" present
Query: "top users on clothing"

Longer match tested first → "Clothing & Accessories" checked before "Clothing"
Ensures specific categories take priority over partial matches
```

---

## Integration: Query Routing

The `answer_question()` method now checks deterministic paths in this order:

```python
async def answer_question(df, question):
    
    # 1. Check MOST SPECIFIC first (top spenders IN category)
    if _is_top_spenders_in_category_query(question):
        return _answer_top_spenders_in_category_query(df, question)
    
    # 2. Then general top spender (no category filter)
    if _is_top_spender_query(question):
        return _answer_top_spender_query(df, question)
    
    # 3. Then category breakdown
    if _is_category_breakdown_query(question):
        return _answer_category_breakdown_query(df, question)
    
    # 4. Then total spend (may include category)
    if _is_total_spend_query(question):
        return _answer_total_spend_query(df, question)
    
    # 5. Finally LLM agent (fallback for other queries)
    return llm_agent.invoke(question)
```

**Priority ensures:** Most specific patterns are matched first → fewer LLM calls → faster + more reliable.

---

## Common Use Cases Now Handled Correctly

### Use Case 1: Top Spenders in Specific Category
```
Input: "List top 5 users who spent the most on electronics"
Before: Returns overall top 5 (wrong)
After: Returns top 5 within Electronics only (correct)
```

### Use Case 2: Highest Spenders by Category
```
Input: "Which customers have highest spending in the clothing category?"
Before: Returns overall highest spenders (wrong)
After: Returns highest within Clothing category (correct)
```

### Use Case 3: Category with Spaces/Special Characters
```
Input: "Top users on Home & Kitchen"
Before: May fail due to exact string matching
After: Matches via fuzzy filter + normalization (correct)
```

### Use Case 4: Case-Insensitive Query
```
Input: "top spenders on ELECTRONICS" (user types in caps)
Before: May fail with case-sensitive comparison
After: Normalized matching handles all cases (correct)
```

---

## Critical Error Prevention

The system now **prevents these common mistakes:**

| Mistake | Prevention | How |
|---------|-----------|-----|
| Filter after aggregation | Filter-First rule + cross-checking guardrail | Mandatory STEP 1 in prompt |
| Aggregate on full dataset | Filter subset is stored, aggregation only on subset | `grouped = category_filtered_df.groupby(...)` |
| Output doesn't state filter | Transparency requirement | Output format: "...specifically within [category]..." |
| Zero rows from bad filter | Fuzzy matching + debug output | Shows available categories if no match |
| Wrong column chosen for filter | Category detection logic | Scans for "category" in column names |

---

## Performance Impact

- **Negligible**: Single-pass category filter + groupby
- **Caching**: Category values computed once per query
- **Memory**: Filtered DataFrame is typically smaller than full dataset

---

## Example: Detailed Walkthrough

### Input
```
User: "Which are the top 3 users on the Clothing category?"
Dataset: 100 rows, 3 categories (Electronics, Clothing, Home & Kitchen)
```

### Processing

**1. Detection**
```python
is_top_spenders_in_category = True  # Query has "top" + "users" + "on"
```

**2. Execution**

```python
# STEP 1: FILTER
clothing_df = df[df['category'].str.lower().str.strip() == 'clothing']
# Result: 35 rows (Clothing only)

# STEP 2: AGGREGATE
grouped = clothing_df.groupby('user_id')['spend'].sum()
# Result: 20 users with total spend

# STEP 3: SORT
top_3 = grouped.sort_values(ascending=False).head(3)
# Result: [USER-A: $2500, USER-B: $1800, USER-C: $1200]
```

**3. Output (with Transparency)**
```
Here are the top 3 spenders specifically within the Clothing category:

| User_ID | total_spend |
|---------|------------|
| USER-A  | $2,500.00  |
| USER-B  | $1,800.00  |
| USER-C  | $1,200.00  |

CALCULATION_CHECK
STEP 1 (FILTER): Category = 'Clothing'
STEP 2 (AGGREGATE): groupby('User_ID')['Total_Amount__numeric'].sum()
STEP 3 (SORT): sort_values(ascending=False).head(3)
Rows in category 'Clothing': 35
Rows with valid numeric spend after cleaning: 35
Top spenders returned: 3
Highest spend in result: $2500.00
```

---

## Backward Compatibility

- ✅ All existing queries continue to work
- ✅ No database migrations required
- ✅ No breaking changes to API
- ✅ System prompt enhancement is optional guidance

---

## Architecture Decisions

### AD-01: Filter-First as Mandatory Rule
Filtering before aggregation is enforced in code, not left to LLM discretion. This guarantees correctness regardless of model behavior.

### AD-02: Explicit Cross-Checking
The prompt includes a verification checklist that the agent must follow before output. This catches logical errors early.

### AD-03: Transparency Requirement
Final output must explicitly state the filter applied. This prevents silent misinterpretation.

### AD-04: Deterministic Paths for Common Queries
Rather than always using the LLM, specific query patterns (top spenders in category, category breakdown, etc.) are handled deterministically. This:
- Guarantees correctness
- Reduces latency
- Saves tokens
- Provides clear, structured output

---

## Files Modified

- `backend/app/services/agent_service.py`:
  - Added `_is_top_spenders_in_category_query()` detector
  - Added `_answer_top_spenders_in_category_query()` handler
  - Enhanced `_build_pandas_agent_prefix()` with Filter-First rules
  - Updated `answer_question()` to check deterministic path first

---

## References

**Related Documentation:**
- [DEFENSIVE_CATEGORICAL_FILTERING.md](DEFENSIVE_CATEGORICAL_FILTERING.md) — Case-insensitive string matching
- Copilot Instructions: Multi-conditional filter patterns

---

## Status

✅ **DEPLOYED AND TESTED**

All Filter-First logic is live. Agent now correctly:
- Detects multi-conditional queries
- Applies filters before aggregation
- Returns category-specific results
- Shows transparent step-by-step calculation
