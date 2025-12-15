# Running Locally Without .env

If you prefer not to store secrets in a `.env` file, you can provide them directly as environment variables in your terminal before starting the server.

The server (and the FastGraph runtime) requires these variables: `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_MAPS_KEY`, and `PORT`.

## PowerShell (Windows)

You can set the variables for the current session:

```powershell
$env:OPENAI_API_KEY="sk-..."
$env:GOOGLE_API_KEY="AIza..."
$env:GOOGLE_MAPS_KEY="AIza..."
$env:PORT="8081"

# Run the server
go run main.go
```

Or run it all in one line (using `;` to separate commands):

```powershell
$env:OPENAI_API_KEY="sk-KEY"; $env:GOOGLE_API_KEY="AIza-KEY"; $env:GOOGLE_MAPS_KEY="AIza-KEY"; go run main.go
```

## Bash (Linux/Mac/Git Bash)

```bash
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="AIza..."
export GOOGLE_MAPS_KEY="AIza..."
export PORT="8081"

go run main.go
```

## Note on AWS

The application does **not** fetch secrets directly from AWS Secrets Manager using the AWS SDK. It relies on environment variables.
- In **Deployment (ECS)**, these variables are injected by the task definition.
- **Locally**, you must provide them manually as shown above.
