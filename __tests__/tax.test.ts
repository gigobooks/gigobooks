var VATRates = require('vatrates')
import { Project } from '../src/core'
import { regionName, TaxCodeInfo, taxRatesEU, calculateTaxes, TaxAuthority } from '../src/core/tax'
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

function logCodes(codes: (TaxCodeInfo | string)[], prefix = '') {
    let text = prefix ? `${prefix}\n` : ''
    codes.forEach((item) => {
        const obj = typeof(item) === 'string' ? new TaxCodeInfo(item): item
        text += `${obj.taxCode} => ${obj.label}\n`
    })
    console.log(text)
}

test('regionName', () => {
    expect(regionName('EU')).toEqual('Europe')
    expect(regionName('EL')).toEqual(regionName('GR'))
    expect(regionName('UK')).toEqual(regionName('GB'))
    expect(regionName('US-CA')).toEqual('California')
    expect(regionName('CA-BC')).toEqual('British Columbia')
    expect(regionName('IN-AP')).toEqual('Andhra Pradesh')
    // expect(regionName('CN-AH')).toEqual('')
    expect(regionName('IE--MOSS')).toEqual('Ireland')
})

test('cross comparison against VATRates', () => {
    const copy = taxRatesEU
    // Insert an item that is missing from our code
    copy.IE.push('parking:13.5')

    expect(taxRatesFromVATRates()).toEqual(copy)
})

test('parsing', () => {
    let info = new TaxCodeInfo('AT:VAT:20')
    expect(info.authority).toEqual('AT')
    expect(info.geoParts).toEqual(['AT'])
    expect(info.authorityExtra).toEqual('')
    expect(info.type).toEqual('VAT')
    expect(info.reverse).toBeFalsy()
    expect(info.variable).toBeFalsy()
    expect(info.tag).toBeFalsy()
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('20')

    info = new TaxCodeInfo('IE:VAT;foo;ding;r:reduced:13.5')
    expect(info.authority).toEqual('IE')
    expect(info.geoParts).toEqual(['IE'])
    expect(info.authorityExtra).toEqual('')
    expect(info.type).toEqual('VAT')
    expect(info.reverse).toBeTruthy()
    expect(info.variable).toBeFalsy()
    expect(info.tag).toEqual('ding')
    expect(info.variant).toBe('reduced')
    expect(info.rate).toEqual('13.5')

    info = new TaxCodeInfo('IE--MOSS;FR:VAT;x:zero:0')
    expect(info.authority).toEqual('IE--MOSS')
    expect(info.geoParts).toEqual(['IE', ''])
    expect(info.authorityExtra).toEqual('FR')
    expect(info.type).toEqual('VAT')
    expect(info.reverse).toBeFalsy()
    expect(info.variable).toBeTruthy()
    expect(info.tag).toBeFalsy()
    expect(info.variant).toBe('zero')
    expect(info.rate).toEqual('0')

    info = new TaxCodeInfo('AU:GST;export:10')
    expect(info.authority).toEqual('AU')
    expect(info.geoParts).toEqual(['AU'])
    expect(info.authorityExtra).toEqual('')
    expect(info.type).toEqual('GST')
    expect(info.reverse).toBeFalsy()
    expect(info.variable).toBeFalsy()
    expect(info.tag).toEqual('export')
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('10')

    info = new TaxCodeInfo('')
    expect(info.authority).toEqual('')
    expect(info.geoParts).toEqual([''])
    expect(info.authorityExtra).toEqual('')
    expect(info.type).toEqual('')
    expect(info.reverse).toBeFalsy()
    expect(info.variable).toBeFalsy()
    expect(info.tag).toBeFalsy()
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('')
})

test('labels', () => {
    expect(new TaxCodeInfo('AT:VAT:20').label).toEqual('AT: VAT (standard) 20%')
    expect(new TaxCodeInfo('AT:VAT:reduced:10').label).toEqual('AT: VAT (reduced) 10%')
    expect(new TaxCodeInfo('AT:VAT:reduced:13').label).toEqual('AT: VAT (reduced) 13%')
    expect(new TaxCodeInfo('AT:VAT:parking:13').label).toEqual('AT: VAT (parking) 13%')
    expect(new TaxCodeInfo('FR:VAT:super-reduced:2.1').label).toEqual('FR: VAT (super reduced) 2.1%')

    expect(new TaxCodeInfo('EL:VAT:24').label).toEqual('EL: VAT (standard) 24%')
    expect(new TaxCodeInfo('UK:VAT:20').label).toEqual('UK: VAT (standard) 20%')

    expect(new TaxCodeInfo('IE:VAT:zero:0').label).toEqual('IE: VAT (zero-rated) 0%')
    expect(new TaxCodeInfo('IE:VAT;r:zero:0').label).toEqual('IE: VAT (reverse charge) 0%')

    expect(new TaxCodeInfo('AU:GST:10').label).toEqual('AU: GST 10%')
    expect(new TaxCodeInfo('AU:GST:zero:0').label).toEqual('AU: GST Free 0%')
    expect(new TaxCodeInfo('AU:GST:export:0').label).toEqual('AU: Export (GST Free) 0%')
    expect(new TaxCodeInfo('AU:GST:input:0').label).toEqual('AU: GST (input taxed) 0%')
    expect(new TaxCodeInfo('AU:GST:capital:10').label).toEqual('AU: GST (capital purchase) 10%')

    /*
    expect(new TaxCodeInfo('CA:GST:5').label).toEqual('Canada GST 5%')
    expect(new TaxCodeInfo('CA-PE:HST:15').label).toEqual('Prince Edward Island HST 15%')
    expect(new TaxCodeInfo('CA-QC:QST:9.975').label).toEqual('Quebec QST 9.975%')
    expect(new TaxCodeInfo('CA-SK:PST:6').label).toEqual('Saskatchewan PST 6%')

    expect(new TaxCodeInfo('US-CA:st;x:').label).toEqual('California Sales Tax')
    expect(new TaxCodeInfo('US-CA:st;x:7.25').label).toEqual('California Sales Tax 7.25%')

    expect(new TaxCodeInfo(':zero:0').label).toEqual('Zero rated 0%')
    expect(new TaxCodeInfo(':exempt:0').label).toEqual('Tax exempt 0%')

    expect(new TaxCodeInfo(':tax:').label).toEqual('tax')
    expect(new TaxCodeInfo(':TAX:').label).toEqual('TAX')
    // expect(new TaxCodeInfo(':Sales Tax;r:10.123')).toEqual('Sales Tax 10.123%')

    expect(new TaxCodeInfo('').label).toEqual('')
    expect(new TaxCodeInfo(':').label).toEqual('')
    expect(new TaxCodeInfo('::').label).toEqual('')
    expect(new TaxCodeInfo(':::').label).toEqual('')
*/
})

test('tax authorities default to disabled', () => {
    const t = new TaxAuthority('', '')
    expect(t.enable).toBeFalsy()
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

test('calculate tax with gross/net omissions', () => {
    expect(calculateTaxes({amount: 100000, useGross: 0, rates: ['#10']}))
        .toEqual({amount: 100000, taxes: [10000]})
    expect(calculateTaxes({amount: 100000, useGross: 0, rates: ['#5', '10']}))
        .toEqual({amount: 110000, taxes: [5000, 10000]})

    expect(calculateTaxes({amount: 100000, useGross: 1, rates: ['#10']}))
        .toEqual({amount: 100000, taxes: [10000]})
    expect(calculateTaxes({amount: 110000, useGross: 1, rates: ['#5', '10']}))
        .toEqual({amount: 100000, taxes: [5000, 10000]})
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
