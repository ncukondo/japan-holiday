import parseIcal from '@ncukondo/ical-parser-light';
import axios from 'axios';
import { promises as fs } from 'fs';

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

interface IStringKeyValue {
  [index: string]: string;
}

class JapanHoliday {
  private HOLIDAY_CALENDAR_URL =
    'https://calendar.google.com/calendar/ical/ja.japanese%23holiday%40group.v.calendar.google.com/public/basic.ics';
  private CACHE_FILE = './cache/japan-holiday.cache.json';
  private CACHE_LIMIT_DAYS = 30;
  private holidayList: IStringKeyValue | null = null;
  private DATE_FORMAT = 'YYYY-MM-DD';
  private cache: ICacheStore = new FileCacheStore(this.CACHE_FILE);

  constructor() {
    this.setCacheStore(new FileCacheStore(this.CACHE_FILE));
    this.cache.setCacheLimitDays(this.CACHE_LIMIT_DAYS);
  }

  setCacheStore(cache: ICacheStore) {
    this.holidayList = null;
    this.cache = cache;
  }

  private format(date: Date, format = 'YYYY-MM-DD hh:mm:ss.SSS'): string {
    format = format.replace(/YYYY/g, date.getFullYear().toString());
    format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
    format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
    format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
    format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
    format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
    if (format.match(/S/g)) {
      var milliSeconds = ('00' + date.getMilliseconds()).slice(-3);
      var matches = format.match(/S/g);
      var length = matches ? matches.length : 0;
      for (var i = 0; i < length; i++)
        format = format.replace(/S/, milliSeconds.substring(i, i + 1));
    }
    return format;
  }

  private getHolidayListFromText(text: string) {
    let data = parseIcal(text);
    let result: IStringKeyValue = {};
    for (let event of data) {
      let dateText = this.format(event.startDate, this.DATE_FORMAT);
      result[dateText] = event.summary;
    }
    return result;
  }

  private async getFromRemote() {
    try {
      let response = await axios.get(this.HOLIDAY_CALENDAR_URL);
      return this.getHolidayListFromText(response.data);
    } catch (e) {
      return null;
    }
  }

  async getHolidayName(date: Date) {
    let key = this.format(date, this.DATE_FORMAT);
    let list: IStringKeyValue = await this.getHolidayList();
    return list[key];
  }

  private async getHolidayList() {
    if (this.holidayList) {
      return this.holidayList;
    }
    this.holidayList = await this.cache.loadCache();

    if (!this.holidayList) {
      this.holidayList = await this.getFromRemote();
      if (this.cache && this.holidayList) {
        this.cache.saveCache(this.holidayList);
      }
    }
    return this.holidayList || {};
  }
}

let pjapanHoliday = new JapanHoliday();

function setCacheStore(store: ICacheStore) {
  pjapanHoliday.setCacheStore(store);
}

async function getHolidayName(year: number, month: number, date: number): Promise<string>;
async function getHolidayName(date: Date): Promise<string>;
async function getHolidayName(
  first: number | Date,
  month?: number,
  date?: number
): Promise<string> {
  if (month) {
    return await pjapanHoliday.getHolidayName(new Date(first as number, month - 1, date));
  } else {
    return await pjapanHoliday.getHolidayName(first as Date);
  }
}

export { ACacheStore, setCacheStore, FileCacheStore };
export default getHolidayName;

// process.on('unhandledRejection', console.dir);
