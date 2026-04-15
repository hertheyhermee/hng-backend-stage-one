# HNG Backend Stage 1

A Node.js/Express API for managing user profiles with external API integrations (Genderize, Agify, Nationalize) and MongoDB persistence.

## Features

- Create, retrieve, list, and delete user profiles
- Automatic age group classification and nationality detection
- Idempotent profile creation (prevents duplicates)
- Filtering support for profiles
- Comprehensive error handling

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your MongoDB connection string:
   ```
   MONGO_CONN_STRING=mongodb://localhost:27017/hng-stage-one
   ```
4. Run in development: `npm run dev`
5. Or build and run: `npm start`

## API Endpoints

- `POST /api/profiles` - Create a new profile
- `GET /api/profiles` - Get all profiles (with optional filters: `gender`, `country_id`, `age_group`)
- `GET /api/profiles/:id` - Get a single profile by ID
- `DELETE /api/profiles/:id` - Delete a profile by ID

## Request/Response Examples

### Create Profile
```json
POST /api/profiles
{
  "name": "ella"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "id": "uuid-v7",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "DRC",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

## Environment Variables

- `MONGO_CONN_STRING` - MongoDB connection URL
- `PORT` - Server port (default: 3000)

## License

ISC