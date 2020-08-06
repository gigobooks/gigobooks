import { Project, datePresetDates } from '../src/core'

beforeAll(async () => {
    await Project.create(':memory:')
    return Promise.resolve()
})

afterAll(() => {
    Project.knex.destroy()
    return Project.close()
})

test('date presets', async done => {
    const date = new Date(2020, 2, 2)       // 2nd March
    expect(datePresetDates('this-month', date)).toEqual(['2020-03-01', '2020-03-31'])
    expect(datePresetDates('prev-month', date)).toEqual(['2020-02-01', '2020-02-29'])
    expect(datePresetDates('this-quarter', date)).toEqual(['2020-01-01', '2020-03-31'])
    expect(datePresetDates('prev-quarter', date)).toEqual(['2019-10-01', '2019-12-31'])

    await Project.variables.set('fiscalYear', '0101')
    expect(datePresetDates('this-year', date)).toEqual(['2020-01-01', '2020-12-31'])
    expect(datePresetDates('prev-year', date)).toEqual(['2019-01-01', '2019-12-31'])

    await Project.variables.set('fiscalYear', '0104')
    expect(datePresetDates('this-year', date)).toEqual(['2019-04-01', '2020-03-31'])
    expect(datePresetDates('prev-year', date)).toEqual(['2018-04-01', '2019-03-31'])

    await Project.variables.set('fiscalYear', '0107')
    expect(datePresetDates('this-year', date)).toEqual(['2019-07-01', '2020-06-30'])
    expect(datePresetDates('prev-year', date)).toEqual(['2018-07-01', '2019-06-30'])

    await Project.variables.set('fiscalYear', '0110')
    expect(datePresetDates('this-year', date)).toEqual(['2019-10-01', '2020-09-30'])
    expect(datePresetDates('prev-year', date)).toEqual(['2018-10-01', '2019-09-30'])

    done()
})

test('date presets UK', async done => {
    await Project.variables.set('fiscalYear', '0604')

    const date1 = new Date(2020, 3, 2)       // 2nd April
    expect(datePresetDates('this-quarter', date1)).toEqual(['2020-01-06', '2020-04-05'])
    expect(datePresetDates('prev-quarter', date1)).toEqual(['2019-10-06', '2020-01-05'])
    expect(datePresetDates('this-year', date1)).toEqual(['2019-04-06', '2020-04-05'])
    expect(datePresetDates('prev-year', date1)).toEqual(['2018-04-06', '2019-04-05'])

    const date2 = new Date(2020, 3, 6)       // 6th April
    expect(datePresetDates('this-quarter', date2)).toEqual(['2020-04-06', '2020-07-05'])
    expect(datePresetDates('prev-quarter', date2)).toEqual(['2020-01-06', '2020-04-05'])
    expect(datePresetDates('this-year', date2)).toEqual(['2020-04-06', '2021-04-05'])
    expect(datePresetDates('prev-year', date2)).toEqual(['2019-04-06', '2020-04-05'])

    done()
})
