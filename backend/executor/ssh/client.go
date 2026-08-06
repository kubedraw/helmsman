package ssh

import (
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"time"

	"golang.org/x/crypto/ssh"
)

type Client struct {
	host string
	port int
	user string
	key  string
}

func NewClient(host string, port int, user string, key string) *Client {
	return &Client{
		host: host,
		port: port,
		user: user,
		key:  key,
	}
}

func (c *Client) Execute(command string) (string, string, error) {
	signer, err := ssh.ParsePrivateKey([]byte(c.key))
	if err != nil {
		return "", "", fmt.Errorf("failed to parse private key: %w", err)
	}

	config := &ssh.ClientConfig{
		User: c.user,
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", c.host, c.port)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return "", "", fmt.Errorf("failed to connect: %w", err)
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		return "", "", fmt.Errorf("failed to create session: %w", err)
	}
	defer session.Close()

	var stdout, stderr bytes.Buffer
	session.Stdout = &stdout
	session.Stderr = &stderr

	err = session.Run(command)
	if err != nil {
		return stdout.String(), stderr.String(), fmt.Errorf("command failed: %w", err)
	}

	return stdout.String(), stderr.String(), nil
}

// ExecuteWithLogs — выполняет команду и выводит логи в реальном времени
func (c *Client) ExecuteWithLogs(command string, logger *slog.Logger) error {
	signer, err := ssh.ParsePrivateKey([]byte(c.key))
	if err != nil {
		return fmt.Errorf("failed to parse private key: %w", err)
	}

	config := &ssh.ClientConfig{
		User: c.user,
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", c.host, c.port)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}
	defer session.Close()

	stdout, err := session.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %w", err)
	}
	stderr, err := session.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get stderr pipe: %w", err)
	}

	// Логируем в реальном времени
	go io.Copy(&logWriter{logger: logger, level: "stdout"}, stdout)
	go io.Copy(&logWriter{logger: logger, level: "stderr"}, stderr)

	err = session.Run(command)
	if err != nil {
		return fmt.Errorf("command failed: %w", err)
	}

	return nil
}

type logWriter struct {
	logger *slog.Logger
	level  string
}

func (w *logWriter) Write(p []byte) (n int, err error) {
	msg := string(p)
	if w.level == "stderr" {
		w.logger.Error(msg)
	} else {
		w.logger.Info(msg)
	}
	return len(p), nil
}
