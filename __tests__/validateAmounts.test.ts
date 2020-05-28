import { validateElementAmounts, validateElementDrCr, validateElementTaxAmounts } from '../src/util/util'

let errorField: string
const formMock = {
    // A mock of react-hook-form's setError
    setError: function (field: string, type?: string, message?: string) {
        errorField = field
    }
}

beforeEach(() => {
    errorField = ''
})

test('validateElementAmounts', () => {
    expect(validateElementAmounts(formMock, {elements: [
        {currency: 'USD', amount: ''},
    ]})).toBe(true)

    expect(validateElementAmounts(formMock, {elements: [
        {currency: 'USD', amount: '100', grossAmount: '100.00'},
    ]})).toBe(true)

    expect(validateElementAmounts(formMock, {elements: [
        {currency: 'USD', amount: '', grossAmount: 'abc'},
    ]})).toBe(false)
    expect(errorField).toBe('elements[0].grossAmount')

    expect(validateElementAmounts(formMock, {elements: [
        {currency: 'JPY', amount: '100', grossAmount: '100.00'},
    ]})).toBe(false)
    expect(errorField).toBe('elements[0].grossAmount')

    // Remember: Only the currency of the first element is used
    expect(validateElementAmounts(formMock, {elements: [
        {currency: 'USD', amount: '100', grossAmount: '100.00'},
        {currency: 'JPY', amount: '100', grossAmount: '100.00'},
    ]})).toBe(true)
})

test('validateElementDrCr', () => {
    expect(validateElementDrCr(formMock, {elements: [
        {currency: 'USD', amount: ''},
    ]})).toBe(true)

    expect(validateElementDrCr(formMock, {elements: [
        {currency: 'USD', dr: '100', cr: '100.00'},
    ]})).toBe(true)

    expect(validateElementDrCr(formMock, {elements: [
        {currency: 'USD', dr: '', cr: 'abc'},
    ]})).toBe(false)
    expect(errorField).toBe('elements[0].cr')

    expect(validateElementDrCr(formMock, {elements: [
        {currency: 'JPY', dr: '100', cr: '100.00'},
    ]})).toBe(false)
    expect(errorField).toBe('elements[0].cr')

    expect(validateElementDrCr(formMock, {elements: [
        {currency: 'USD', dr: '100', cr: '100.00'},
        {currency: 'JPY', dr: '100', cr: '100.00'},
    ]})).toBe(false)
    expect(errorField).toBe('elements[1].cr')
})

test('validateElementTaxAmounts', () => {
    expect(validateElementTaxAmounts(formMock, {elements: [{currency: 'USD'
    }]})).toBe(true)

    expect(validateElementTaxAmounts(formMock, {elements: [{currency: 'USD', taxes: [
        {amount: ''}
    ]}]})).toBe(true)

    expect(validateElementTaxAmounts(formMock, {elements: [{currency: 'USD', taxes: [
        {amount: '10'}
    ]}]})).toBe(true)

    expect(validateElementTaxAmounts(formMock, {elements: [{currency: 'USD', taxes: [
        {amount: 'abc'}
    ]}]})).toBe(false)
    expect(errorField).toBe('elements[0].taxes[0].amount')

    expect(validateElementTaxAmounts(formMock, {elements: [{currency: 'USD', taxes: [
        {amount: '10'}, {amount: 'abc'}
    ]}]})).toBe(false)
    expect(errorField).toBe('elements[0].taxes[1].amount')

    expect(validateElementTaxAmounts(formMock, {elements: [{currency: 'USD'}, {taxes: [
        {amount: '10'}, {amount: 'abc'}
    ]}]})).toBe(false)
    expect(errorField).toBe('elements[1].taxes[1].amount')
})
