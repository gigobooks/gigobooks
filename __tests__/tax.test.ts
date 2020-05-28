var VATRates = require('vatrates')
import { taxCodeInfo, taxCodes, taxCodesOther, taxCodesUS, taxCodesEU,
    taxLabel, taxCodeWithRate, calculateTaxes } from '../src/core/tax'

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
        /*
        if (data.countryCode == homeCountryCode) {
            process(data.periods[0].rates, ';r')
        }
        */
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
    taxCodesEU('').forEach(code => {
        taxLabeslsEU[code] = taxLabel(code)
    })
    expect(taxLabelsFromVATRates).toEqual(taxLabeslsEU)

    taxLabelsFromVATRates = {}
    taxLabeslsEU = {}
    taxCodesFromVATRates('AT').forEach(code => {
        taxLabelsFromVATRates[code] = taxLabel(code)
    })
    taxCodesEU('AT').forEach(code => {
        taxLabeslsEU[code] = taxLabel(code)
    })
    expect(taxLabelsFromVATRates).toEqual(taxLabeslsEU)

    taxLabelsFromVATRates = {}
    taxLabeslsEU = {}
    taxCodesFromVATRates('GR').forEach(code => {
        taxLabelsFromVATRates[code] = taxLabel(code)
    })
    taxCodesEU('GR').forEach(code => {
        taxLabeslsEU[code] = taxLabel(code)
    })
    expect(taxLabelsFromVATRates).toEqual(taxLabeslsEU)

    taxLabelsFromVATRates = {}
    taxLabeslsEU = {}
    taxCodesFromVATRates('GB').forEach(code => {
        taxLabelsFromVATRates[code] = taxLabel(code)
    })
    taxCodesEU('GB').forEach(code => {
        taxLabeslsEU[code] = taxLabel(code)
    })
    expect(taxLabelsFromVATRates).toEqual(taxLabeslsEU)
})

test('common tax codes', () => {
    const codesUSCA = taxCodesUS('CA')
    ;['US-MA:st:6.25', 'US-CA:st:7.25', /*'US-CA:ut;r:7.25'*/].forEach(item => {
        expect(codesUSCA).toContain(item)
    })

    const codesOther = taxCodesOther()
    ;[
        'AU:GST:10',
        'CA:GST:5',
        'CA-BC:PST:7',
    ].forEach(item => {
        expect(codesOther).toContain(item)
    })
})

test('parsing', () => {
    let info = taxCodeInfo('EU-AT:VAT:20')
    expect(info.geoParts).toEqual(['EU', 'AT'])
    expect(info.typeParts).toEqual(['VAT'])
    expect(info.variant).toBe('')
    expect(info.rate).toEqual('20')
    expect(info.reverse).toBeFalsy()

    /*
    info = taxCodeInfo('EU-FR:VAT;r:super-reduced:2.1')
    expect(info.geoParts).toEqual(['EU', 'FR'])
    expect(info.typeParts).toEqual(['VAT', 'r'])
    expect(info.variant).toBe('super-reduced')
    expect(info.rate).toEqual('2.1')
    expect(info.reverse).toBeTruthy()
    */

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
    // expect(taxLabel('EU-FR:VAT;r:20')).toEqual('France VAT reverse charged 20%')
    // expect(taxLabel('EU-FR:VAT;r:super-reduced:2.1')).toEqual('France VAT reverse charged (super reduced) 2.1%')

    expect(taxLabel('AU:GST:10')).toEqual('Australia GST 10%')
    expect(taxLabel('CA:GST:5')).toEqual('Canada GST 5%')
    expect(taxLabel('CA-PE:HST:15')).toEqual('(Canada) Prince Edward Island HST 15%')
    expect(taxLabel('CA-QC:QST:9.975')).toEqual('(Canada) Quebec QST 9.975%')
    expect(taxLabel('CA-SK:PST:6')).toEqual('(Canada) Saskatchewan PST 6%')

    expect(taxLabel('US-CA:st:')).toEqual('(United States) California Sales Tax')
    expect(taxLabel('US-CA:st:7.25')).toEqual('(United States) California Sales Tax 7.25%')
    expect(taxLabel('US-MA:ut:')).toEqual('(United States) Massachusetts Use Tax')
    expect(taxLabel('US-MA:ut:6.25')).toEqual('(United States) Massachusetts Use Tax 6.25%')

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

test.only('taxCodeWithRate', () => {
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
