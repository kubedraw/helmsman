package repository

import (
	"database/sql"
	"encoding/json"
	"time"
)

type Project struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	UserID      string          `json:"user_id"`
	Topology    json.RawMessage `json:"topology,omitempty"`
	Status      string          `json:"status"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type ProjectRepository interface {
	Create(project *Project) error
	GetByID(id string) (*Project, error)
	List(userID string) ([]Project, error)
	Update(project *Project) error
	Delete(id string) error
}

type projectRepository struct {
	db *sql.DB
}

func NewProjectRepository(db *sql.DB) ProjectRepository {
	return &projectRepository{db: db}
}

func (r *projectRepository) Create(project *Project) error {
	query := `
		INSERT INTO projects (id, name, description, user_id, topology, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	now := time.Now()
	project.CreatedAt = now
	project.UpdatedAt = now

	var topology interface{}
	if len(project.Topology) > 0 {
		topology = project.Topology
	} else {
		topology = nil
	}

	_, err := r.db.Exec(query,
		project.ID,
		project.Name,
		project.Description,
		project.UserID,
		topology,
		project.Status,
		project.CreatedAt,
		project.UpdatedAt,
	)
	return err
}

func (r *projectRepository) GetByID(id string) (*Project, error) {
	query := `SELECT id, name, description, user_id, topology, status, created_at, updated_at FROM projects WHERE id = $1`
	var p Project
	var topology sql.NullString

	err := r.db.QueryRow(query, id).Scan(
		&p.ID,
		&p.Name,
		&p.Description,
		&p.UserID,
		&topology,
		&p.Status,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if topology.Valid {
		p.Topology = json.RawMessage(topology.String)
	}

	return &p, nil
}

func (r *projectRepository) List(userID string) ([]Project, error) {
	var query string
	var args []interface{}

	if userID == "all" {
		query = `SELECT id, name, description, user_id, topology, status, created_at, updated_at FROM projects ORDER BY created_at DESC`
	} else {
		query = `SELECT id, name, description, user_id, topology, status, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY created_at DESC`
		args = append(args, userID)
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		var topology sql.NullString

		err := rows.Scan(
			&p.ID,
			&p.Name,
			&p.Description,
			&p.UserID,
			&topology,
			&p.Status,
			&p.CreatedAt,
			&p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if topology.Valid {
			p.Topology = json.RawMessage(topology.String)
		}

		projects = append(projects, p)
	}
	return projects, nil
}

func (r *projectRepository) Update(project *Project) error {
	query := `
		UPDATE projects
		SET name = $1, description = $2, topology = $3, status = $4, updated_at = $5
		WHERE id = $6
	`
	project.UpdatedAt = time.Now()

	var topology interface{}
	if len(project.Topology) > 0 {
		topology = project.Topology
	} else {
		topology = nil
	}

	_, err := r.db.Exec(query,
		project.Name,
		project.Description,
		topology,
		project.Status,
		project.UpdatedAt,
		project.ID,
	)
	return err
}

func (r *projectRepository) Delete(id string) error {
	query := `DELETE FROM projects WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
