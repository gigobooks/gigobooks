import { validateElementAmounts, validateElementDrCr, validateElementTaxAmounts } from '../src/util/util'
import { MockForm } from '../src/test/MockForm'

test('validateElementAmounts', () => {
    expect(validateElementAmounts(MockForm.clear(), {elements: [
        {currency: 'USD', amount: ''},
    ]})).toBe(true)

    expect(validateElementAmounts(MockForm.clear(), {elements: [
        {currency: 'USD', amount: '100', grossAmount: '100.00'},
    ]})).toBe(true)

    expect(validateElementAmounts(MockForm.clear(), {elements: [
        {currency: 'USD', amount: '-100', grossAmount: ''},
    ]})).toBe(true)

    expect(validateElementAmounts(MockForm.clear(), {elements: [
        {currency: 'USD', amount: '', grossAmount: 'abc'},
    ]})).toBe(false)
    expect(MockForm.errorField).toBe('elements[0].grossAmount')

    expect(validateElementAmounts(MockForm.clear(), {elements: [
        {currency: 'JPY', amount: '100', grossAmount: '100.00'},
    ]})).toBe(false)
    expect(MockForm.errorField).toBe('elements[0].grossAmount')

    // Remember: Only the currency of the first element is used
    expect(validateElementAmounts(MockForm.clear(), {elements: [
        {currency: 'USD', amount: '100', grossAmount: '100.00'},
        {currency: 'JPY', amount: '100', grossAmount: '100.00'},
    ]})).toBe(true)
})

test('validateElementDrCr', () => {
    expect(validateElementDrCr(MockForm.clear(), {elements: [
        {currency: 'USD', amount: ''},
    ]})).toBe(true)

    expect(validateElementDrCr(MockForm.clear(), {elements: [
        {currency: 'USD', dr: '100', cr: '100.00'},
    ]})).toBe(true)

    expect(validateElementDrCr(MockForm.clear(), {elements: [
        {currency: 'USD', dr: '', cr: 'abc'},
    ]})).toBe(false)
    expect(MockForm.errorField).toBe('elements[0].cr')

    expect(validateElementDrCr(MockForm.clear(), {elements: [
        {currency: 'JPY', dr: '100', cr: '100.00'},
    ]})).toBe(false)
    expect(MockForm.errorField).toBe('elements[0].cr')

    expect(validateElementDrCr(MockForm.clear(), {elements: [
        {currency: 'USD', dr: '100', cr: '100.00'},
        {currency: 'JPY', dr: '100', cr: '100.00'},
    ]})).toBe(false)
    expect(MockForm.errorField).toBe('elements[1].cr')
})

test('validateElementTaxAmounts', () => {
    expect(validateElementTaxAmounts(MockForm.clear(), {elements: [{currency: 'USD'
    }]})).toBe(true)

    expect(validateElementTaxAmounts(MockForm.clear(), {elements: [{currency: 'USD', taxes: [
        {amount: ''}
    ]}]})).toBe(true)

    expect(validateElementTaxAmounts(MockForm.clear(), {elements: [{currency: 'USD', taxes: [
        {amount: '10'}
    ]}]})).toBe(true)

    expect(validateElementTaxAmounts(MockForm.clear(), {elements: [{currency: 'USD', taxes: [
        {amount: 'abc'}
    ]}]})).toBe(false)
    expect(MockForm.errorField).toBe('elements[0].taxes[0].amount')

    expect(validateElementTaxAmounts(MockForm.clear(), {elements: [{currency: 'USD', taxes: [
        {amount: '10'}, {amount: 'abc'}
    ]}]})).toBe(false)
    expect(MockForm.errorField).toBe('elements[0].taxes[1].amount')

    expect(validateElementTaxAmounts(MockForm.clear(), {elements: [{currency: 'USD'}, {taxes: [
        {amount: '10'}, {amount: 'abc'}
    ]}]})).toBe(false)
    expect(MockForm.errorField).toBe('elements[1].taxes[1].amount')
})
