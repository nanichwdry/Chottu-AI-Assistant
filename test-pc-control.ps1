# Test PC Control Endpoints

Write-Host "Testing PC Control Integration..." -ForegroundColor Green

# Test 1: Open Notepad
Write-Host "`n1. Testing open notepad..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:3001/api/pc/nl" -Method POST -ContentType "application/json" -Body '{"text":"open notepad"}'

# Test 2: Open Chrome
Write-Host "`n2. Testing open chrome..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:3001/api/pc/nl" -Method POST -ContentType "application/json" -Body '{"text":"open chrome"}'

# Test 3: Open Gmail
Write-Host "`n3. Testing open gmail..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:3001/api/pc/nl" -Method POST -ContentType "application/json" -Body '{"text":"open gmail"}'

# Test 4: Direct execute
Write-Host "`n4. Testing direct execute..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:3001/api/pc/execute" -Method POST -ContentType "application/json" -Body '{"tool_name":"open_app","args":{"app_id":"notepad"}}'

Write-Host "`nAll tests complete!" -ForegroundColor Green
