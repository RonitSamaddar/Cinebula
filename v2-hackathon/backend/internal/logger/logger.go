package logger

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

var logFile *os.File

func Init() {
	home, _ := os.UserHomeDir()
	path := filepath.Join(home, "Desktop", "alphathon", "backend.log")
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		log.Printf("WARN: cannot open %s: %v", path, err)
		return
	}
	logFile = f
	// Write to both terminal and file
	log.SetOutput(io.MultiWriter(os.Stdout, f))
}

func Log(format string, args ...interface{}) {
	now := time.Now().Format("3:04:05PM")
	msg := fmt.Sprintf(format, args...)
	line := fmt.Sprintf("[%s] %s", now, msg)
	fmt.Println(line)
	if logFile != nil {
		fmt.Fprintln(logFile, line)
	}
}

// Middleware logs each incoming request with method, path, and response time.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		dur := time.Since(start)
		Log("%s %s (%v)", r.Method, r.URL.Path, dur.Round(time.Millisecond))
	})
}
