#!/bin/bash

# Script to manage starting, stopping, and restarting Node apps
# Usage: ./manage-apps.sh [start|stop|restart] [app-name|all]

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPS_DIR="$WORKSPACE_ROOT/apps"
JAVA_SERVICES_DIR="$WORKSPACE_ROOT/services-java"

# Define all apps
APPS_LIST=("admin-ui" "bff-node" "chat-ui" "orchestration-service" "mcp-tool-server")

# Function to get app directory
get_app_dir() {
    local app=$1
    if [[ -d "$APPS_DIR/$app" ]]; then
        echo "$APPS_DIR/$app"
    elif [[ -d "$JAVA_SERVICES_DIR/$app" ]]; then
        echo "$JAVA_SERVICES_DIR/$app"
    else
        echo ""
    fi
}

# Function to get start command for an app
get_start_command() {
    case "$1" in
        admin-ui) echo "npm run dev" ;;
        chat-ui) echo "npm run dev" ;;
        bff-node) echo "npm start" ;;
        orchestration-service) echo "npm start" ;;
        mcp-tool-server) echo "mvn spring-boot:run" ;;
        *) echo "" ;;
    esac
}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to get app port
get_app_port() {
    case "$1" in
        admin-ui) echo "5173" ;;
        chat-ui) echo "5174" ;;
        bff-node) echo "3000" ;;
        orchestration-service) echo "3001" ;;
        mcp-tool-server) echo "8080" ;;
        *) echo "" ;;
    esac
}

# Function to kill process on port
kill_port() {
    local port=$1
    if [[ -n "$port" ]]; then
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [[ -n "$pids" ]]; then
            print_warning "Killing existing process(es) on port $port..."
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    fi
}

# Function to start an app
start_app() {
    local app=$1
    local app_dir=$(get_app_dir "$app")

    if [[ -z "$app_dir" ]]; then
        print_error "App directory not found for: $app"
        return 1
    fi

    print_info "Starting $app..."

    cd "$app_dir"

    # Kill any existing process on the app's port
    local port=$(get_app_port "$app")
    kill_port "$port"

    # Check for Node.js app
    if [[ -f "package.json" ]]; then
        # Check if node_modules exists, install if not
        if [[ ! -d "node_modules" ]]; then
            print_warning "node_modules not found for $app, installing dependencies..."
            npm install
        fi

        # Rebuild TypeScript if build script exists (for compiled apps only)
        if grep -q '"build"' package.json 2>/dev/null; then
            case "$app" in
                bff-node|orchestration-service)
                    print_info "Rebuilding $app (TypeScript)..."
                    npm run build 2>&1 | tail -5
                    if [[ $? -ne 0 ]]; then
                        print_error "Build failed for $app"
                        return 1
                    fi
                    ;;
            esac
        fi
    elif [[ -f "pom.xml" ]]; then
        # Java app logic (skip node_modules check)
        print_info "Detected Java application"
    fi

    # Start app in background and save PID
    start_cmd=$(get_start_command "$app")

    if [[ -z "$start_cmd" ]]; then
        print_error "No start command defined for $app"
        return 1
    fi

    $start_cmd > /tmp/${app}.log 2>&1 &
    local pid=$!
    echo $pid > /tmp/${app}.pid

    print_info "$app started with PID: $pid"
}

# Function to stop an app
stop_app() {
    local app=$1
    local pid_file="/tmp/${app}.pid"
    
    if [[ ! -f "$pid_file" ]]; then
        print_warning "No PID file found for $app. Attempting to kill process by name..."
        pkill -f "node.*$app" || pkill -f "$app" || print_warning "No process found for $app"
        return 0
    fi
    
    local pid=$(cat "$pid_file")
    
    if kill -0 "$pid" 2>/dev/null; then
        print_info "Stopping $app (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        
        # Wait for process to terminate
        local count=0
        while kill -0 "$pid" 2>/dev/null && [[ $count -lt 10 ]]; do
            sleep 0.5
            ((count++))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            print_warning "$app did not stop gracefully, force killing..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        print_info "$app stopped"
    else
        print_warning "$app (PID: $pid) is not running"
    fi
    
    rm -f "$pid_file"
}

# Function to restart an app
restart_app() {
    local app=$1
    print_info "Restarting $app..."
    stop_app "$app"
    sleep 1
    start_app "$app"
}

# Function to show status
status_app() {
    local app=$1
    local pid_file="/tmp/${app}.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            print_info "$app is running (PID: $pid)"
            return 0
        fi
    fi
    
    print_warning "$app is not running"
    return 1
}

# Function to show all status
status_all() {
    print_info "=== App Status ==="
    for app in "${APPS_LIST[@]}"; do
        status_app "$app" || true
    done
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [app-name|all]"
    echo ""
    echo "Commands:"
    echo "  start    - Start app(s)"
    echo "  stop     - Stop app(s)"
    echo "  restart  - Restart app(s)"
    echo "  status   - Show status of app(s)"
    echo ""
    echo "App names:"
    for app in "${APPS_LIST[@]}"; do
        echo "  - $app"
    done
    echo "  - all (default)"
    echo ""
    echo "Examples:"
    echo "  $0 start all"
    echo "  $0 stop admin-ui"
    echo "  $0 restart bff-node"
    echo "  $0 status"
}

# Main script logic
main() {
    local command=${1:-status}
    local target=${2:-all}
    
    case "$command" in
        start)
            if [[ "$target" == "all" ]]; then
                for app in "${APPS_LIST[@]}"; do
                    start_app "$app" || print_error "Failed to start $app"
                done
            else
                start_app "$target" || print_error "Failed to start $target"
            fi
            ;;
        stop)
            if [[ "$target" == "all" ]]; then
                for app in "${APPS_LIST[@]}"; do
                    stop_app "$app" || true
                done
            else
                stop_app "$target" || true
            fi
            ;;
        restart)
            if [[ "$target" == "all" ]]; then
                for app in "${APPS_LIST[@]}"; do
                    restart_app "$app" || print_error "Failed to restart $app"
                done
            else
                restart_app "$target" || print_error "Failed to restart $target"
            fi
            ;;
        status)
            status_all
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
