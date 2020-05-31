var VATRates = require('vatrates')
import { Project } from '../src/core'
import { taxCodeInfo, taxCodes, taxCodesEU,
    taxLabel, taxCodeWithRate, calculateTaxes } from '../src/core/tax'
import { CalculateTaxState, formCalculateTaxes } from '../src/components/form'
import { MockForm } from '../src/test/MockForm'

beforeAll(async () => {
    await Project.create(':memory:')
    await Project.variables.set('taxEnable', ['AU', 'CA', 'EU', 'US'])
    await Project.variables.set('customTaxCodes', `
        MY:GST:6
        MY:st:10
    `)
    return Promise.resolve()
})

afterAll(() => {
    Project.knex.destroy()
    return Project.close()
})

function taxCodesFromVATRates(homeCountryCode: string) {
    const codes: string[] = ['EU:VAT;r:0']
    new VATRates().getJSON().rates.forEach((data: any) => {
        function process(rates: any, suffix = '') {
            if (rates.standard) {
                codes.push(`EU-${data.code}:VAT${suffix}:${rates.standard}`)
            }
            if (Array.isArray(rates.reduced)) {
                rates.reduced.forEach((rate: number) => {
                    codes.push(`EU-${data.code}:VAT${suffix}:reduced:${rate}`)
                })
            }
            if (rates.superReduced) {
                codes.push(`EU-${data.code}:VAT${suffix}:super-reduced:${rates.superReduced}`)
            }
            if (rates.parking) {
                codes.push(`EU-${data.code}:VAT${suffix}:parking:${rates.parking}`)
            }    
        }

        process(data.periods[0].rates)
    })

    return codes
}

function logCodes(codes0?: any[]) {
    let text = ''
    const codes = codes0 || taxCodes()
    codes.forEach((item: {code: string, label: string} | string) => {
        if (typeof(item) === 'object') {
            text += `${item.code} => ${item.label}\n`
        }
        else {
            text += `${item} => ${taxLabel(item)}\n`
        }
    })
    console.log(text)
}

test('cross comparison against VATRates', () => {
    let taxLabelsFromVATRates: Record<string, string>
    let taxLabeslsEU: Record<string, string>

    taxLabelsFromVATRates = {}
    taxLabeslsEU = {}
    taxCodesFromVATRates('').forEach(code => {
        taxLabelsFromVATRates[code] = taxLabel(code)
    })
    taxCodesEU().forEach(code => {
        taxLabeslsEU[code] = taxLabel(code)
    })
    expect(taxLabelsFromVATRates).toEqual(taxLabeslsEU)

    taxLabelsFromVATRates = {}
    taxLabeslsEU = {}
    taxCodesFromVATRates('AT').forEach(code => {
        taxLabelsFromVATRates[code] = taxLabel(code)
    })
    taxCodesEU().forEach(code => {
        taxLabeslsEU[code] = taxLabel(code)
    })
    expect(taxLabelsFromVATRates).toEqual(taxLabeslsEU)

    taxLabelsFromVATRates = {}
    taxLabeslsEU = {}
    taxCodesFromVATRates('GR').forEach(code => {
        taxLabelsFromVATRates[code] = taxLabel(code)
    })
    taxCodesEU().forEach(code => {
        taxLabeslsEU[code] = taxLabel(code)
    })
    expect(taxLabelsFromVATRates).toEqual(taxLabeslsEU)

    taxLabelsFromVATRates = {}
    taxLabeslsEU = {}
    taxCodesFromVATRates('GB').forEach(code => {
        taxLabelsFromVATRates[code] = taxLabel(code)
    })
    taxCodesEU().forEach(code => {
        taxLabeslsEU[code] = taxLabel(code)
    })
    expect(taxLabelsFromVATRates).toEqual(taxLabeslsEU)
})

test('existence of tax codes', () => {
    const codes = taxCodes()
    ;[
        'AU:GST:10',
        'CA:GST:5', 'CA-BC:PST:7',
        'US-MA:st;x:6.25', 'US-CA:st;x:7.25',
        // Inserted by setting `customTaxCodes` above
        'MY:GST:6', 'MY:st:10',
    ].forEach(item => {
        expect(codes).toContain(item)
    })
})

test('parsing', () => {
    let info = taxCodeInfo('EU-AT:VAT:20')
    expect(info.geoParts).toEqual(['EU', 'AT'])
    expect(info.typeParts).toEqual(['VAT'])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('20')
    expect(info.reverse).toBeFalsy()

    info = taxCodeInfo('AU:GST:10')
    expect(info.geoParts).toEqual(['AU'])
    expect(info.typeParts).toEqual(['GST'])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('10')
    expect(info.reverse).toBeFalsy()

    info = taxCodeInfo(':zero:0')
    expect(info.geoParts).toEqual([''])
    expect(info.typeParts).toEqual(['zero'])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('0')
    expect(info.reverse).toBeFalsy()

    info = taxCodeInfo(':exempt:0')
    expect(info.geoParts).toEqual([''])
    expect(info.typeParts).toEqual(['exempt'])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('0')
    expect(info.reverse).toBeFalsy()

    // Some bogus strings
    info = taxCodeInfo(':tax:')
    expect(info.geoParts).toEqual([''])
    expect(info.typeParts).toEqual(['tax'])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('')
    expect(info.reverse).toBeFalsy()

    info = taxCodeInfo('')
    expect(info.geoParts).toEqual([''])
    expect(info.typeParts).toEqual([''])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('')
    expect(info.reverse).toBeFalsy()

    info = taxCodeInfo(':')
    expect(info.geoParts).toEqual([''])
    expect(info.typeParts).toEqual([''])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('')
    expect(info.reverse).toBeFalsy()
})

test('labels', () => {
    expect(taxLabel('EU-AT:VAT:20')).toEqual('Austria VAT 20%')
    expect(taxLabel('EU-AT:VAT:reduced:10')).toEqual('Austria VAT (reduced) 10%')
    expect(taxLabel('EU-AT:VAT:reduced:13')).toEqual('Austria VAT (reduced) 13%')
    expect(taxLabel('EU-AT:VAT:parking:13')).toEqual('Austria VAT (parking) 13%')
    expect(taxLabel('EU-FR:VAT:super-reduced:2.1')).toEqual('France VAT (super reduced) 2.1%')

    expect(taxLabel('EU-EL:VAT:24')).toEqual('Greece VAT 24%')
    expect(taxLabel('EU-UK:VAT:20')).toEqual('United Kingdom VAT 20%')

    expect(taxLabel('EU:VAT;r:0')).toEqual('VAT reverse charged 0%')

    expect(taxLabel('AU:GST:10')).toEqual('Australia GST 10%')
    expect(taxLabel('CA:GST:5')).toEqual('Canada GST 5%')
    expect(taxLabel('CA-PE:HST:15')).toEqual('Prince Edward Island HST 15%')
    expect(taxLabel('CA-QC:QST:9.975')).toEqual('Quebec QST 9.975%')
    expect(taxLabel('CA-SK:PST:6')).toEqual('Saskatchewan PST 6%')

    expect(taxLabel('US-CA:st;x:')).toEqual('California Sales Tax')
    expect(taxLabel('US-CA:st;x:7.25')).toEqual('California Sales Tax 7.25%')

    expect(taxLabel(':zero:0')).toEqual('Zero rated 0%')
    expect(taxLabel(':exempt:0')).toEqual('Tax exempt 0%')

    expect(taxLabel(':tax:')).toEqual('tax')
    expect(taxLabel(':TAX:')).toEqual('TAX')
    // expect(taxLabel(':Sales Tax;r:10.123')).toEqual('Sales Tax 10.123%')

    expect(taxLabel('')).toEqual('')
    expect(taxLabel(':')).toEqual('')
    expect(taxLabel('::')).toEqual('')
    expect(taxLabel(':::')).toEqual('')
})

test('taxCodeWithRate', () => {
    expect(taxCodeWithRate('', '10')).toBe('::10')
    expect(taxCodeWithRate(':', '10')).toBe('::10')
    expect(taxCodeWithRate('::', '10')).toBe('::10')
    expect(taxCodeWithRate('::abc', '10')).toBe('::10')
    expect(taxCodeWithRate(':::', '10')).toBe(':::10')
    expect(taxCodeWithRate(':::abc', '10')).toBe(':::10')
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
