import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller()
export class AppController {
  @Get('/health')
  health() {
    return { status: 'ok', app: 'poca', timestamp: new Date().toISOString() };
  }

  @Get('ko.json')
  @HttpCode(HttpStatus.OK)
  getKoJson(): Record<string, string> {
    const filePath = join(process.cwd(), 'lang', 'ko.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent) as Record<string, string>;
  }

  @Get('en.json')
  @HttpCode(HttpStatus.OK)
  getEnJson(): Record<string, string> {
    const filePath = join(process.cwd(), 'lang', 'en.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent) as Record<string, string>;
  }
}
