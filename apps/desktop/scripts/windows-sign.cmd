@echo off
setlocal DisableDelayedExpansion
set "signTool=%HARNOVA_DESKTOP_WINDOWS_SIGNTOOL%"
set "certificateFile=%HARNOVA_DESKTOP_WINDOWS_CER_FILE%"
set "tokenPin=%HARNOVA_DESKTOP_WINDOWS_TOKEN_PIN%"
set "keyContainer=%HARNOVA_DESKTOP_WINDOWS_KEY_CONTAINER%"
set "targetFile=%HARNOVA_DESKTOP_WINDOWS_SIGN_TARGET%"
set "appendSignature="
if "%HARNOVA_DESKTOP_WINDOWS_SIGN_APPEND%"=="1" set "appendSignature=/as"
set "HARNOVA_DESKTOP_WINDOWS_SIGNTOOL="
set "HARNOVA_DESKTOP_WINDOWS_CER_FILE="
set "HARNOVA_DESKTOP_WINDOWS_TOKEN_PIN="
set "HARNOVA_DESKTOP_WINDOWS_KEY_CONTAINER="
set "HARNOVA_DESKTOP_WINDOWS_SIGN_TARGET="
set "HARNOVA_DESKTOP_WINDOWS_SIGN_APPEND="
set "signTool=" & set "certificateFile=" & set "tokenPin=" & set "keyContainer=" & set "targetFile=" & set "appendSignature=" & "%signTool%" sign /v /fd sha256 /f "%certificateFile%" /kc "[{{%tokenPin%}}]=%keyContainer%" /csp "eToken Base Cryptographic Provider" %appendSignature% "%targetFile%"
exit /b %errorlevel%
