FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY backend/storage/go.mod ./
COPY backend/shared ../shared
RUN go mod tidy
COPY backend/storage/ .
RUN go build -o storage .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/storage .
EXPOSE 8080
CMD ["./storage"]
