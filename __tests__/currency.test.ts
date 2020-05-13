import { getCurrencyInfo, toFormatted, parseFormatted } from '../src/core/currency'

// Apparently, node.js, by defaults, only includes locale data for english.
// So any attempts to test non-english locales may fail.

test('get currency info', () => {
    [
        {code: 'JPY', scale: 1, separator: '', grouper: ','},
        {code: 'EUR', scale: 100, separator: '.', grouper: ','},
        {code: 'USD', scale: 100, separator: '.', grouper: ','},
        {code: 'CLF', scale: 10000, separator: '.', grouper: ','},
    ].forEach(i => {
        expect(getCurrencyInfo(i.code)).toMatchObject(i)
    })
})

test('toFormatted', () => {
    expect(toFormatted(1, 'USD')).toBe('0.01')
    expect(toFormatted(12, 'USD')).toBe('0.12')
    expect(toFormatted(123, 'USD')).toBe('1.23')
    expect(toFormatted(1234, 'USD')).toBe('12.34')
    expect(toFormatted(12345, 'USD')).toBe('123.45')
    expect(toFormatted(123456, 'USD')).toBe('1 234.56')
    expect(toFormatted(1234567, 'USD')).toBe('12 345.67')
    expect(toFormatted(12345678, 'USD')).toBe('123 456.78')
    expect(toFormatted(123456789, 'USD')).toBe('1 234 567.89')
    expect(toFormatted(1234567890, 'USD')).toBe('12 345 678.90')
    expect(toFormatted(1, 'JPY')).toBe('1')
    expect(toFormatted(12, 'JPY')).toBe('12')
    expect(toFormatted(123, 'JPY')).toBe('123')
    expect(toFormatted(1234, 'JPY')).toBe('1 234')
    expect(toFormatted(12345, 'JPY')).toBe('12 345')
    expect(toFormatted(123456, 'JPY')).toBe('123 456')
    expect(toFormatted(1234567, 'JPY')).toBe('1 234 567')
    expect(toFormatted(12345678, 'JPY')).toBe('12 345 678')
    expect(toFormatted(123456789, 'JPY')).toBe('123 456 789')
    expect(toFormatted(1234567890, 'JPY')).toBe('1 234 567 890')
})

test('parseFormatted', () => {
    expect(parseFormatted('0.01', 'USD')).toBe(1)
    expect(parseFormatted('0 . 0 1', 'USD')).toBe(1)
    expect(parseFormatted('0.12', 'USD')).toBe(12)
    expect(parseFormatted('0 . 1 2 ', 'USD')).toBe(12)

    expect(parseFormatted('1.23', 'USD')).toBe(123)
    expect(parseFormatted('12.34', 'USD')).toBe(1234)
    expect(parseFormatted('123.45', 'USD')).toBe(12345)

    expect(parseFormatted(' 12  ', 'USD')).toBe(1200)
    expect(parseFormatted('12', 'USD')).toBe(1200)
    expect(parseFormatted('12.', 'USD')).toBe(1200)
    expect(parseFormatted('12.00', 'USD')).toBe(1200)
    expect(parseFormatted('12.3', 'USD')).toBe(1230)

    expect(parseFormatted('123.454999', 'USD')).toBe(12345)
    expect(parseFormatted('123.455001', 'USD')).toBe(12346)

    expect(parseFormatted('1,23.45', 'USD')).toBe(12345)
    expect(parseFormatted('1 23.45', 'USD')).toBe(12345)
    expect(() => parseFormatted('1.23.45', 'USD')).toThrow()
    expect(() => parseFormatted('123.4,5', 'USD')).toThrow()

    expect(parseFormatted('123.45', 'USD')).toBe(12345)
    expect(parseFormatted('1 234.56', 'USD')).toBe(123456)
    expect(parseFormatted('12,345.67', 'USD')).toBe(1234567)
    expect(parseFormatted('123 456.78', 'USD')).toBe(12345678)
    expect(parseFormatted('1,234,567.89', 'USD')).toBe(123456789)

    expect(parseFormatted('123,45', 'USD')).toBe(1234500)
    expect(parseFormatted('1 234,56', 'USD')).toBe(12345600)
    expect(parseFormatted('12,345,67', 'USD')).toBe(123456700)
    expect(parseFormatted('123 456,78', 'USD')).toBe(1234567800)
    expect(parseFormatted('1,234,567 89', 'USD')).toBe(12345678900)

    expect(parseFormatted('1', 'JPY')).toBe(1)
    expect(parseFormatted('12', 'JPY')).toBe(12)
    expect(parseFormatted('123', 'JPY')).toBe(123)

    expect(parseFormatted('1,234', 'JPY')).toBe(1234)
    expect(parseFormatted('1 234', 'JPY')).toBe(1234)
    expect(parseFormatted('12 34', 'JPY')).toBe(1234)
    expect(parseFormatted('1 23 4', 'JPY')).toBe(1234)

    expect(() => parseFormatted('1.23', 'JPY')).toThrow()
    expect(() => parseFormatted('a', 'USD')).toThrow()
    expect(() => parseFormatted('abc', 'USD')).toThrow()
    expect(() => parseFormatted('1a', 'USD')).toThrow()
})
