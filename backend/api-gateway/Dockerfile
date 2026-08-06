FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY backend/api-gateway/go.mod ./
COPY backend/shared ../shared
RUN go mod download
COPY backend/api-gateway/ .
RUN go build -o api-gateway .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/api-gateway .
EXPOSE 8000
CMD ["./api-gateway"]
