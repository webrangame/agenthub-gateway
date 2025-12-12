# Build stage
FROM golang:1.25.3-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the Go application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o guardian-gateway .

# Runtime stage
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the fastgraph binary (assuming it's in the server directory)
COPY --from=builder /app/fastgraph /app/fastgraph
RUN chmod +x /app/fastgraph

# Copy the built Go binary
COPY --from=builder /app/guardian-gateway /app/guardian-gateway

# Copy agent files
COPY agents/ /app/agents/

# Create directory for uploaded agents
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8081

# Set environment variables (can be overridden in ECS task definition)
ENV PORT=8081
ENV GIN_MODE=release

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1

# Run the application
CMD ["/app/guardian-gateway"]

