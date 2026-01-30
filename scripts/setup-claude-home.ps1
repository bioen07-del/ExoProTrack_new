# =============================================================================
# ExoProTrack - Claude Desktop & Claude Code Setup Script
# Exported from: WORK PC (volchkov.se)
# Date: 2026-01-30
#
# USAGE:
#   1. Copy this script to home PC
#   2. Open PowerShell as Administrator
#   3. Run: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
#   4. Run: .\setup-claude-home.ps1
#
# WHAT IT DOES:
#   - Configures Claude Desktop (MCP servers, extensions settings)
#   - Configures Claude Code global settings
#   - Sets up project-level settings for ExoProTrack
#   - Does NOT install Claude Desktop/Code (do that manually first)
# =============================================================================

$ErrorActionPreference = "Stop"

# --- PATHS ---
$HomeUser = $env:USERPROFILE
$ClaudeDesktopDir = "$env:APPDATA\Claude"
$ClaudeCodeDir = "$HomeUser\.claude"
# !!! UPDATE THIS to your home PC project path !!!
$ProjectDir = Read-Host "Enter ExoProTrack project path (e.g. C:\Projects\ExoProTrack_new)"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Claude Setup for ExoProTrack" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Claude Desktop dir: $ClaudeDesktopDir"
Write-Host "Claude Code dir:    $ClaudeCodeDir"
Write-Host "Project dir:        $ProjectDir"
Write-Host ""

# --- PREREQUISITES CHECK ---
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Path $ClaudeDesktopDir)) {
    Write-Host "  WARNING: Claude Desktop not found at $ClaudeDesktopDir" -ForegroundColor Red
    Write-Host "  Install Claude Desktop first: https://claude.ai/download" -ForegroundColor Red
    $continue = Read-Host "  Continue anyway? (y/n)"
    if ($continue -ne "y") { exit 1 }
}

# Check Node.js (required for MCP servers)
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Node.js not found. MCP servers require Node.js" -ForegroundColor Red
    Write-Host "  Install from: https://nodejs.org/" -ForegroundColor Red
}

# Check Git
try {
    $gitVersion = git --version 2>&1
    Write-Host "  Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Git not found." -ForegroundColor Red
}

# --- STEP 1: Claude Desktop Config ---
Write-Host ""
Write-Host "[2/6] Setting up Claude Desktop config..." -ForegroundColor Yellow

$githubToken = Read-Host "Enter your GitHub Personal Access Token (ghp_...)" -AsSecureString
$githubTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($githubToken)
)

$claudeDesktopConfig = @{
    mcpServers = @{
        github = @{
            command = "npx"
            args = @("-y", "@modelcontextprotocol/server-github")
            env = @{
                GITHUB_PERSONAL_ACCESS_TOKEN = $githubTokenPlain
            }
        }
    }
} | ConvertTo-Json -Depth 5

$configPath = "$ClaudeDesktopDir\claude_desktop_config.json"
if (-not (Test-Path $ClaudeDesktopDir)) {
    New-Item -ItemType Directory -Path $ClaudeDesktopDir -Force | Out-Null
}
Set-Content -Path $configPath -Value $claudeDesktopConfig -Encoding UTF8
Write-Host "  Created: $configPath" -ForegroundColor Green

# --- STEP 2: Claude Desktop Extensions ---
Write-Host ""
Write-Host "[3/6] Setting up Claude Desktop Extensions..." -ForegroundColor Yellow

$extDir = "$ClaudeDesktopDir\Claude Extensions"
$extSettingsDir = "$ClaudeDesktopDir\Claude Extensions Settings"

if (-not (Test-Path $extSettingsDir)) {
    New-Item -ItemType Directory -Path $extSettingsDir -Force | Out-Null
}

# Filesystem extension - update path for home PC
$filesystemConfig = @{
    isEnabled = $true
    userConfig = @{
        allowed_directories = @(
            (Split-Path $ProjectDir -Parent)
        )
    }
} | ConvertTo-Json -Depth 3

Set-Content -Path "$extSettingsDir\ant.dir.ant.anthropic.filesystem.json" -Value $filesystemConfig -Encoding UTF8
Write-Host "  Created: Filesystem extension config" -ForegroundColor Green
Write-Host "    Allowed dir: $(Split-Path $ProjectDir -Parent)" -ForegroundColor DarkGray

# Windows MCP (CursorTouch)
$windowsMcpConfig = @{
    isEnabled = $true
} | ConvertTo-Json

Set-Content -Path "$extSettingsDir\ant.dir.cursortouch.windows-mcp.json" -Value $windowsMcpConfig -Encoding UTF8
Write-Host "  Created: Windows MCP extension config" -ForegroundColor Green

Write-Host ""
Write-Host "  NOTE: You need to install these extensions manually in Claude Desktop:" -ForegroundColor Magenta
Write-Host "    1. Filesystem (ant.anthropic.filesystem)" -ForegroundColor DarkGray
Write-Host "    2. Windows MCP (cursortouch.windows-mcp)" -ForegroundColor DarkGray

# --- STEP 3: Claude Code Global Settings ---
Write-Host ""
Write-Host "[4/6] Setting up Claude Code global settings..." -ForegroundColor Yellow

if (-not (Test-Path $ClaudeCodeDir)) {
    New-Item -ItemType Directory -Path $ClaudeCodeDir -Force | Out-Null
}

$claudeCodeSettings = @{
    enableAllProjectMcpServers = $true
    enabledMcpjsonServers = @("supabase")
} | ConvertTo-Json

Set-Content -Path "$ClaudeCodeDir\settings.local.json" -Value $claudeCodeSettings -Encoding UTF8
Write-Host "  Created: $ClaudeCodeDir\settings.local.json" -ForegroundColor Green

# Global settings.json (empty - defaults)
if (-not (Test-Path "$ClaudeCodeDir\settings.json")) {
    Set-Content -Path "$ClaudeCodeDir\settings.json" -Value "{}" -Encoding UTF8
    Write-Host "  Created: $ClaudeCodeDir\settings.json" -ForegroundColor Green
}

# --- STEP 4: Clone Project ---
Write-Host ""
Write-Host "[5/6] Setting up project..." -ForegroundColor Yellow

if (-not (Test-Path $ProjectDir)) {
    Write-Host "  Cloning repository..." -ForegroundColor DarkGray
    git clone https://github.com/bioen07-del/ExoProTrack_new.git $ProjectDir
    Write-Host "  Cloned to: $ProjectDir" -ForegroundColor Green
} else {
    Write-Host "  Project already exists at $ProjectDir" -ForegroundColor DarkGray
    Write-Host "  Pulling latest..." -ForegroundColor DarkGray
    git -C $ProjectDir pull origin main
}

# --- STEP 5: Project-level Claude Settings ---
Write-Host ""
Write-Host "[6/6] Setting up project-level Claude settings..." -ForegroundColor Yellow

$projectClaudeDir = "$ProjectDir\.claude"
if (-not (Test-Path $projectClaudeDir)) {
    New-Item -ItemType Directory -Path $projectClaudeDir -Force | Out-Null
}

$projectSettings = @{
    enabledMcpjsonServers = @("supabase")
    enableAllProjectMcpServers = $true
} | ConvertTo-Json

Set-Content -Path "$projectClaudeDir\settings.local.json" -Value $projectSettings -Encoding UTF8
Write-Host "  Created: $projectClaudeDir\settings.local.json" -ForegroundColor Green

# --- SUMMARY ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Configured:" -ForegroundColor White
Write-Host "  [x] Claude Desktop - MCP Servers (GitHub)" -ForegroundColor Green
Write-Host "  [x] Claude Desktop - Extensions (Filesystem, Windows MCP)" -ForegroundColor Green
Write-Host "  [x] Claude Code - Global settings (Supabase MCP)" -ForegroundColor Green
Write-Host "  [x] Project cloned/updated" -ForegroundColor Green
Write-Host "  [x] Project .claude/ settings" -ForegroundColor Green
Write-Host ""
Write-Host "MANUAL STEPS NEEDED:" -ForegroundColor Yellow
Write-Host "  1. Install Claude Desktop extensions from the Extensions tab" -ForegroundColor White
Write-Host "  2. Install Claude Code: npm install -g @anthropic-ai/claude-code" -ForegroundColor White
Write-Host "  3. Login to Supabase MCP (will prompt on first use)" -ForegroundColor White
Write-Host "  4. Open project: cd $ProjectDir && claude" -ForegroundColor White
Write-Host ""
Write-Host "INSTALLED PLUGINS (install manually in Claude Code):" -ForegroundColor Yellow
Write-Host "  External: supabase, github" -ForegroundColor DarkGray
Write-Host "  Built-in: claude-code-setup, claude-md-management," -ForegroundColor DarkGray
Write-Host "            code-review, commit-commands, feature-dev," -ForegroundColor DarkGray
Write-Host "            typescript-lsp, security-guidance" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Project URL: https://exo-pro-track-new.vercel.app" -ForegroundColor Cyan
Write-Host "Supabase:    https://qtyglxlnhnjyweozslbg.supabase.co" -ForegroundColor Cyan
Write-Host "GitHub:      https://github.com/bioen07-del/ExoProTrack_new" -ForegroundColor Cyan
Write-Host ""
