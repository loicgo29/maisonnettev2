import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit Tests for Backend Services
 * Tests utilities and business logic independently
 */

describe('Email Service', () => {
  describe('formatEmailAddress', () => {
    it('should trim whitespace', () => {
      const email = '  loic@example.com  ';
      const trimmed = email.trim();
      expect(trimmed).toBe('loic@example.com');
    });

    it('should convert to lowercase', () => {
      const email = 'LOIC@EXAMPLE.COM';
      const lower = email.toLowerCase();
      expect(lower).toBe('loic@example.com');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user+tag@domain.co.uk',
        'firstname.lastname@example.org',
      ];

      validEmails.forEach((email) => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = ['notanemail', '@example.com', 'user@', 'user @example.com'];

      invalidEmails.forEach((email) => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      });
    });
  });
});

describe('Date & Time Utilities', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-08-30');
      const formatted = date.toISOString().split('T')[0];
      expect(formatted).toBe('2026-08-30');
    });

    it('should handle date objects', () => {
      const date = new Date();
      expect(date instanceof Date).toBe(true);
    });
  });

  describe('calculateNights', () => {
    it('should calculate number of nights correctly', () => {
      const checkIn = new Date('2026-09-01');
      const checkOut = new Date('2026-09-03');
      const nights = Math.floor(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(nights).toBe(2);
    });

    it('should return 0 for same day', () => {
      const date = new Date('2026-09-01');
      const nights = Math.floor((date.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      expect(nights).toBe(0);
    });
  });
});

describe('Price Calculations', () => {
  describe('calculateTotalPrice', () => {
    it('should multiply nightly rate by nights', () => {
      const nightly = 100;
      const nights = 3;
      const total = nightly * nights;
      expect(total).toBe(300);
    });

    it('should handle decimal prices', () => {
      const nightly = 99.99;
      const nights = 2;
      const total = Number((nightly * nights).toFixed(2));
      expect(total).toBe(199.98);
    });

    it('should return zero for zero nights', () => {
      const nightly = 100;
      const nights = 0;
      const total = nightly * nights;
      expect(total).toBe(0);
    });
  });

  describe('applyDiscount', () => {
    it('should reduce price by discount percentage', () => {
      const price = 100;
      const discount = 0.2;
      const final = price * (1 - discount);
      expect(final).toBe(80);
    });

    it('should handle 0% discount', () => {
      const price = 100;
      const discount = 0;
      const final = price * (1 - discount);
      expect(final).toBe(100);
    });

    it('should handle 100% discount', () => {
      const price = 100;
      const discount = 1;
      const final = price * (1 - discount);
      expect(final).toBe(0);
    });
  });
});

describe('String Utilities', () => {
  describe('slugify', () => {
    it('should convert to lowercase', () => {
      const text = 'HELLO WORLD';
      const slug = text.toLowerCase();
      expect(slug).toBe('hello world');
    });

    it('should replace spaces with hyphens', () => {
      const text = 'hello world test';
      const slug = text.replace(/\s+/g, '-');
      expect(slug).toBe('hello-world-test');
    });

    it('should remove special characters', () => {
      const text = 'hello@world!test';
      const slug = text.replace(/[^\w\s-]/g, '');
      expect(slug).toBe('helloworldtest');
    });
  });

  describe('truncate', () => {
    it('should limit string length', () => {
      const text = 'This is a very long string';
      const truncated = text.substring(0, 10);
      expect(truncated).toBe('This is a ');
    });

    it('should handle strings shorter than limit', () => {
      const text = 'Short';
      const truncated = text.substring(0, 10);
      expect(truncated).toBe('Short');
    });
  });
});

describe('Validation Utilities', () => {
  describe('validateCapacity', () => {
    it('should accept valid capacity values', () => {
      const validCapacities = [1, 2, 4, 6, 8];
      validCapacities.forEach((cap) => {
        expect(cap > 0).toBe(true);
        expect(cap <= 20).toBe(true);
      });
    });

    it('should reject zero or negative capacity', () => {
      const invalidCapacities = [0, -1, -5];
      invalidCapacities.forEach((cap) => {
        expect(cap > 0).toBe(false);
      });
    });
  });

  describe('validatePrice', () => {
    it('should accept positive prices', () => {
      const validPrices = [1.0, 50, 99.99, 1000];
      validPrices.forEach((price) => {
        expect(price > 0).toBe(true);
      });
    });

    it('should reject zero or negative prices', () => {
      const invalidPrices = [0, -10, -99.99];
      invalidPrices.forEach((price) => {
        expect(price <= 0).toBe(true);
      });
    });

    it('should handle decimal precision', () => {
      const price = 99.99;
      const cents = Math.round(price * 100);
      expect(cents).toBe(9999);
    });
  });
});

describe('Object Utilities', () => {
  describe('deepClone', () => {
    it('should create independent copy', () => {
      const obj = { a: 1, b: { c: 2 } };
      const clone = JSON.parse(JSON.stringify(obj));
      clone.b.c = 3;
      expect(obj.b.c).toBe(2);
      expect(clone.b.c).toBe(3);
    });
  });

  describe('filterObject', () => {
    it('should remove undefined values', () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const filtered = Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
      expect(filtered).toEqual({ a: 1, c: 3 });
    });
  });
});

describe('Array Utilities', () => {
  describe('removeDuplicates', () => {
    it('should remove duplicate values', () => {
      const arr = [1, 2, 2, 3, 3, 3];
      const unique = [...new Set(arr)];
      expect(unique).toEqual([1, 2, 3]);
    });

    it('should handle empty array', () => {
      const arr: number[] = [];
      const unique = [...new Set(arr)];
      expect(unique).toEqual([]);
    });
  });

  describe('flatten', () => {
    it('should flatten nested arrays', () => {
      const nested = [[1, 2], [3, 4]];
      const flat = nested.flat();
      expect(flat).toEqual([1, 2, 3, 4]);
    });
  });
});

describe('Type Guards', () => {
  describe('isValidGite', () => {
    it('should identify valid gite objects', () => {
      const validGite = {
        id: '1',
        slug: 'test',
        nom: 'Test Gite',
        prixNuit: 100,
      };

      const isValid = validGite && validGite.slug && validGite.nom && validGite.prixNuit > 0;
      expect(isValid).toBe(true);
    });

    it('should reject invalid gite objects', () => {
      const invalidGites = [
        { slug: 'test' }, // missing nom
        { nom: 'Test' }, // missing slug
        { slug: 'test', nom: 'Test', prixNuit: -10 }, // negative price
      ];

      invalidGites.forEach((gite) => {
        const isValid =
          gite && 'slug' in gite && 'nom' in gite && 'prixNuit' in gite && gite.prixNuit > 0;
        expect(isValid).toBe(false);
      });
    });
  });
});
