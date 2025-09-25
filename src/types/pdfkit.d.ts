declare module 'pdfkit' {
  import { Writable } from 'stream';
  class PDFKitDocument extends Writable {
    constructor(options?: any);
    pipe(stream: NodeJS.WritableStream): this;
    fontSize(size: number): this;
    text(text: string, x?: number, y?: number, options?: any): this;
    end(): void;
  }
  export default PDFKitDocument;
}
