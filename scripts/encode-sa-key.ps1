param(
  [Parameter(Mandatory=$true)] [string] $KeyPath,
  [switch] $SetEnv
)

if (-not (Test-Path $KeyPath)) {
  Write-Error "Key file not found: $KeyPath"
  exit 2
}

$raw = Get-Content -Raw -Path $KeyPath
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($raw))
Write-Output $b64

if ($SetEnv) {
  Write-Output "Setting GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 for current session..."
  $Env:GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 = $b64
  Write-Output "Environment variable set for this session. Run: npm run test:drive-sa-upload"
}
