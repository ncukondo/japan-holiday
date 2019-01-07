/**
 * @jest-environment node
 */
import getHolidayName, * as jsholiday from './japan-holiday';
import { FileCacheStore } from './file-cache-store';
jest.unmock('./japan-holiday');

describe('japan-holiday', () => {
  describe('getHolidayName()', () => {
    beforeEach(() => {});
    it('2018/3/21 is 春分の日', async () => {
      let result = await getHolidayName(2018, 3, 21);
      expect(result).toBe('春分の日');
    });
    it('2019/8/12 is 山の日 振替休日 in replaced cache', async () => {
      let cache = new FileCacheStore('./cache.json');
      jsholiday.setCacheStore(cache);
      let result = await getHolidayName(2019, 8, 12);
      let data = await cache.loadCache();
      expect(result).toBe('山の日 振替休日');
      expect(JSON.stringify(data)).toContain('2019-08-12');
      let canClearCache = await cache.clear();
      expect(canClearCache).toBeTruthy();
    });
  });
});
