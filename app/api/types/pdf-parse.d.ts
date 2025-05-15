declare module 'pdf-parse' {
  export default function (buffer: Buffer, options?: any): Promise<{
    text: string;
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
    filename?: string;
  }>;
} 