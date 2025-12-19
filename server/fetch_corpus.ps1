$token = gcloud auth print-access-token
$headers = @{Authorization = "Bearer $token" }
$url = "https://us-central1-aiplatform.googleapis.com/v1beta1/projects/mcpstore-474903/locations/us-central1/ragCorpora"
try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
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
