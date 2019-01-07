import { promises as fs } from 'fs';
import { ACacheStore, IStringKeyValue } from './cache-store';

export { FileCacheStore };

class FileCacheStore extends ACacheStore {
  private pfilename = '';

  constructor(filename: string = './cache.json') {
    super();
    this.pfilename = filename;
  }

  private getFileName(): string {
    return this.pfilename;
  }

  async doLoadCache(): Promise<IStringKeyValue | null> {
    try {
      const text = await fs.readFile(this.getFileName(), 'utf8');
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  async saveCache(data: IStringKeyValue): Promise<boolean> {
    try {
      await fs.writeFile(this.getFileName(), JSON.stringify(data), 'utf8');
      return true;
    } catch (e) {
      return false;
    }
  }

  async exists(): Promise<boolean> {
    try {
      let result = (await fs.stat(this.getFileName())) ? true : false;
      return result;
    } catch (e) {
      return false;
    }
  }
  async getTimeStamp(): Promise<Date> {
    try {
      const stat = await fs.stat(this.getFileName());
      return stat ? stat.atime : new Date(0);
    } catch (e) {
      return new Date(0);
    }
  }

  async clear(): Promise<boolean> {
    try {
      const stat = await fs.stat(this.getFileName());
      await fs.unlink(this.getFileName());
      return true;
    } catch (e) {
      return false;
    }
  }
}
