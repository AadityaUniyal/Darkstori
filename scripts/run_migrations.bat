@echo off
REM Database Migration Runner for Windows

echo =========================================
echo   Database Migration Runner
echo =========================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo ERROR: .env file not found
    echo Please create .env file with DATABASE_URL
    exit /b 1
)

REM Load DATABASE_URL from .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="DATABASE_URL" set DATABASE_URL=%%b
)

REM Check if DATABASE_URL is set
if "%DATABASE_URL%"=="" (
    echo ERROR: DATABASE_URL not set in .env
    exit /b 1
)

echo SUCCESS: Environment loaded
echo.

REM Check current migration status
echo Current migration status:
alembic current
echo.

REM Show pending migrations
echo Pending migrations:
alembic heads
echo.

REM Ask for confirmation
set /p CONFIRM="Do you want to run migrations? (y/n): "

if /i "%CONFIRM%"=="y" (
    echo.
    echo Running migrations...
    alembic upgrade head
    
    if %errorlevel% equ 0 (
        echo.
        echo SUCCESS: Migrations completed successfully!
        echo.
        echo New migration status:
        alembic current
        echo.
        echo SUCCESS: Database is up to date!
    ) else (
        echo.
        echo ERROR: Migration failed!
        echo Please check the error messages above
        exit /b 1
    )
) else (
    echo.
    echo Migration cancelled
    exit /b 0
)

echo.
echo =========================================
echo   Migration Complete
echo =========================================

pause
