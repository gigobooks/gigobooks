var VATRates = require('vatrates')
import { Project } from '../src/core'
import { TaxCode, taxRatesEU, calculateTaxes } from '../src/core/tax'
import { CalculateTaxState, formCalculateTaxes } from '../src/components/form'
import { MockForm } from '../src/test/MockForm'

beforeAll(async () => {
    await Project.create(':memory:')
    return Promise.resolve()
})

afterAll(() => {
    Project.knex.destroy()
    return Project.close()
})

function taxRatesFromVATRates() {
    const codes: Record<string, string[]> = {}
    new VATRates().getJSON().rates.forEach((data: any) => {
        function process(rates: any) {
            codes[data.code] = []
            if (rates.standard) {
                codes[data.code].push(`${rates.standard}`)
            }
            if (Array.isArray(rates.reduced)) {
                rates.reduced.forEach((rate: number) => {
                    codes[data.code].push(`reduced:${rate}`)
                })
            }
            if (rates.superReduced) {
                codes[data.code].push(`super-reduced:${rates.superReduced}`)
            }
            if (rates.parking) {
                codes[data.code].push(`parking:${rates.parking}`)
            }
        }

        process(data.periods[0].rates)
    })

    return codes
}

function logCodes(codes: (TaxCode | string)[], prefix = '') {
    let text = prefix ? `${prefix}\n` : ''
    codes.forEach((item) => {
        const obj = typeof(item) === 'string' ? new TaxCode(item): item
        text += `${obj.taxCode} => ${obj.label}\n`
    })
    console.log(text)
}

test('cross comparison against VATRates', () => {
    const copy = taxRatesEU
    // Insert an item that is missing from our code
    copy.IE.push('parking:13.5')

    expect(taxRatesFromVATRates()).toEqual(copy)
})

test('parsing', () => {
    let info = new TaxCode('EU-AT:VAT:20')
    expect(info.authority).toEqual('EU-AT')
    expect(info.geoParts).toEqual(['EU', 'AT'])
    expect(info.authorityExtra).toEqual('')
    expect(info.type).toEqual('VAT')
    expect(info.reverse).toBeFalsy()
    expect(info.variable).toBeFalsy()
    expect(info.tags).toEqual([])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('20')

    info = new TaxCode('EU-IE:VAT;foo;ding;r:reduced:13.5')
    expect(info.authority).toEqual('EU-IE')
    expect(info.geoParts).toEqual(['EU', 'IE'])
    expect(info.authorityExtra).toEqual('')
    expect(info.type).toEqual('VAT')
    expect(info.reverse).toBeTruthy()
    expect(info.variable).toBeFalsy()
    expect(info.tags).toEqual(['ding'])
    expect(info.variant).toBe('reduced')
    expect(info.rate).toEqual('13.5')

    info = new TaxCode('EU-IE-MOSS;FR:VAT;x:zero:0')
    expect(info.authority).toEqual('EU-IE-MOSS')
    expect(info.geoParts).toEqual(['EU', 'IE'])
    expect(info.authorityExtra).toEqual('FR')
    expect(info.type).toEqual('VAT')
    expect(info.reverse).toBeFalsy()
    expect(info.variable).toBeTruthy()
    expect(info.tags).toEqual([])
    expect(info.variant).toBe('zero')
    expect(info.rate).toEqual('0')

    info = new TaxCode('AU:GST;export;input:10')
    expect(info.authority).toEqual('AU')
    expect(info.geoParts).toEqual(['AU'])
    expect(info.authorityExtra).toEqual('')
    expect(info.type).toEqual('GST')
    expect(info.reverse).toBeFalsy()
    expect(info.variable).toBeFalsy()
    expect(info.tags).toEqual(['export', 'input'])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('10')

    info = new TaxCode('')
    expect(info.authority).toEqual('')
    expect(info.geoParts).toEqual([''])
    expect(info.authorityExtra).toEqual('')
    expect(info.type).toEqual('')
    expect(info.reverse).toBeFalsy()
    expect(info.variable).toBeFalsy()
    expect(info.tags).toEqual([])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('')
})

test('labels', () => {
    /*
    expect(new TaxCode('EU-AT:VAT:20').label).toEqual('Austria VAT 20%')
    expect(new TaxCode('EU-AT:VAT:reduced:10').label).toEqual('Austria VAT (reduced) 10%')
    expect(new TaxCode('EU-AT:VAT:reduced:13').label).toEqual('Austria VAT (reduced) 13%')
    expect(new TaxCode('EU-AT:VAT:parking:13').label).toEqual('Austria VAT (parking) 13%')
    expect(new TaxCode('EU-FR:VAT:super-reduced:2.1').label).toEqual('France VAT (super reduced) 2.1%')

    expect(new TaxCode('EU-EL:VAT:24').label).toEqual('Greece VAT 24%')
    expect(new TaxCode('EU-UK:VAT:20').label).toEqual('United Kingdom VAT 20%')
    */

    // expect(new TaxCode('EU-IE:VAT:zero:0').label).toEqual('IE: VAT (zero-rated) 0%')
    // expect(new TaxCode('EU-IE:VAT;r:zero:0').label).toEqual('IE: VAT (reverse charge) 0%')

    expect(new TaxCode('AU:GST:10').label).toEqual('AU: GST 10%')
    expect(new TaxCode('AU:GST:zero:0').label).toEqual('AU: GST Free 0%')
    expect(new TaxCode('AU:GST:export:0').label).toEqual('AU: GST Free Export 0%')
    expect(new TaxCode('AU:GST:input:0').label).toEqual('AU: GST (input taxed) 0%')
    expect(new TaxCode('AU:GST:capital:10').label).toEqual('AU: GST (capital purchase) 10%')

    /*
    expect(new TaxCode('CA:GST:5').label).toEqual('Canada GST 5%')
    expect(new TaxCode('CA-PE:HST:15').label).toEqual('Prince Edward Island HST 15%')
    expect(new TaxCode('CA-QC:QST:9.975').label).toEqual('Quebec QST 9.975%')
    expect(new TaxCode('CA-SK:PST:6').label).toEqual('Saskatchewan PST 6%')

    expect(new TaxCode('US-CA:st;x:').label).toEqual('California Sales Tax')
    expect(new TaxCode('US-CA:st;x:7.25').label).toEqual('California Sales Tax 7.25%')

    expect(new TaxCode(':zero:0').label).toEqual('Zero rated 0%')
    expect(new TaxCode(':exempt:0').label).toEqual('Tax exempt 0%')

    expect(new TaxCode(':tax:').label).toEqual('tax')
    expect(new TaxCode(':TAX:').label).toEqual('TAX')
    // expect(new TaxCode(':Sales Tax;r:10.123')).toEqual('Sales Tax 10.123%')

    expect(new TaxCode('').label).toEqual('')
    expect(new TaxCode(':').label).toEqual('')
    expect(new TaxCode('::').label).toEqual('')
    expect(new TaxCode(':::').label).toEqual('')
*/
})

test('calculate tax', () => {
    expect(calculateTaxes({amount: 100000, useGross: 0, rates: []}))
        .toEqual({amount: 100000, taxes: []})
    expect(calculateTaxes({amount: 100000, useGross: 0, rates: ['10']}))
        .toEqual({amount: 110000, taxes: [10000]})
    expect(calculateTaxes({amount: 100000, useGross: 0, rates: ['10', '0.001']}))
        .toEqual({amount: 110001, taxes: [10000, 1]})
    expect(calculateTaxes({amount: 100000, useGross: 0, rates: ['10', '-1']}))
        .toEqual({amount: 110000, taxes: [10000, 0]})
    expect(calculateTaxes({amount: 100000, useGross: 0, rates: ['10', 'blah']}))
        .toEqual({amount: 110000, taxes: [10000, 0]})
    expect(calculateTaxes({amount: 100000, useGross: 0, rates: ['blah']}))
        .toEqual({amount: 100000, taxes: [0]})

    expect(calculateTaxes({amount: 100000, useGross: 1, rates: []}))
        .toEqual({amount: 100000, taxes: []})
    expect(calculateTaxes({amount: 100000, useGross: 1, rates: ['10']}))
        .toEqual({amount: 90909, taxes: [9091]})
    expect(calculateTaxes({amount: 100000, useGross: 1, rates: ['10', '0.001']}))
        .toEqual({amount: 90908, taxes: [9091, 1]})
    expect(calculateTaxes({amount: 100000, useGross: 1, rates: ['10', '-1']}))
        .toEqual({amount: 90909, taxes: [9091, 0]})
    expect(calculateTaxes({amount: 100000, useGross: 1, rates: ['10', 'blah']}))
        .toEqual({amount: 90909, taxes: [9091, 0]})
    expect(calculateTaxes({amount: 100000, useGross: 1, rates: ['blah']}))
        .toEqual({amount: 100000, taxes: [0]})

    expect(calculateTaxes({amount: 110000, useGross: 1, rates: ['10']}))
        .toEqual({amount: 100000, taxes: [10000]})
    expect(calculateTaxes({amount: 110001, useGross: 1, rates: ['10', '0.001']}))
        .toEqual({amount: 100000, taxes: [10000, 1]})

    // sparse rates array
    const sparse = []
    sparse[3] = '10'
    sparse[5] = '10'
    expect(calculateTaxes({amount: 100000, useGross: 0, rates: sparse}))
        .toEqual({amount: 120000, taxes: [0, 0, 0, 10000, 0, 10000]})
})

test('form calculate tax', () => {
    function defaults() {
        return {
            setFormatted: jest.fn(),
            setGrossFormatted: jest.fn(),
            useGross: 0,
            setUseGross: jest.fn(),
            currency: 'USD',
            setCurrency: jest.fn(),
            setRates: jest.fn(),
        }
    }

    let state: CalculateTaxState
    state = {...defaults(), formatted: '100', grossFormatted: '', rates: []}
    formCalculateTaxes(MockForm.clear(), `elements[0]`, state, 'amount')
    expect(MockForm.values).toStrictEqual({
        'elements[0].grossAmount': '100.00'
    })
    expect(state.setFormatted).toHaveBeenCalled()

    state = {...defaults(), formatted: '100', grossFormatted: '', rates: ['10']}
    formCalculateTaxes(MockForm.clear(), `elements[0]`, state, 'amount')
    expect(MockForm.values).toStrictEqual({
        'elements[0].grossAmount': '110.00',
        'elements[0].taxes[0].amount': '10.00',
    })
    expect(state.setFormatted).toHaveBeenCalled()

    state = {...defaults(), formatted: '', grossFormatted: '115', useGross: 1, rates: ['10', '5']}
    formCalculateTaxes(MockForm.clear(), `elements[0]`, state, 'grossAmount')
    expect(MockForm.values).toStrictEqual({
        'elements[0].amount': '100.00',
        'elements[0].taxes[0].amount': '10.00',
        'elements[0].taxes[1].amount': '5.00',
    })
    expect(state.setGrossFormatted).toHaveBeenCalled()
    expect(state.setUseGross).toHaveBeenCalled()

    state = {...defaults(), formatted: '100', grossFormatted: '', useGross: 0, rates: ['10', '5']}
    formCalculateTaxes(MockForm.clear(), `elements[0]`, state, 'currency')
    expect(MockForm.values).toStrictEqual({
        'elements[0].grossAmount': '115.00',
        'elements[0].taxes[0].amount': '10.00',
        'elements[0].taxes[1].amount': '5.00',
    })
    expect(state.setCurrency).toHaveBeenCalled()

    state = {...defaults(), formatted: '', grossFormatted: '', useGross: 1, rates: ['', '5']}
    formCalculateTaxes(MockForm.clear(), `elements[0]`, state, 'rates')
    expect(MockForm.values).toStrictEqual({
        'elements[0].amount': '',
        'elements[0].taxes[0].amount': '',
        'elements[0].taxes[1].amount': '',
    })
    expect(state.setRates).toHaveBeenCalled()
})
