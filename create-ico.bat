@echo off
powershell -Command "& {
    Add-Type -AssemblyName System.Drawing
    $bitmap = [System.Drawing.Bitmap]::new('Chottu AI logo.png')
    $bitmap32 = [System.Drawing.Bitmap]::new($bitmap, 32, 32)
    $bitmap32.Save('src-tauri\icons\icon.ico', [System.Drawing.Imaging.ImageFormat]::Icon)
    $bitmap32.Dispose()
    $bitmap.Dispose()
}"