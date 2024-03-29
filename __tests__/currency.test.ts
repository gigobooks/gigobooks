import { Project } from '../src/core'
import { getCurrencyInfo, toFormatted, parseFormatted, convertCurrency, addSubtractMoney } from '../src/core/currency'

beforeAll(async () => {
    await Project.create(':memory:')
    return Promise.resolve()
})

afterAll(() => {
    Project.knex.destroy()
    return Project.close()
})

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
    expect(toFormatted(123456, 'USD')).toBe('1,234.56')
    expect(toFormatted(1234567, 'USD')).toBe('12,345.67')
    expect(toFormatted(12345678, 'USD')).toBe('123,456.78')
    expect(toFormatted(123456789, 'USD')).toBe('1,234,567.89')
    expect(toFormatted(1234567890, 'USD')).toBe('12,345,678.90')
    expect(toFormatted(1, 'JPY')).toBe('1')
    expect(toFormatted(12, 'JPY')).toBe('12')
    expect(toFormatted(123, 'JPY')).toBe('123')
    expect(toFormatted(1234, 'JPY')).toBe('1,234')
    expect(toFormatted(12345, 'JPY')).toBe('12,345')
    expect(toFormatted(123456, 'JPY')).toBe('123,456')
    expect(toFormatted(1234567, 'JPY')).toBe('1,234,567')
    expect(toFormatted(12345678, 'JPY')).toBe('12,345,678')
    expect(toFormatted(123456789, 'JPY')).toBe('123,456,789')
    expect(toFormatted(1234567890, 'JPY')).toBe('1,234,567,890')
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

test('exchange rates', () => {
    Project.variables.setMultiple({
        currency: 'USD',
        exchangeRates: {
            USD: { AUD: 1.3714, EUR: 0.8446 }
        }
    }, true)    // Setting sessionOnly = true makes it synchronous

    const item0 = { amount: 100, grossAmount: 1000, parentAmount: 10000 }
    expect(convertCurrency({...item0, currency: 'USD'}, 'AUD')).toEqual({amount: 137, grossAmount: 1371, parentAmount: 13714, currency: 'AUD'})
    expect(convertCurrency({...item0, currency: 'AUD'}, 'USD')).toEqual({amount: 73, grossAmount: 729, parentAmount: 7292, currency: 'USD'})
    expect(convertCurrency({...item0, currency: 'USD'}, 'EUR')).toEqual({amount: 84, grossAmount: 845, parentAmount: 8446, currency: 'EUR'})
    expect(convertCurrency({...item0, currency: 'EUR'}, 'USD')).toEqual({amount: 118, grossAmount: 1184, parentAmount: 11840, currency: 'USD'})

    // Non-primary currency
    expect(convertCurrency({...item0, currency: 'AUD'}, 'EUR')).toEqual({amount: 62, grossAmount: 616, parentAmount: 6159, currency: 'EUR'})
    expect(convertCurrency({...item0, currency: 'EUR'}, 'AUD')).toEqual({amount: 162, grossAmount: 1624, parentAmount: 16237, currency: 'AUD'})
})

test('add/subtract money', () => {
    const a = [
        {currency: 'usd', amount: 50},
        {currency: 'aud', amount: 10},
        {currency: 'aud', amount: 20},
    ]
    const b = [
        {currency: 'usd', amount: 5},
        {currency: 'aud', amount: 1},
        {currency: 'aud', amount: 2},
        {currency: 'eur', amount: 4},
    ]

    expect(addSubtractMoney(a, b)).toEqual([
        {currency: 'aud', amount: 27},
        {currency: 'eur', amount: -4},
        {currency: 'usd', amount: 45},
    ])
})
