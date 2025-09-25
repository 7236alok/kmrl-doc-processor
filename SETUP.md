# 🚀 Quick Setup Guide - KMRL Document Processor

For users cloning from GitHub: `https://github.com/7236alok/kmrl-doc-processor`

## ⚡ 5-Minute Setup

### 1. Prerequisites
- **Node.js 22.14.x** (download from [nodejs.org](https://nodejs.org))
- **Git** (for cloning)

### 2. Clone & Install
```powershell
# Clone the repository
git clone https://github.com/7236alok/kmrl-doc-processor.git
cd kmrl-doc-processor

# Install dependencies
npm install
```

### 3. Environment Setup (Optional)
Create `.env` file:
```env
OCR_AUTO_DOWNLOAD=1
OCR_LANGUAGES=eng,hin,mal
```

### 4. Build & Run
```powershell
# Build the project
npm run build

# Start processing
npm run start:dist
```

## ✅ What Happens on First Run

1. **Tesseract OCR Data**: Auto-downloads language files for English, Hindi, Malayalam
2. **Transformer Models**: Downloads AI models for summarization and classification
3. **Document Processing**: Processes any files in `storage/documents/not-processed/`
4. **Output Generation**: Creates summaries, extracts entities, and saves metadata

## 📂 File Structure

```
📁 kmrl-doc-processor/
├── 📁 storage/documents/not-processed/  ← PUT YOUR DOCUMENTS HERE
├── 📁 storage/documents/processed/      ← PROCESSED FILES APPEAR HERE  
├── 📁 storage/metadata/                 ← EXTRACTED METADATA (JSON)
├── 📁 models/                          ← AI MODELS (auto-downloaded)
├── 📁 tessdata/                        ← OCR LANGUAGE FILES (auto-downloaded)
└── 📄 .env                            ← ENVIRONMENT CONFIG (create this)
```

## 🔧 Troubleshooting

### Issue: "Module not found" 
**Solution:**
```powershell
node --version  # Should be v22.14.x
npm install
```

### Issue: TypeScript errors
**Solution:**
```powershell
npm run build
```

### Issue: No documents processed
**Solution:**
1. Place test documents in `storage/documents/not-processed/`
2. Supported formats: `.txt`, `.pdf`, `.docx`, `.png`, `.jpg`

### Issue: AI models not working
**Solution:**
- Models download automatically on first use
- Check `models/` directory exists
- Internet connection required for first download

## 🎯 Test the Setup

1. **Create test document:**
```powershell
echo "This is a test document for KMRL processing." > storage/documents/not-processed/test.txt
```

2. **Run processor:**
```powershell
npm run start:dist
```

3. **Check results:**
- Processed file: `storage/documents/processed/test.txt`
- Metadata: `storage/metadata/test.json`

## 🚀 You're Ready!

Your KMRL Document Processor is now set up and ready to process documents with:
- ✅ **OCR** for text extraction from images/PDFs
- ✅ **AI Summarization** using local transformer models
- ✅ **Entity Recognition** for people, dates, locations
- ✅ **Document Classification** into categories
- ✅ **Metadata Generation** with structured JSON output

Place documents in the `not-processed` folder and run `npm run start:dist` to begin processing!

---

For detailed documentation, see `README.md` and `docs/` folder.