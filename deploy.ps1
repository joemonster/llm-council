# LLM Council - Deploy to Supabase Cloud
# Usage: .\deploy.ps1 -ProjectRef <your-project-ref>

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectRef,

    [Parameter(Mandatory=$false)]
    [switch]$SkipFrontend,

    [Parameter(Mandatory=$false)]
    [switch]$FunctionsOnly
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LLM Council - Supabase Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Supabase CLI is not installed." -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Step 1: Link project (if ProjectRef provided)
if ($ProjectRef) {
    Write-Host "Step 1: Linking to Supabase project..." -ForegroundColor Green
    supabase link --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to link project. Check your ProjectRef." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Step 1: Skipping link (no ProjectRef provided)" -ForegroundColor Yellow
    Write-Host "  If this is your first deploy, run: .\deploy.ps1 -ProjectRef <your-ref>" -ForegroundColor Yellow
}

if (-not $FunctionsOnly) {
    # Step 2: Push database migrations
    Write-Host ""
    Write-Host "Step 2: Pushing database migrations..." -ForegroundColor Green
    supabase db push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to push migrations." -ForegroundColor Red
        exit 1
    }
    Write-Host "Database migrations applied successfully!" -ForegroundColor Green
}

# Step 3: Set secrets
Write-Host ""
Write-Host "Step 3: Setting Edge Function secrets..." -ForegroundColor Green

# Read OpenRouter API key from .env file
$envFile = ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    foreach ($line in $envContent) {
        if ($line -match "^OPENROUTER_API_KEY=(.+)$") {
            $apiKey = $matches[1]
            Write-Host "  Setting OPENROUTER_API_KEY..." -ForegroundColor Gray
            supabase secrets set OPENROUTER_API_KEY=$apiKey
            break
        }
    }
} else {
    Write-Host "Warning: .env file not found. Set OPENROUTER_API_KEY manually:" -ForegroundColor Yellow
    Write-Host "  supabase secrets set OPENROUTER_API_KEY=your-key" -ForegroundColor Yellow
}

# Step 4: Deploy Edge Functions
Write-Host ""
Write-Host "Step 4: Deploying Edge Functions..." -ForegroundColor Green

$functions = @("health", "conversations", "stage1", "stage2", "stage3")
foreach ($func in $functions) {
    Write-Host "  Deploying $func..." -ForegroundColor Gray
    supabase functions deploy $func --no-verify-jwt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to deploy $func" -ForegroundColor Red
        exit 1
    }
}
Write-Host "All Edge Functions deployed!" -ForegroundColor Green

if (-not $SkipFrontend -and -not $FunctionsOnly) {
    # Step 5: Build frontend
    Write-Host ""
    Write-Host "Step 5: Building frontend..." -ForegroundColor Green

    Push-Location frontend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Frontend build failed." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location

    Write-Host "Frontend built successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Deployment Complete!" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps for frontend hosting:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option A - Vercel (recommended):" -ForegroundColor White
    Write-Host "  cd frontend" -ForegroundColor Gray
    Write-Host "  npx vercel" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option B - Netlify:" -ForegroundColor White
    Write-Host "  cd frontend" -ForegroundColor Gray
    Write-Host "  npx netlify deploy --prod --dir=dist" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Don't forget to set environment variables:" -ForegroundColor Yellow
    Write-Host "  VITE_SUPABASE_URL=https://<project-ref>.supabase.co" -ForegroundColor Gray
    Write-Host "  VITE_SUPABASE_ANON_KEY=<your-anon-key>" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Deployment Complete!" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Your Supabase project URLs:" -ForegroundColor Yellow
Write-Host "  Dashboard: https://supabase.com/dashboard/project/$ProjectRef" -ForegroundColor Gray
Write-Host "  API: https://$ProjectRef.supabase.co" -ForegroundColor Gray
Write-Host "  Functions: https://$ProjectRef.supabase.co/functions/v1/" -ForegroundColor Gray
