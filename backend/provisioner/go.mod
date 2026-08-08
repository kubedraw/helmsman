module github.com/kubedraw/helmsman/backend/provisioner

go 1.22

require (
	github.com/kubedraw/helmsman/backend/shared v0.0.0
	github.com/kubedraw/helmsman/backend/topology v0.0.0
)

require (
	github.com/golang-jwt/jwt/v5 v5.2.1 // indirect
	github.com/google/uuid v1.6.0 // indirect
)

replace github.com/kubedraw/helmsman/backend/shared => ../shared

replace github.com/kubedraw/helmsman/backend/topology => ../topology
