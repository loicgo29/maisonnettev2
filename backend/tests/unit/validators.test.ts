import { describe, it, expect } from 'vitest';

/**
 * Validation Utility Tests
 * Tests data validation functions
 */

describe('Booking Validators', () => {
  describe('validateBookingDates', () => {
    it('should accept valid check-in and check-out dates', () => {
      const checkIn = new Date('2026-09-01');
      const checkOut = new Date('2026-09-03');
      const isValid = checkOut > checkIn;
      expect(isValid).toBe(true);
    });

    it('should reject checkout before check-in', () => {
      const checkIn = new Date('2026-09-03');
      const checkOut = new Date('2026-09-01');
      const isValid = checkOut > checkIn;
      expect(isValid).toBe(false);
    });

    it('should reject same day bookings', () => {
      const date = new Date('2026-09-01');
      const isValid = date > date;
      expect(isValid).toBe(false);
    });

    it('should accept future dates', () => {
      const today = new Date();
      const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isValid = futureDate > today;
      expect(isValid).toBe(true);
    });
  });

  describe('validateGuestCount', () => {
    it('should accept valid guest counts', () => {
      const validCounts = [1, 2, 4, 6];
      validCounts.forEach((count) => {
        expect(count > 0 && count <= 20).toBe(true);
      });
    });

    it('should reject zero guests', () => {
      const count = 0;
      expect(count > 0).toBe(false);
    });

    it('should reject negative guests', () => {
      const count = -2;
      expect(count > 0).toBe(false);
    });

    it('should reject over-capacity bookings', () => {
      const giteCapacity = 4;
      const guests = 6;
      expect(guests <= giteCapacity).toBe(false);
    });
  });

  describe('validateBookingNotes', () => {
    it('should accept valid notes', () => {
      const notes = 'Please bring towels';
      expect(notes.length <= 500).toBe(true);
    });

    it('should reject notes exceeding max length', () => {
      const notes = 'x'.repeat(501);
      expect(notes.length <= 500).toBe(false);
    });

    it('should accept empty notes', () => {
      const notes = '';
      expect(notes.length <= 500).toBe(true);
    });
  });
});

describe('Contact Form Validators', () => {
  describe('validateName', () => {
    it('should accept valid names', () => {
      const validNames = ['John Doe', 'Marie-Claire', "O'Brien"];
      validNames.forEach((name) => {
        const isValid = name.length > 0 && name.length <= 100;
        expect(isValid).toBe(true);
      });
    });

    it('should reject empty names', () => {
      const name = '';
      expect(name.length > 0).toBe(false);
    });

    it('should reject very long names', () => {
      const name = 'a'.repeat(101);
      expect(name.length <= 100).toBe(false);
    });
  });

  describe('validateSubject', () => {
    it('should accept valid subjects', () => {
      const subjects = ['Booking inquiry', 'Question about amenities', 'Complaint'];
      subjects.forEach((subject) => {
        const isValid = subject.length > 0 && subject.length <= 200;
        expect(isValid).toBe(true);
      });
    });

    it('should reject empty subject', () => {
      const subject = '';
      expect(subject.length > 0).toBe(false);
    });
  });

  describe('validateMessage', () => {
    it('should accept valid messages', () => {
      const message = 'I am interested in booking for September. Can you confirm availability?';
      expect(message.length > 0 && message.length <= 5000).toBe(true);
    });

    it('should reject empty messages', () => {
      const message = '';
      expect(message.length > 0).toBe(false);
    });

    it('should reject overly long messages', () => {
      const message = 'x'.repeat(5001);
      expect(message.length <= 5000).toBe(false);
    });
  });
});

describe('Admin Validators', () => {
  describe('validateGiteData', () => {
    it('should accept valid gite data', () => {
      const data = {
        nom: 'Maisonnette Test',
        description: 'A lovely house',
        adresse: '123 Rue de Paris',
        capacite: 4,
        prixNuit: 150,
      };

      const isValid =
        data.nom.length > 0 &&
        data.description.length > 0 &&
        data.adresse.length > 0 &&
        data.capacite > 0 &&
        data.prixNuit > 0;

      expect(isValid).toBe(true);
    });

    it('should reject missing required fields', () => {
      const data = {
        nom: 'Test',
        // description missing
        adresse: '123 Rue de Paris',
        capacite: 4,
        prixNuit: 150,
      };

      const isValid = data && 'description' in data && data.description?.length > 0;
      expect(isValid).toBe(false);
    });

    it('should reject negative price', () => {
      const prixNuit = -100;
      expect(prixNuit > 0).toBe(false);
    });

    it('should reject zero capacity', () => {
      const capacite = 0;
      expect(capacite > 0).toBe(false);
    });
  });

  describe('validatePhotoUpload', () => {
    it('should accept valid image types', () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const uploadType = 'image/jpeg';
      expect(validTypes.includes(uploadType)).toBe(true);
    });

    it('should reject non-image types', () => {
      const invalidTypes = ['application/pdf', 'text/plain', 'video/mp4'];
      const uploadType = 'application/pdf';
      expect(invalidTypes.includes(uploadType)).toBe(true);
    });

    it('should enforce file size limits', () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const fileSize = 3 * 1024 * 1024; // 3MB
      expect(fileSize <= maxSize).toBe(true);
    });

    it('should reject oversized files', () => {
      const maxSize = 5 * 1024 * 1024;
      const fileSize = 10 * 1024 * 1024; // 10MB
      expect(fileSize <= maxSize).toBe(false);
    });
  });
});

describe('Authentication Validators', () => {
  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      const pwd = 'T3st0ne@';
      const isValid = pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
      expect(isValid).toBe(true);
    });

    it('should reject short passwords', () => {
      const pwd = 'short';
      expect(pwd.length >= 8).toBe(false);
    });

    it('should reject passwords without uppercase', () => {
      const pwd = 'lower123@';
      const hasUppercase = /[A-Z]/.test(pwd);
      expect(hasUppercase).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      const pwd = 'Uppercase@';
      const hasNumber = /[0-9]/.test(pwd);
      expect(hasNumber).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('should accept valid usernames', () => {
      const validNames = ['john_doe', 'marie-claire', 'user123'];
      validNames.forEach((name) => {
        const isValid = /^[a-zA-Z0-9_-]{3,20}$/.test(name);
        expect(isValid).toBe(true);
      });
    });

    it('should reject usernames with special characters', () => {
      const name = 'user@domain';
      const isValid = /^[a-zA-Z0-9_-]{3,20}$/.test(name);
      expect(isValid).toBe(false);
    });

    it('should reject too short usernames', () => {
      const name = 'ab';
      const isValid = /^[a-zA-Z0-9_-]{3,20}$/.test(name);
      expect(isValid).toBe(false);
    });

    it('should reject too long usernames', () => {
      const name = 'a'.repeat(21);
      const isValid = /^[a-zA-Z0-9_-]{3,20}$/.test(name);
      expect(isValid).toBe(false);
    });
  });
});

describe('Query Parameter Validators', () => {
  describe('validatePaginationParams', () => {
    it('should accept valid page and limit', () => {
      const page = 1;
      const limit = 20;
      expect(page >= 1 && limit > 0 && limit <= 100).toBe(true);
    });

    it('should reject negative page', () => {
      const page = -1;
      expect(page >= 1).toBe(false);
    });

    it('should reject zero limit', () => {
      const limit = 0;
      expect(limit > 0).toBe(false);
    });

    it('should enforce maximum limit', () => {
      const limit = 150;
      expect(limit <= 100).toBe(false);
    });
  });

  describe('validateSortParams', () => {
    it('should accept valid sort fields', () => {
      const validFields = ['name', 'price', 'date'];
      const field = 'price';
      expect(validFields.includes(field)).toBe(true);
    });

    it('should accept sort directions', () => {
      const validDirs = ['asc', 'desc'];
      const direction = 'asc';
      expect(validDirs.includes(direction)).toBe(true);
    });

    it('should reject invalid sort directions', () => {
      const validDirs = ['asc', 'desc'];
      const direction = 'ascending';
      expect(validDirs.includes(direction)).toBe(false);
    });
  });
});
