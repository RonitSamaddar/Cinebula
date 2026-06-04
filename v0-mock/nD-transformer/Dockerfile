# Build stage
FROM golang:1.23-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY main.go .
RUN CGO_ENABLED=0 go build -o nd-transformer main.go

# Runtime stage
FROM python:3.12-slim
RUN pip install --no-cache-dir scikit-learn numpy
WORKDIR /app
COPY --from=builder /app/nd-transformer .
COPY sample.csv .
EXPOSE 8080
ENTRYPOINT ["./nd-transformer"]
CMD ["--serve", "--csv", "sample.csv", "--port", "8080"]
