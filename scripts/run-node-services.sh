#!/bin/bash
# Run BFF and Orchestration as Node services (dev mode).
# Requires: Postgres, Redis, Mongo (and optionally tool-server) running (e.g. via Docker for just those).

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BFF_DIR="$ROOT/apps/bff-node"
ORCH_DIR="$ROOT/apps/orchestration-service"
LOG_DIR="${LOG_DIR:-/tmp}"
BFF_LOG="$LOG_DIR/bff-node.log"
ORCH_LOG="$LOG_DIR/orchestration-service.log"
BFF_PID_FILE="$LOG_DIR/bff-node.pid"
ORCH_PID_FILE="$LOG_DIR/orchestration-service.pid"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

kill_port() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    local pids=$(lsof -ti :"$port" 2>/dev/null)
    if [[ -n "$pids" ]]; then
      warn "Killing process(es) on port $port"
      echo "$pids" | xargs kill -9 2>/dev/null || true
      sleep 1
    fi
  fi
}

start_bff() {
  if [[ -f "$BFF_PID_FILE" ]] && kill -0 "$(cat "$BFF_PID_FILE")" 2>/dev/null; then
    info "BFF already running (PID $(cat "$BFF_PID_FILE"))"
    return 0
  fi
  if [[ ! -d "$BFF_DIR/node_modules" ]]; then
    info "Installing BFF dependencies..."
    (cd "$BFF_DIR" && npm install)
  fi
  kill_port 3000
  info "Starting BFF (dev) on port 3000..."
  (cd "$BFF_DIR" && npm run dev) > "$BFF_LOG" 2>&1 &
  echo $! > "$BFF_PID_FILE"
  info "BFF started. Logs: $BFF_LOG"
}

start_orch() {
  if [[ -f "$ORCH_PID_FILE" ]] && kill -0 "$(cat "$ORCH_PID_FILE")" 2>/dev/null; then
    info "Orchestration already running (PID $(cat "$ORCH_PID_FILE"))"
    return 0
  fi
  if [[ ! -d "$ORCH_DIR/node_modules" ]]; then
    info "Installing Orchestration dependencies..."
    (cd "$ORCH_DIR" && npm install)
  fi
  kill_port 3001
  kill_port 50051
  info "Starting Orchestration (dev) on port 3001 (HTTP) and 50051 (gRPC)..."
  (cd "$ORCH_DIR" && npm run dev) > "$ORCH_LOG" 2>&1 &
  echo $! > "$ORCH_PID_FILE"
  info "Orchestration started. Logs: $ORCH_LOG"
}

stop_bff() {
  if [[ ! -f "$BFF_PID_FILE" ]]; then
    warn "BFF PID file not found"
    kill_port 3000
    return 0
  fi
  local pid=$(cat "$BFF_PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    info "Stopping BFF (PID $pid)"
    kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$BFF_PID_FILE"
  kill_port 3000
}

stop_orch() {
  if [[ ! -f "$ORCH_PID_FILE" ]]; then
    warn "Orchestration PID file not found"
    kill_port 3001
    kill_port 50051
    return 0
  fi
  local pid=$(cat "$ORCH_PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    info "Stopping Orchestration (PID $pid)"
    kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$ORCH_PID_FILE"
  kill_port 3001
  kill_port 50051
}

cmd_start() {
  start_bff
  start_orch
  info "Node services running. BFF: http://localhost:3000  Orchestrator: http://localhost:3001"
  info "Ensure Postgres, Redis, and Mongo are running (e.g. docker compose up -d postgres redis mongo)."
}

cmd_stop() {
  stop_bff
  stop_orch
  info "Node services stopped."
}

cmd_status() {
  echo "BFF (port 3000):"
  if [[ -f "$BFF_PID_FILE" ]] && kill -0 "$(cat "$BFF_PID_FILE")" 2>/dev/null; then
    echo "  running (PID $(cat "$BFF_PID_FILE"))"
  else
    echo "  not running"
  fi
  echo "Orchestration (port 3001):"
  if [[ -f "$ORCH_PID_FILE" ]] && kill -0 "$(cat "$ORCH_PID_FILE")" 2>/dev/null; then
    echo "  running (PID $(cat "$ORCH_PID_FILE"))"
  else
    echo "  not running"
  fi
}

cmd_logs() {
  local which=${1:-both}
  case "$which" in
    bff)       tail -f "$BFF_LOG" ;;
    orch|orchestration) tail -f "$ORCH_LOG" ;;
    both)      info "Tailing both (BFF then Orchestration). Use Ctrl+C to stop."
               tail -f "$BFF_LOG" "$ORCH_LOG" ;;
    *)         err "Usage: $0 logs [bff|orch|both]"; exit 1 ;;
  esac
}

case "${1:-start}" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  status) cmd_status ;;
  logs)   cmd_logs "${2:-both}" ;;
  *)
    echo "Usage: $0 {start|stop|status|logs [bff|orch|both]}"
    echo ""
    echo "  start   - Start BFF (3000) and Orchestration (3001) in dev mode"
    echo "  stop    - Stop both"
    echo "  status  - Show if they are running"
    echo "  logs    - Tail logs (default: both)"
    exit 1
    ;;
esac
