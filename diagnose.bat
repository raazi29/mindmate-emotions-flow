@echo off
echo Running MindMate Emotions Flow Diagnostic Tool
echo ----------------------------------------------
echo.

:: Check for running servers
echo [CHECKING] Server processes...
echo.

:: Check if backend is running
echo [CHECKING] Backend on port 8000:
netstat -ano | findstr :8000
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Backend server found on port 8000
) else (
    echo [ERROR] Backend server not found on port 8000
)
echo.

:: Check if frontend is running
echo [CHECKING] Frontend server:
netstat -ano | findstr :8080
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Frontend server found on port 8080
) else (
    netstat -ano | findstr :8081
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] Frontend server found on port 8081
    ) else (
        netstat -ano | findstr :8082
        if %ERRORLEVEL% EQU 0 (
            echo [SUCCESS] Frontend server found on port 8082
        ) else (
            echo [ERROR] Frontend server not found on any expected port
        )
    )
)
echo.

:: Test backend API connectivity
echo [TESTING] Backend API connectivity:
echo.
echo Trying to connect to backend status API...
powershell -command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000/status' -Method GET -TimeoutSec 5; Write-Host '[SUCCESS] Backend API responded with status code:' $response.StatusCode; $response.Content } catch { Write-Host '[ERROR] Failed to connect to backend:' $_.Exception.Message }"
echo.

:: Check if backend can return emotion data
echo [TESTING] Emotion detection API:
echo.
powershell -command "try { $body = @{text='I am happy today';model_preference='fast'} | ConvertTo-Json; $response = Invoke-WebRequest -Uri 'http://localhost:8000/detect-emotion' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 5; Write-Host '[SUCCESS] Emotion API responded with status code:' $response.StatusCode; $response.Content } catch { Write-Host '[ERROR] Failed to detect emotion:' $_.Exception.Message }"
echo.

:: Check if proxy is working
echo [TESTING] Proxy connection (frontend to backend):
echo.
powershell -command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080/api/status' -Method GET -TimeoutSec 5; Write-Host '[SUCCESS] Proxy responded with status code:' $response.StatusCode; $response.Content } catch { Write-Host '[WARNING] Failed to connect through 8080 proxy'; try { $response = Invoke-WebRequest -Uri 'http://localhost:8081/api/status' -Method GET -TimeoutSec 5; Write-Host '[SUCCESS] Proxy on 8081 responded with status code:' $response.StatusCode; $response.Content } catch { Write-Host '[WARNING] Failed to connect through 8081 proxy'; try { $response = Invoke-WebRequest -Uri 'http://localhost:8082/api/status' -Method GET -TimeoutSec 5; Write-Host '[SUCCESS] Proxy on 8082 responded with status code:' $response.StatusCode; $response.Content } catch { Write-Host '[ERROR] All proxy tests failed:' $_.Exception.Message } } }"
echo.

echo [COMPLETE] Diagnostic report completed
echo If you see connection errors, try restarting both servers with start-dev.bat
echo. 