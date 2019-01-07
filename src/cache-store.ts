export { IStringKeyValue, ICacheStore, ACacheStore, MemoryCacheStore };

interface IStringKeyValue {
  [index: string]: string;
}

interface ICacheStore {
  loadCache(): Promise<IStringKeyValue | null>;
  saveCache(data: IStringKeyValue): Promise<boolean>;
  setCacheLimitDays(days: number): void;
  setCacheLimitHours(Hours: number): void;
  setCacheLimitMinutes(Minutes: number): void;
  clear(): Promise<boolean>;
}

abstract class ACacheStore implements ICacheStore {
  protected abstract getTimeStamp(): Promise<Date>;
  protected abstract doLoadCache(): Promise<IStringKeyValue | null>;
  abstract saveCache(data: IStringKeyValue): Promise<boolean>;
  abstract clear(): Promise<boolean>;

  private pcacheLimit = 1000 * 60 * 60 * 24 * 30;

  loadCache(): Promise<IStringKeyValue | null> {
    return new Promise<IStringKeyValue | null>(resolve => {
      this.getTimeStamp()
        .then(date => {
          if (date && new Date().valueOf() < date.valueOf() + this.pcacheLimit) {
            resolve(this.doLoadCache());
          } else {
            resolve(null);
          }
        })
        .catch(reason => resolve(null));
    });
  }

  setCacheLimitDays(days: number): void {
    this.pcacheLimit = 1000 * 60 * 60 * 24 * days;
  }
  setCacheLimitHours(Hours: number): void {
    this.pcacheLimit = 1000 * 60 * 60 * Hours;
  }
  setCacheLimitMinutes(Minutes: number): void {
    this.pcacheLimit = 1000 * 60 * Minutes;
  }
}

class MemoryCacheStore extends ACacheStore {
  private pDate = new Date(0);
  private pData: IStringKeyValue | null = null;

  protected async getTimeStamp(): Promise<Date> {
    return this.pDate;
  }
  protected async doLoadCache(): Promise<IStringKeyValue | null> {
    return this.pData;
  }
  async saveCache(data: IStringKeyValue): Promise<boolean> {
    this.pData = {};
    Object.assign(this.pData, data);
    return true;
  }

  async clear(): Promise<boolean> {
    this.pData = null;
    return true;
  }
}
