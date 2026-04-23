# HNG Backend Stage 2 - Intelligence Query Engine

Express + MongoDB backend for profile intelligence queries with advanced filtering, sorting, pagination, and rule-based natural language parsing.

## Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env`:
   ```env
   MONGO_CONN_STRING=mongodb://localhost:27017/hng-stage-two
   PORT=3000
   ```
4. Start API:
   ```bash
   npm run dev
   ```

## Profiles Table Structure

Each profile stored in MongoDB follows the required fields:

- `id` - UUID v7 (unique)
- `name` - unique lowercase full name
- `gender` - `male` or `female`
- `gender_probability` - float
- `age` - integer
- `age_group` - `child | teenager | adult | senior`
- `country_id` - ISO 2 code (e.g. `NG`)
- `country_name` - full country name
- `country_probability` - float
- `created_at` - UTC timestamp (ISO 8601 in JSON response)

## Seeding 2026 Profiles

Place the provided JSON file at `src/data/seed_profiles.json` (or pass a custom file path).

Run:

```bash
npm run seed
```

Custom path:

```bash
node src/scripts/seedProfiles.js /absolute/or/relative/path/to/profiles.json
```

Seed behavior:

- Upserts by unique `name` to prevent duplicates on re-run.
- Uses UUID v7 for newly inserted records.
- Updates existing records without changing their existing `id`.

## API Endpoints

### `POST /api/profiles`
Creates a profile from external demographic providers.

### `GET /api/profiles`
Supports all filters in one request:

- `gender`
- `age_group`
- `country_id`
- `min_age`
- `max_age`
- `min_gender_probability`
- `min_country_probability`
- `sort_by` (`age | created_at | gender_probability`)
- `order` (`asc | desc`)
- `page` (default `1`)
- `limit` (default `10`, max `50`)

Response:

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "data": []
}
```

### `GET /api/profiles/search?q=...`
Rule-based natural language filter parsing with pagination (`page`, `limit`).

If query cannot be interpreted:

```json
{
  "status": "error",
  "message": "Unable to interpret query"
}
```

### `GET /api/profiles/:id`
Fetch one profile by UUID v7.

### `DELETE /api/profiles/:id`
Deletes a profile by UUID v7.

## Natural Language Parsing Approach

Parser is deterministic and keyword/rule driven (no AI/LLM).

### 1) Normalization

- Lowercases input.
- Removes punctuation.
- Collapses repeated spaces.

### 2) Supported keyword mappings

- Gender terms:
  - male terms (`male`, `males`, `man`, `men`, `boy`, `boys`) -> `gender=male`
  - female terms (`female`, `females`, `woman`, `women`, `girl`, `girls`) -> `gender=female`
  - if both male and female appear, gender filter is omitted
- Age-group terms:
  - `child`, `children`, `kid`, `kids` -> `age_group=child`
  - `teenager`, `teenagers`, `teen`, `teens` -> `age_group=teenager`
  - `adult`, `adults` -> `age_group=adult`
  - `senior`, `seniors`, `elderly`, `old people` -> `age_group=senior`
- `young` -> `min_age=16`, `max_age=24`
- Numeric age rules:
  - `above|over|older than|greater than|at least N` -> `min_age=N`
  - `below|under|younger than|less than|at most N` -> `max_age=N`
  - `between N and M` -> `min_age=min(N,M)`, `max_age=max(N,M)`
- Country rules:
  - `from <country>` resolves to `country_id` (supports ISO code or country name)

### 3) Query interpretation

- Parser builds a filter object from detected rules.
- If no rule matches, request fails with `Unable to interpret query`.
- If parsed age bounds conflict (`min_age > max_age`), request fails.

## Parser Limitations

- Does not support multilingual or misspelled country names.
- Country extraction currently expects country to appear at the end after `from ...`.
- No support for advanced boolean groupings like nested conditions.
- Does not interpret vague qualitative phrases beyond supported keywords (e.g. `middle aged`).
- Only exact supported patterns are parsed; unknown patterns return interpret error.

## Validation and Error Format

All errors return:

```json
{
  "status": "error",
  "message": "<error message>"
}
```

Main validation rules:

- Missing/empty required parameter -> `400`
- Invalid query parameter shape/type/value -> `422` with `Invalid query parameters`
- Not found -> `404`
- Internal/upstream errors -> `500/502`

## CORS

API responds with:

`Access-Control-Allow-Origin: *`