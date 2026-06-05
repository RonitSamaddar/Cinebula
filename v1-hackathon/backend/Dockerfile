# Build stage
FROM golang:1.23-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o vanshika cmd/server/main.go
EXPOSE 8082
ENTRYPOINT ["./vanshika"]
