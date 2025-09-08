#!/bin/bash
# Использование: ./scripts/docker/docker-cleanup.sh

# Docker Cleanup Script for SaleSpot
# Cleans up Docker cache, images, and volumes

set -e

echo "🐳 Docker Cleanup Script for SaleSpot"
echo "======================================"

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to show current Docker disk usage
show_usage() {
    echo "📊 Current Docker disk usage:"
    docker system df
    echo ""
}

# Function to clean up unused images
clean_images() {
    echo "🧹 Cleaning up unused Docker images..."
    docker image prune -a -f
    echo "✅ Unused images cleaned"
}

# Function to clean up build cache
clean_build_cache() {
    echo "🧹 Cleaning up Docker build cache..."
    docker builder prune -af
    echo "✅ Build cache cleaned"
}

# Function to clean up volumes
clean_volumes() {
    echo "🧹 Cleaning up unused Docker volumes..."
    docker volume prune -f
    echo "✅ Unused volumes cleaned"
}

# Function to clean up networks
clean_networks() {
    echo "🧹 Cleaning up unused Docker networks..."
    docker network prune -f
    echo "✅ Unused networks cleaned"
}

# Function to clean up containers
clean_containers() {
    echo "🧹 Cleaning up stopped containers..."
    docker container prune -f
    echo "✅ Stopped containers cleaned"
}

# Function to clean up everything
clean_all() {
    echo "🧹 Cleaning up everything..."
    docker system prune -af --volumes
    echo "✅ Complete cleanup finished"
}

# Function to show cleanup options
show_menu() {
    echo ""
    echo "Choose cleanup option:"
    echo "1) Show current usage"
    echo "2) Clean unused images"
    echo "3) Clean build cache"
    echo "4) Clean volumes"
    echo "5) Clean networks"
    echo "6) Clean containers"
    echo "7) Clean everything (recommended)"
    echo "8) Exit"
    echo ""
}

# Main execution
main() {
    check_docker
    
    if [ "$1" = "--all" ]; then
        show_usage
        clean_all
        show_usage
        echo "🎉 Cleanup completed!"
        exit 0
    fi
    
    while true; do
        show_menu
        read -p "Enter your choice (1-8): " choice
        
        case $choice in
            1)
                show_usage
                ;;
            2)
                clean_images
                show_usage
                ;;
            3)
                clean_build_cache
                show_usage
                ;;
            4)
                clean_volumes
                show_usage
                ;;
            5)
                clean_networks
                show_usage
                ;;
            6)
                clean_containers
                show_usage
                ;;
            7)
                clean_all
                show_usage
                echo "🎉 Complete cleanup finished!"
                ;;
            8)
                echo "👋 Goodbye!"
                exit 0
                ;;
            *)
                echo "❌ Invalid choice. Please enter a number between 1-8."
                ;;
        esac
    done
}

# Run main function
main "$@"
