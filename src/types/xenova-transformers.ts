// Type shim for @xenova/transformers used only at compile time
export const env: any = {};
export async function pipeline(task: string, modelId?: string): Promise<(input: string | string[], options?: any) => Promise<any>> {
  throw new Error('Type shim only; not for runtime');
}
export class AutoTokenizer {
  static async from_pretrained(modelId: string): Promise<AutoTokenizer> { return new AutoTokenizer(); }
  tokenize(input: string): string[] { return []; }
}
