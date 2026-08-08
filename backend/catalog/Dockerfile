FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY backend/catalog/go.mod ./
COPY backend/shared ../shared
RUN go mod tidy
COPY backend/catalog/ .
RUN go build -o catalog .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/catalog .
EXPOSE 8085
CMD ["./catalog"]
