$token = gcloud auth print-access-token
$headers = @{Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$url = "https://us-central1-aiplatform.googleapis.com/v1beta1/projects/mcpstore-474903/locations/us-central1/ragCorpora"
$body = @{
    display_name = "AiGuardianMemory"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $body
    $response | ConvertTo-Json -Depth 5
}
catch {
    $e = $_.Exception
    if ($e.Response) {
        $reader = New-Object System.IO.StreamReader($e.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Output "API ERROR BODY: $body"
    }
    Write-Error $_
}
