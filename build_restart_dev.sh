#!/bin/bash

# Build and restart PM2 processes script
# Usage: ./build_restart_dev.sh [--name=api|queue|all]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to build the project
build_project() {
    print_status "Building the project..."
    if npm run build; then
        print_success "Build completed successfully!"
        return 0
    else
        print_error "Build failed!"
        return 1
    fi
}

# Function to restart specific PM2 process
restart_process() {
    local process_name=$1
    
    print_status "Checking if $process_name is running..."
    if pm2 describe $process_name > /dev/null 2>&1; then
        print_status "Restarting $process_name..."
        if pm2 restart $process_name; then
            print_success "$process_name restarted successfully!"
        else
            print_error "Failed to restart $process_name!"
            return 1
        fi
    else
        print_warning "$process_name is not running. Starting it..."
        if pm2 start ecosystem.config.js --only $process_name; then
            print_success "$process_name started successfully!"
        else
            print_error "Failed to start $process_name!"
            return 1
        fi
    fi
}

# Function to restart all processes
restart_all() {
    print_status "Restarting all PM2 processes..."
    if pm2 restart all; then
        print_success "All processes restarted successfully!"
    else
        print_error "Failed to restart all processes!"
        return 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [--name=api|queue|all]"
    echo ""
    echo "Options:"
    echo "  --name=api     Build and restart API process only (default)"
    echo "  --name=queue   Build and restart Queue Worker process only"
    echo "  --name=all     Build and restart all processes"
    echo ""
    echo "Examples:"
    echo "  $0              # Build and restart API (default)"
    echo "  $0 --name=api   # Build and restart API"
    echo "  $0 --name=queue # Build and restart Queue Worker"
    echo "  $0 --name=all   # Build and restart all processes"
}

# Main script logic
main() {
    # Default to api if no parameter provided
    local target=${1:-"--name=api"}

    # Parse the --name parameter
    case "$target" in
        --name=api)
            print_status "Building and restarting API process..."
            if build_project; then
                restart_process "poca-api"
            else
                exit 1
            fi
            ;;
        --name=queue)
            print_status "Building and restarting Queue Worker process..."
            if build_project; then
                restart_process "poca-queue"
            else
                exit 1
            fi
            ;;
        --name=all)
            print_status "Building and restarting all processes..."
            if build_project; then
                restart_all
            else
                exit 1
            fi
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Invalid parameter: $target"
            show_usage
            exit 1
            ;;
    esac

    print_success "Operation completed successfully!"
    
    # Show PM2 status
    print_status "Current PM2 status:"
    pm2 list
}

# Run main function with all arguments
main "$@"
