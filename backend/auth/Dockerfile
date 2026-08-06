FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY backend/auth/go.mod ./
COPY backend/shared ../shared
RUN go mod download
COPY backend/auth/ .
RUN go build -o auth .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/auth .
EXPOSE 8081
CMD ["./auth"]
