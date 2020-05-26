/**
Breakdown of tax codes

A tax code comprises a tuple (colon delimited) of 3 or 4 parts:

[geography]:<type[;modifiers]>:[rate]
[geography]:<type[;modifiers]>:[variant]:[rate]

The `geography` loosely denotes the geographical area in a hierarchical form
(hyphen delimited) ie. `EU-AT`, `AU`, `US-CA`, `CA-BC`, `IN-AP`, `CN-AH`.

Country indicators are either EU VAT codes or ISO 3166-1 ish.
State or subdivision indicators are ISO 3166-2-ish.

The second field itself is also a tuple (semi-colon delimited) of 1 or 2 parts:

<type>[;modifiers]

where `type` is one of the following: `GST`, `VAT`, `st` ((US state) sales tax), `ut` ((US state) use tax) and some others.

The only modifier (so far) is 'r' which indicates a reverse charge (ie. EU reverse charge). However, it also applies to US state 'Use tax' which works in a similar way to EU reverse charge.

The `variant` field is for EU VAT and is one of the following: `reduced`, `super-reduced`, `parking`. If `variant` is missing, then it the standard VAT rate is presumed. Generally, `variant` is used to handle multiple tax rates.

The `rate` field is the tax rate percentage in string form, and can include up to three decimal places. This field can be empty.

Examples:

`EU-AT:VAT:20` - Austria VAT standard rate of 20%
`EU-AT:VAT:reduced:10` - Austria VAT reduced rate of 10%
`EU-AT:VAT:reduced:13` - Austria VAT reduced rate of 13%
`EU-AT:VAT:parking:13` - Austria VAT parking rate of 13%
`EU-FR:VAT:super-reduced:2.1` - France VAT super-reduced rate of 2.1%

'EU-EL:VAT:24` - Greece VAT standard rate of 24% (Non-standard country code)
'EU-UK:VAT:20` - UK VAT standard rate of 20% (Non-standard country code)

`EU-FR:VAT;r:20` - France VAT standard rate of 20% (when applying a reverse charge on self)
`EU-FR:VAT;r:super-reduced:2.1` - France VAT super-reduced rate of 2.1% (when applying a reverse charge on self)

`AU:GST:10` - Australia GST rate of 10%
`US-CA:st:` - US California sales tax. Rate not specified
`US-CA:st:7.25` - US California state tax of 7.25%
`US-CA:ut:7.25` - US California use tax of 7.25% (applied on self)

`CA:GST:5` - Canada GST rate of 5%
`CA-BC:PST:7` - Canada British Columbia PST rate of 7%
`CA-MB:RST:7` - Canada British Columbia RST rate of 7%
`CA-ON:HST:13` - Canada Ontario HST of 13%
`CA-QC:QST:9.975` - Canada Quebec QST of 9.975%

There are also some special tax codes:

`EU:VAT;r:0` - EU VAT reverse charge (for B2B customers)
`:zero:0` - GST/VAT zero rated, or just zero tax
`:exempt:0` - tax exempt

Notice that `geography` is undefined for zero-rated and exempt codes.
*/

var iso3166 = require('iso-3166-2')

// Tax rates are represented as thousandth's of a percentage point
const TaxRateScale = 1000

type TaxCodeInfo = {
    code: string
    geography: string
    geoParts: string[]
    type: string
    typeParts: string[]
    variant: string
    rate: string    // Tax rate percentage as a string. Up to three decimal places
    rate000: number // Tax rate percentage multiplied by 1000 (as a number)
    reverse: boolean    // True if this is EU reverse charge
    label: string
}
type TaxCodeInfoPartial = Omit<TaxCodeInfo, 'label'>

export function taxCodeInfo(code: string): TaxCodeInfo {
    const parts = code.split(':')
    const info: any = {
        code,
        geography: parts.length < 1 ? '' : parts[0],
        type: parts.length < 2 ? '' : parts[1],
        variant: (parts.length < 4) ? '' : parts[2],
        rate: parts[parts.length - 1],
    }
    info.geoParts = info.geography.split('-')
    info.typeParts = info.type.split(';')
    info.rate000 = parseFloat(info.rate) * TaxRateScale
    info.reverse = info.typeParts.length > 1 && info.typeParts[1] == 'r'
    info.label = makeLabel(info)

    return info
}

function makeLabel(info: TaxCodeInfoPartial): string {
    const parts: string[] = []

    let country, subdivision
    if (info.geoParts[0] == 'EU') {
        country = info.geoParts[1]
        if (info.geoParts.length > 2) {
            subdivision = info.geoParts[2]
        }

        if (country == 'EL') {
            // EL is the VAT country code for Greece
            country = 'GR'
        }
        else if (country == 'UK') {
            // UK is the VAT country code for Great Britain
            country = 'GB'
        }
    }
    else {
        country = info.geoParts[0]
        if (info.geoParts.length > 1) {
            subdivision = info.geoParts[1]
        }
    }

    if (country) {
        const countryInfo = iso3166.country(country)
        if (countryInfo) {
            let name = countryInfo.name

            if (subdivision) {
                const subdivisionInfo = iso3166.subdivision(country, subdivision)
                if (subdivisionInfo) {
                    name = `(${name}) ${subdivisionInfo.name}`
                }
            }
            parts.push(name)
        }
    }

    switch (info.typeParts[0]) {
        case 'zero': parts.push('Zero rated'); break
        case 'exempt': parts.push('Tax exempt'); break
        case 'st': parts.push('Sales Tax'); break
        case 'ut': parts.push('Use Tax'); break
        default: parts.push(info.typeParts[0])
    }

    if (info.geoParts[0] == 'EU' && info.reverse) {
        parts.push('reverse charged')
    }

    if (info.variant) {
        switch (info.variant) {
            case 'super-reduced': parts.push('(super reduced)'); break
            // case 'reduced':
            // case 'parking':
            default: parts.push(`(${info.variant})`)
        }
    }

    if (info.rate) {
        parts.push(info.rate + '%')
    }

    return parts.join(' ')
}

export function taxCodesEU(homeCountryCode = '') {
    const data: Record<string, string[]> = {
        AT: ['20', 'reduced:10', 'reduced:13', 'parking:13'],
        BE: ['21', 'reduced:6', 'reduced:12', 'parking:12'],
        BG: ['20', 'reduced:9'],
        HR: ['25', 'reduced:5', 'reduced:13'],
        CY: ['19', 'reduced:5', 'reduced:9'],
        CZ: ['21', 'reduced:10', 'reduced:15'],
        DK: ['25'],
        EE: ['20', 'reduced:9'],
        DE: ['19', 'reduced:7'],
        EL: ['24', 'reduced:6', 'reduced:13'],
        FI: ['24', 'reduced:10', 'reduced:14'],
        FR: ['20', 'reduced:5.5', 'reduced:10', 'super-reduced:2.1'],
        HU: ['27', 'reduced:5', 'reduced:18'],
        IE: ['23', 'reduced:9', 'reduced:13.5', 'super-reduced:4.8', 'parking:13.5'],
        IT: ['22', 'reduced:5', 'reduced:10', 'super-reduced:4'],
        LV: ['21', 'reduced:12', 'super-reduced:5'],
        LT: ['21', 'reduced:5', 'reduced:9'],
        LU: ['17', 'reduced:8', 'super-reduced:3', 'parking:14'],
        MT: ['18', 'reduced:5', 'reduced:7'],
        NL: ['21', 'reduced:9'],
        PL: ['23', 'reduced:5', 'reduced:8'],
        PT: ['23', 'reduced:6', 'reduced:13', 'parking:13'],
        RO: ['19', 'reduced:5', 'reduced:9'],
        SK: ['20', 'reduced:10'],
        SI: ['22', 'reduced:9.5'],
        ES: ['21', 'reduced:10', 'super-reduced:4'],
        SE: ['25', 'reduced:6', 'reduced:12'],
        UK: ['20', 'reduced:5'],
    }
    const codes: string[] = ['EU:VAT;r:0']
    const homeVATCode = homeCountryCode == 'GR' ? 'EL' : 
                        homeCountryCode == 'GB' ? 'UK' : homeCountryCode

    if (data[homeVATCode]) {
        data[homeVATCode].forEach(suffix => {
            codes.push(`EU-${homeVATCode}:VAT;r:${suffix}`)
        })
    }

    Object.keys(data).forEach(cc => {
        data[cc].forEach(suffix => {
            codes.push(`EU-${cc}:VAT:${suffix}`)
        })
    })

    return codes
}

export function taxCodesUS(regionCode = '') {
    const data: Record<string, string> = {
        AL: '4', AZ: '5.6', AR: '6.5', CA: '7.25', CO: '2.9', CT: '6.35',
        FL: '6', GA: '4', HI: '4.166', ID: '6', IL: '6.25', IN: '7',
        IA: '6', KS: '6.5', KY: '6', LA: '4.45', ME: '5.5', MD: '6',
        MA: '6.25', MI: '6', MN: '6.875', MS: '7', MO: '4.225', NE: '5.5', 
        NV: '6.85', NJ: '6.625', NM: '5.125', NY: '4', NC: '4.75', ND: '5', 
        OH: '5.75', OK: '4.5', PA: '6', RI: '7', SC: '6', SD: '4',
        TN: '7', TX: '6.25', UT: '5.95', VT: '6', VA: '5.3', WA: '6.5',
        WV: '6', WI: '5', WY: '4', DC: '5.75',
        GU: '4', PR: '10.5',
    }

    const codes: string[] = []

    Object.keys(data).forEach(ss => {
        codes.push(`US-${ss}:st:${data[ss]}`)
    })

    if (data[regionCode]) {
        codes.push(`US-${regionCode}:ut;r:${data[regionCode]}`)
    }

    return codes
}

export function taxCodesOther(subdivision = '') {
    return [
        ':zero:0',
        ':exempt:0',
        'AU:GST:10',
        'CA:GST:5',
        // 'CA-AB',
        'CA-BC:PST:7',
        'CA-MB:RST:7',
        'CA-NB:HST:15' ,
        'CA-NL:HST:15' ,
        'CA-NS:HST:15' ,
        'CA-ON:HST:13' ,
        'CA-PE:HST:15' ,
        'CA-QC:QST:9.975',
        'CA-SK:PST:6',
        // 'CA-NT',
        // 'CA-NU',
        // 'CA-YT',
    ]
}

export function taxCodes(subdivision = '') {
    const [countryCode, regionCode] = subdivision.split('-')
    const codes = [
        ...taxCodesEU(countryCode),
        ...taxCodesUS(regionCode),
        ...taxCodesOther(),
    ]

    return codes.map(code => taxCodeInfo(code))
}

export function taxRate(code: string) {
    return taxCodeInfo(code).rate
}

export function taxLabel(code: string) {
    return taxCodeInfo(code).label
}
