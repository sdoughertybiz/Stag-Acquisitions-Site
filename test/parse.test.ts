import { describe, expect, it } from 'vitest';
import {
  collapse,
  digitsOf,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  parseAddress,
  splitName,
} from '../src/lib/parse';

describe('collapse', () => {
  it('trims and squeezes whitespace', () => {
    expect(collapse('  Stephen   Dougherty \n')).toBe('Stephen Dougherty');
  });

  it('handles nullish input', () => {
    expect(collapse(undefined as unknown as string)).toBe('');
  });
});

describe('splitName', () => {
  it('splits a two-part name', () => {
    expect(splitName('Stephen Dougherty')).toEqual({
      firstName: 'Stephen',
      lastName: 'Dougherty',
    });
  });

  it('keeps everything after the first token as the last name', () => {
    expect(splitName('Maria Van Der Berg')).toEqual({
      firstName: 'Maria',
      lastName: 'Van Der Berg',
    });
    expect(splitName('John Smith Jr.')).toEqual({ firstName: 'John', lastName: 'Smith Jr.' });
  });

  it('returns an empty last name for a single token', () => {
    expect(splitName('Cher')).toEqual({ firstName: 'Cher', lastName: '' });
  });

  it('returns empties for blank input', () => {
    expect(splitName('   ')).toEqual({ firstName: '', lastName: '' });
  });
});

describe('normalizePhone', () => {
  it('formats a 10-digit US number', () => {
    expect(normalizePhone('6155551234')).toBe('(615) 555-1234');
    expect(normalizePhone('615-555-1234')).toBe('(615) 555-1234');
    expect(normalizePhone('615.555.1234')).toBe('(615) 555-1234');
  });

  it('strips a leading country code', () => {
    expect(normalizePhone('+1 (615) 555-1234')).toBe('(615) 555-1234');
    expect(normalizePhone('16155551234')).toBe('(615) 555-1234');
  });

  it('passes unrecognized formats through unchanged', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
    expect(normalizePhone('call me')).toBe('call me');
  });
});

describe('isValidPhone', () => {
  it('accepts 10- and 11-digit US numbers', () => {
    expect(isValidPhone('(615) 555-1234')).toBe(true);
    expect(isValidPhone('1 615 555 1234')).toBe(true);
  });

  it('accepts international numbers written with a plus', () => {
    expect(isValidPhone('+44 20 7946 0958')).toBe(true);
  });

  it('rejects short or empty numbers', () => {
    expect(isValidPhone('555-1234')).toBe(false);
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('abc')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('stephen@sellnowpros.com')).toBe(true);
    expect(isValidEmail('first.last+tag@sub.example.co.uk')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['', 'nope', 'a@b', 'a b@c.com', '@example.com', 'a@@b.com']) {
      expect(isValidEmail(bad), bad).toBe(false);
    }
  });
});

describe('digitsOf', () => {
  it('keeps only digits', () => {
    expect(digitsOf('+1 (615) 555-1234')).toBe('16155551234');
  });
});

describe('parseAddress', () => {
  it('parses the canonical four-part form', () => {
    expect(parseAddress('123 Main St, Nashville, TN 37205')).toMatchObject({
      street: '123 Main St',
      city: 'Nashville',
      state: 'TN',
      code: '37205',
    });
  });

  it('parses a fully comma-separated address', () => {
    expect(parseAddress('4501 Harding Pike, Nashville, TN, 37205')).toMatchObject({
      street: '4501 Harding Pike',
      city: 'Nashville',
      state: 'TN',
      code: '37205',
    });
  });

  it('handles a unit number in the street', () => {
    expect(parseAddress('900 20th Ave S, Apt 4B, Nashville, TN 37212')).toMatchObject({
      street: '900 20th Ave S, Apt 4B',
      city: 'Nashville',
      state: 'TN',
      code: '37212',
    });
  });

  it('handles a full state name', () => {
    expect(parseAddress('12 Queens Rd, Charlotte, North Carolina 28204')).toMatchObject({
      city: 'Charlotte',
      state: 'NC',
      code: '28204',
    });
  });

  it('handles ZIP+4', () => {
    expect(parseAddress('123 Main St, Nashville, TN 37205-1234').code).toBe('37205-1234');
  });

  it('drops a trailing country', () => {
    expect(parseAddress('123 Main St, Nashville, TN 37205, USA')).toMatchObject({
      street: '123 Main St',
      city: 'Nashville',
      state: 'TN',
      code: '37205',
    });
  });

  it('keeps an unparseable address in the street field', () => {
    const parsed = parseAddress('the blue house behind the church');
    expect(parsed.street).toBe('the blue house behind the church');
    expect(parsed.city).toBe('');
    expect(parsed.state).toBe('');
  });

  it('treats a lone city fragment as a city, not a street', () => {
    expect(parseAddress('Nashville, TN 37205')).toMatchObject({
      street: '',
      city: 'Nashville',
      state: 'TN',
      code: '37205',
    });
  });

  it('always preserves the raw input', () => {
    const input = '  123   Main St,Nashville , TN 37205 ';
    expect(parseAddress(input).raw).toBe('123 Main St, Nashville, TN 37205');
  });

  it('does not mistake a two-letter word for a state', () => {
    // "Ln" is not a state abbreviation, so it stays in the street.
    expect(parseAddress('55 Oak Ln, Franklin, TN 37064')).toMatchObject({
      street: '55 Oak Ln',
      city: 'Franklin',
      state: 'TN',
    });
  });

  it('returns empty fields for blank input', () => {
    expect(parseAddress('')).toEqual({ street: '', city: '', state: '', code: '', raw: '' });
  });
});
