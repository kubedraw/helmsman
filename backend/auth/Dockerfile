FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY backend/auth/go.mod ./
COPY backend/shared ../shared
RUN go mod tidy
COPY backend/auth/ .
RUN go build -o auth .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/auth .
EXPOSE 8081
CMD ["./auth"]
