# MindMate Emotions Flow Runner Script
# This script provides easy access to the various scripts for development, testing, and deployment

param (
    [string]$command = "help"
)

function Show-Help {
    Write-Host "MindMate Emotions Flow Runner Script" -ForegroundColor Cyan
    Write-Host "Usage: .\run.ps1 [command]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Available commands:" -ForegroundColor Yellow
    Write-Host "  dev        - Start the development environment"
    Write-Host "  test       - Run tests or insert test data"
    Write-Host "  deploy     - Deploy the application with Docker"
    Write-Host "  setup      - Setup required services (Supabase, etc.)"
    Write-Host "  help       - Show this help message"
}

switch ($command) {
    "dev" {
        Write-Host "Starting development environment..." -ForegroundColor Green
        & ".\scripts\dev\start-dev.ps1"
    }
    "test" {
        Write-Host "Running tests..." -ForegroundColor Green
        & "node .\scripts\testing\insert-test-entry.js"
    }
    "deploy" {
        Write-Host "Deploying with Docker..." -ForegroundColor Green
        Set-Location .\scripts\deployment
        docker-compose up -d
        Set-Location ..\..\
    }
    "setup" {
        Write-Host "Setting up services..." -ForegroundColor Green
        & "node .\scripts\setup\deploy-supabase-schema.js"
    }
    default {
        Show-Help
    }
} 