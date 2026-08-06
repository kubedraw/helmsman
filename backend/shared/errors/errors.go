package errors

import (
	"fmt"
	"net/http"
)

// AppError — кастомная ошибка с HTTP-статусом
type AppError struct {
	Code    int
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// Конструкторы ошибок с правильными HTTP-кодами
func NewNotFound(resource, id string) *AppError {
	return &AppError{
		Code:    http.StatusNotFound,
		Message: fmt.Sprintf("%s with id %s not found", resource, id),
	}
}

func NewBadRequest(msg string) *AppError {
	return &AppError{
		Code:    http.StatusBadRequest,
		Message: msg,
	}
}

func NewUnauthorized(msg string) *AppError {
	return &AppError{
		Code:    http.StatusUnauthorized,
		Message: msg,
	}
}

func NewInternal(err error) *AppError {
	return &AppError{
		Code:    http.StatusInternalServerError,
		Message: "internal server error",
		Err:     err,
	}
}

func NewConflict(msg string) *AppError {
	return &AppError{
		Code:    http.StatusConflict,
		Message: msg,
	}
}
