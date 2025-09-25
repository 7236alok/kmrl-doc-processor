# Tesseract Language Models

This directory should contain the trained language model files for OCR processing.

## Required Files

Place the following `.traineddata` files in this directory:

- `eng.traineddata` - English language model
- `hin.traineddata` - Hindi language model  
- `mal.traineddata` - Malayalam language model

## Download Instructions

You can download these files from the official Tesseract repository:

```bash
# English
curl -L https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata -o tessdata/eng.traineddata

# Hindi
curl -L https://github.com/tesseract-ocr/tessdata/raw/main/hin.traineddata -o tessdata/hin.traineddata

# Malayalam
curl -L https://github.com/tesseract-ocr/tessdata/raw/main/mal.traineddata -o tessdata/mal.traineddata
```

## PowerShell Commands (Windows)

```powershell
# English
Invoke-WebRequest -Uri "https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata" -OutFile "tessdata/eng.traineddata"

# Hindi
Invoke-WebRequest -Uri "https://github.com/tesseract-ocr/tessdata/raw/main/hin.traineddata" -OutFile "tessdata/hin.traineddata"

# Malayalam
Invoke-WebRequest -Uri "https://github.com/tesseract-ocr/tessdata/raw/main/mal.traineddata" -OutFile "tessdata/mal.traineddata"
```

## Note

If these files are not present, Tesseract.js will automatically download them at runtime, but having them locally improves performance and allows offline usage.

## File Sizes (Approximate)

- eng.traineddata: ~10-15 MB
- hin.traineddata: ~10-15 MB  
- mal.traineddata: ~10-15 MB

Total: ~30-45 MB