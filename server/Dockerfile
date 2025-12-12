# Build Stage
FROM golang:latest AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o gateway main.go

# Run Stage
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/gateway .
COPY --from=builder /app/.env . 

# Expose Port
EXPOSE 8081

# Run
CMD ["./gateway"]
