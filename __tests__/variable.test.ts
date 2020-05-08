import { Variable, Project } from '../src/core'

beforeAll(() => {
    return Project.create(':memory:')
})

afterAll(() => {
    Project.knex.destroy()
    return Project.close()
})

test('Set and retrieve variables', async done => {
    await Variable.set('number', 1)
    expect(await Variable.get('number')).toBe(1)

    await Variable.set('number', 2)
    expect(await Variable.get('number')).toBe(2)

    await Variable.set('foo', 'bar')
    expect(await Variable.get('foo')).toBe('bar')

    await Variable.set('foo', 'baz')
    expect(await Variable.get('foo')).toBe('baz')

    const obj1 = {number: 1, foo: 'bar'}
    await Variable.set('obj', obj1)
    expect(await Variable.get('obj')).toEqual(obj1)

    const obj2 = {number: 2, foo: 'baz'}
    await Variable.set('obj', obj2)
    expect(await Variable.get('obj')).toEqual(obj2)

    // Retrieve non-existent variable
    expect(await Variable.get('does not exist')).toBeUndefined()

    done()
})

test('Retrieve multiple variables', async done => {
    await Variable.set('number', 1)
    expect(await Variable.get('number')).toBe(1)

    await Variable.set('foo', 'bar')
    expect(await Variable.get('foo')).toBe('bar')

    // getMultiple with array
    const data = await Variable.getMultiple(['number', 'foo'])
    expect(data.number).toBe(1)
    expect(data.foo).toBe('bar')

    // getMultiple with object
    const data2 = await Variable.getMultiple({number: undefined, foo: undefined})
    expect(data2.number).toBe(1)
    expect(data2.foo).toBe('bar')

    done()
})

test('Set multiple variables', async done => {
    await Variable.set('number', 1)
    expect(await Variable.get('number')).toBe(1)

    await Variable.set('foo', 'bar')
    expect(await Variable.get('foo')).toBe('bar')

    const obj = {number: 1, number2: 2, foo: 'baz', foo2: 'bar2'}
    await Variable.setMultiple(obj)

    const data = await Variable.getMultiple(Object.keys(obj))
    expect(data).toEqual(obj)

    done()
})
