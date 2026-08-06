package validator

import (
	"fmt"
	"strings"

	"github.com/kubedraw/helmsman/backend/topology/model"
)

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ValidationResult struct {
	Valid  bool               `json:"valid"`
	Errors []ValidationError  `json:"errors"`
}

func Validate(topology *model.Topology) ValidationResult {
	var errors []ValidationError

	// 1. Проверка: есть хотя бы одна control-plane
	cpCount := 0
	for _, node := range topology.Nodes {
		if node.Type == "control-plane" {
			cpCount++
		}
	}
	if cpCount == 0 {
		errors = append(errors, ValidationError{
			Field:   "nodes",
			Message: "at least one control-plane is required",
		})
	}
	if cpCount > 3 {
		errors = append(errors, ValidationError{
			Field:   "nodes",
			Message: "maximum 3 control-plane nodes allowed (HA limit)",
		})
	}

	// 2. Проверка: etcd — нечётное количество (1, 3, 5)
	etcdCount := 0
	for _, node := range topology.Nodes {
		if node.Type == "etcd" {
			etcdCount++
		}
	}
	if etcdCount > 0 && etcdCount%2 == 0 {
		errors = append(errors, ValidationError{
			Field:   "nodes",
			Message: "etcd nodes must be odd (1, 3, 5) for quorum",
		})
	}

	// 3. Проверка: есть хотя бы один worker
	workerCount := 0
	for _, node := range topology.Nodes {
		if node.Type == "worker" {
			workerCount++
		}
	}
	if workerCount == 0 {
		errors = append(errors, ValidationError{
			Field:   "nodes",
			Message: "at least one worker node is required",
		})
	}

	// 4. Проверка: CNI выбран
	hasCNI := false
	for _, node := range topology.Nodes {
		if node.Type == "cni" {
			hasCNI = true
			break
		}
	}
	if !hasCNI {
		errors = append(errors, ValidationError{
			Field:   "nodes",
			Message: "CNI (Calico/Flannel/Cilium) must be selected",
		})
	}

	// 5. Проверка: IP адреса (простой формат)
	for _, node := range topology.Nodes {
		if node.IP != "" && !strings.Contains(node.IP, ".") {
			errors = append(errors, ValidationError{
				Field:   fmt.Sprintf("nodes[%s].ip", node.ID),
				Message: "invalid IP address format",
			})
		}
	}

	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}
