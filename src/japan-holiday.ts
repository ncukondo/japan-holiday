import parseIcal from '@ncukondo/ical-parser-light';
import axios from 'axios';
import { ACacheStore, ICacheStore, IStringKeyValue, MemoryCacheStore } from './cache-store';

export { ACacheStore, setCacheStore };
export default getHolidayName;

class JapanHoliday {
  private HOLIDAY_CALENDAR_URL =
    'https://calendar.google.com/calendar/ical/ja.japanese%23holiday%40group.v.calendar.google.com/public/basic.ics';
  private CACHE_LIMIT_DAYS = 30;
  private holidayList: IStringKeyValue | null = null;
  private DATE_FORMAT = 'YYYY-MM-DD';
  private cache: ICacheStore = new MemoryCacheStore();

  constructor() {
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

// process.on('unhandledRejection', console.dir);
