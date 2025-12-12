# Build Stage
FROM golang:1.25.3-alpine AS builder
WORKDIR /app
# Context is Root (e.g. docker build -f server/Dockerfile .)
# Copy go.mod/sum from server directory
COPY server/go.mod server/go.sum ./
RUN go mod download
# Copy server source
COPY server/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o guardian-gateway main.go

# Runtime Stage
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy Linux binary from installer directory (Root Context)
COPY installer_v0.3.2/linux/fastgraph /app/fastgraph
RUN chmod +x /app/fastgraph

# Copy built Gateway binary
COPY --from=builder /app/guardian-gateway /app/guardian-gateway
COPY server/.env.example .env 

# Copy Agents directory
COPY server/agents/ /app/agents/
RUN mkdir -p /app/uploads

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8081/health || exit 1

CMD ["/app/guardian-gateway"]
