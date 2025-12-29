import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FileParserService {
  constructor() {}

  // This function takes a raw file, reads it, and logs the first 100 characters
  parseFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const text = e.target.result;
        console.log('ØZARK Content Preview:', text.substring(0, 100) + '...');
        resolve(text);
      };

      reader.onerror = (error) => reject(error);

      // Actually read the text content
      reader.readAsText(file);
    });
  }
}
