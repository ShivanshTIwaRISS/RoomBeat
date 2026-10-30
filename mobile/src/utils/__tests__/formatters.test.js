import { formatDuration, formatFileSize, formatMs, formatRoomCode } from '../formatters';
describe('Formatters Unit Tests', () => {
    it('formats duration in ms to MM:SS', () => {
        expect(formatDuration(0)).toBe('0:00');
        expect(formatDuration(65000)).toBe('1:05');
        expect(formatDuration(3665000)).toBe('1:01:05');
    });
    it('formats file sizes accurately', () => {
        expect(formatFileSize(0)).toBe('0 B');
        expect(formatFileSize(1024)).toBe('1 KB');
        expect(formatFileSize(1048576 * 5)).toBe('5 MB');
    });
    it('formats millisecond deltas with positive and negative signs', () => {
        expect(formatMs(15.4)).toBe('+15 ms');
        expect(formatMs(-22.1)).toBe('-22 ms');
        expect(formatMs(0)).toBe('0 ms');
    });
    it('formats 6-character room codes with clean hyphenation', () => {
        expect(formatRoomCode('RB9481')).toBe('RB9-481');
        expect(formatRoomCode('ABC')).toBe('ABC');
    });
});
