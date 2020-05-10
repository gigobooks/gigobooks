import { Variables, Project } from '../src/core'

let variables: Variables

const defaults = {
    'pi': 3.14
}

beforeAll(async () => {
    await Project.create(':memory:')
    variables = new Variables(Project.knex, defaults)
    return variables.init()
})

afterAll(() => {
    Project.knex.destroy()
    return Project.close()
})

test('Default and missing values', async done => {
    expect(variables.get('pi')).toBe(3.14)
    expect(await variables._get('pi')).toBe(3.14)

    await variables.set('pi', 3.14159)
    expect(variables.get('pi')).toBe(3.14159)
    expect(await variables._get('pi')).toBe(3.14159)

    expect(variables.get('does not exist')).toBeUndefined()

    done()
})

test('Set and retrieve variables', async done => {
    await variables.set('number', 1)
    expect(variables.get('number')).toBe(1)
    expect(await variables._get('number')).toBe(1)

    await variables.set('number', 2)
    expect(variables.get('number')).toBe(2)
    expect(await variables._get('number')).toBe(2)

    await variables.set('foo', 'bar')
    expect(variables.get('foo')).toBe('bar')
    expect(await variables._get('foo')).toBe('bar')

    await variables.set('foo', 'baz')
    expect(variables.get('foo')).toBe('baz')
    expect(await variables._get('foo')).toBe('baz')

    const obj1 = {number: 1, foo: 'bar'}
    await variables.set('obj', obj1)
    expect(variables.get('obj')).toEqual(obj1)
    expect(await variables._get('obj')).toEqual(obj1)

    const obj2 = {number: 2, foo: 'baz'}
    await variables.set('obj', obj2)
    expect(variables.get('obj')).toEqual(obj2)
    expect(await variables._get('obj')).toEqual(obj2)

    done()
})

test('Retrieve multiple variables', async done => {
    await variables.set('number', 1)
    expect(variables.get('number')).toBe(1)
    expect(await variables._get('number')).toBe(1)

    await variables.set('foo', 'bar')
    expect(variables.get('foo')).toBe('bar')
    expect(await variables._get('foo')).toBe('bar')

    // getMultiple with array
    const data0 = variables.getMultiple(['number', 'foo'])
    expect(data0.number).toBe(1)
    expect(data0.foo).toBe('bar')

    const data1 = await variables._getMultiple(['number', 'foo'])
    expect(data1.number).toBe(1)
    expect(data1.foo).toBe('bar')

    // getMultiple with object
    const data2 = variables.getMultiple({number: undefined, foo: undefined})
    expect(data2.number).toBe(1)
    expect(data2.foo).toBe('bar')

    const data3 = await variables._getMultiple({number: undefined, foo: undefined})
    expect(data3.number).toBe(1)
    expect(data3.foo).toBe('bar')

    done()
})

test('Set multiple variables', async done => {
    await variables.set('number', 1)
    expect(variables.get('number')).toBe(1)
    expect(await variables._get('number')).toBe(1)

    await variables.set('foo', 'bar')
    expect(variables.get('foo')).toBe('bar')
    expect(await variables._get('foo')).toBe('bar')

    const obj = {number: 1, number2: 2, foo: 'baz', foo2: 'bar2'}
    await variables.setMultiple(obj)

    const data = variables.getMultiple(Object.keys(obj))
    expect(data).toEqual(obj)

    const data1 = await variables.getMultiple(Object.keys(obj))
    expect(data1).toEqual(obj)

    done()
})
