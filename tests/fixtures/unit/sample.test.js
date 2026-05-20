describe('math', () => {
  test('adds numbers', () => {
    expect(1 + 1).toBe(2);
  });

  test('subtracts numbers', () => {
    expect(5 - 3).toBe(2);
  });
});

describe('strings', () => {
  test('concatenates', () => {
    expect('hello' + ' world').toBe('hello world');
  });
});
