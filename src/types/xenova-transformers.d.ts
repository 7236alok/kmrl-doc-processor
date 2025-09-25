declare module '@xenova/transformers' {
  export const env: any;
  export function pipeline(task: string, modelId?: string): Promise<(input: string | string[], options?: any) => Promise<any>>;
  export class AutoTokenizer {
    static from_pretrained(modelId: string): Promise<AutoTokenizer>;
    tokenize(input: string): string[];
  }
}
