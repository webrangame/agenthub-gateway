$apiKey = $env:GOOGLE_MAPS_KEY
if ($apiKey) {
    Write-Host "Source: Environment Variable (`$env:GOOGLE_MAPS_KEY)" -ForegroundColor Cyan
}



if (-not $apiKey -and (Test-Path ".env")) {
    Write-Host "Environment variable not set. Attempting to read from .env..."
    Get-Content .env | Where-Object { $_ -notmatch "^#" -and $_ -match "=" } | ForEach-Object {
        $parts = $_ -split "=", 2
        if ($parts[0].Trim() -eq "GOOGLE_MAPS_KEY") {
            $apiKey = $parts[1].Trim()
            # Remove quotes if present
            if ($apiKey -match '^"(.*)"$') { $apiKey = $matches[1] }
            Write-Host "Found key in .env"
        }
    }
}

if (-not $apiKey) {
    Write-Host "Error: GOOGLE_MAPS_KEY environment variable is not set and could not be found in .env." -ForegroundColor Red
    Write-Host "Please set it using: `$env:GOOGLE_MAPS_KEY='your_key_here'"
    exit 1
}

Write-Host "Testing Google Maps API Key: ${apiKey}..."

$url = "https://places.googleapis.com/v1/places:searchText"
$headers = @{
    "Content-Type"     = "application/json"
    "X-Goog-Api-Key"   = $apiKey
    "X-Goog-FieldMask" = "places.displayName,places.rating,places.reviews"
}
$body = @{
    textQuery = "Attractions in Kandy"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    
    if ($response.places) {
        Write-Host "Success! Found $($response.places.Count) places." -ForegroundColor Green
        $response.places | Select-Object -First 3 | ForEach-Object {
            Write-Host "- $($_.displayName.text) (Rating: $($_.rating))"
        }
    }
    else {
        Write-Host "Success, but no places returned (Key is likely valid, but query found nothing)." -ForegroundColor Yellow
        Write-Host $response
    }

}
catch {
    Write-Host "Error: Request failed." -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Details: $($reader.ReadToEnd())"
    }
}
