export const MODEL_CONFIG = {
  ocr: {
    provider: 'tesseract',
    model: 'default',
  },
  translation: {
    provider: 'offline',
    model: 'passthrough',
  },
  embeddings: {
    provider: 'offline',
    model: 'dummy-vector-1536',
  },
  summarization: {
    provider: 'offline',
    model: 'Xenova/distilbart-cnn-6-6',
  },
};

export default MODEL_CONFIG;
