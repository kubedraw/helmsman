module github.com/kubedraw/helmsman/backend/executor

go 1.22

require (
	github.com/kubedraw/helmsman/backend/shared v0.0.0
	golang.org/x/crypto v0.31.0
)

require (
	github.com/golang-jwt/jwt/v5 v5.2.1 // indirect
	github.com/google/uuid v1.6.0 // indirect
	golang.org/x/sys v0.28.0 // indirect
)

replace github.com/kubedraw/helmsman/backend/shared => ../shared
