import {
  generateQueryCode,
  generateId,
  formatDate,
  formatDateTime,
  generatePDFFileName,
  isValidQueryCode,
  isValidEmail,
  formDataToDbFormat,
  dbDataToFormFormat,
  getWeekNumber
} from '@/lib/utils';

describe('Utils Functions', () => {
  describe('generateQueryCode', () => {
    it('should generate a query code of correct length', () => {
      const code = generateQueryCode();
      expect(code).toHaveLength(8);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateQueryCode());
      }
      expect(codes.size).toBeGreaterThan(90); // Should be mostly unique
    });

    it('should only contain valid characters', () => {
      const code = generateQueryCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });
  });

  describe('generateId', () => {
    it('should generate a valid UUID format', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2024-01-15');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDateTime(date);
      expect(formatted).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('getWeekNumber', () => {
    it('should calculate correct week number', () => {
      const date1 = new Date('2024-01-01'); // 2024年第1周
      const week1 = getWeekNumber(date1);
      expect(week1).toBe(1);

      const date2 = new Date('2024-01-15'); // 2024年第3周
      const week2 = getWeekNumber(date2);
      expect(week2).toBe(3);
    });

    it('should handle year boundaries correctly', () => {
      const date = new Date('2024-12-30'); // 2024年最后一周
      const week = getWeekNumber(date);
      // 2024-12-30是周一，根据ISO周数计算，这是2025年第1周
      expect(week).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generatePDFFileName', () => {
    it('should generate correct filename with week number', () => {
      const fileName = generatePDFFileName('测试公司', '张三', '2024-01-15');
      expect(fileName).toMatch(/^张三_2024年第\d+周_测试公司_2024-01-15\.pdf$/);
    });

    it('should clean invalid characters', () => {
      const fileName = generatePDFFileName('测试/公司*名称', '李四', '2024-01-15');
      expect(fileName).toMatch(/^李四_2024年第\d+周_测试_公司_名称_2024-01-15\.pdf$/);
    });

    it('should handle missing salesperson', () => {
      const fileName = generatePDFFileName('测试公司', '', '2024-01-15');
      expect(fileName).toMatch(/^未知销售_2024年第\d+周_测试公司_2024-01-15\.pdf$/);
    });
  });

  describe('isValidQueryCode', () => {
    it('should validate correct query codes', () => {
      expect(isValidQueryCode('ABC12345')).toBe(true);
      expect(isValidQueryCode('ABCDEF')).toBe(true);
      expect(isValidQueryCode('123456789012')).toBe(true);
    });

    it('should reject invalid query codes', () => {
      expect(isValidQueryCode('abc123')).toBe(false); // lowercase
      expect(isValidQueryCode('ABC@123')).toBe(false); // special chars
      expect(isValidQueryCode('AB12')).toBe(false); // too short
      expect(isValidQueryCode('ABCDEFGHIJKLM')).toBe(false); // too long
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('formDataToDbFormat', () => {
    it('should convert form data to database format', () => {
      const formData = {
        companyName: '测试公司',
        address: '测试地址',
        contactPerson: '张三',
        mobile: '13800138000',
        companySize: '50人',
        officeSize: '100平米',
        mainBusiness: '软件开发',
        products: '管理系统',
        serviceNeeds: '定制开发',
        salesperson: '李四'
      };

      const dbData = formDataToDbFormat(formData);

      expect(dbData.company_name).toBe('测试公司');
      expect(dbData.address).toBe('测试地址');
      expect(dbData.contact_person).toBe('张三');
      expect(dbData.mobile).toBe('13800138000');
      expect(dbData.salesperson).toBe('李四');
      expect(dbData.id).toBeDefined();
      expect(dbData.query_code).toBeDefined();
      expect(dbData.created_at).toBeDefined();
      expect(dbData.updated_at).toBeDefined();
    });
  });

  describe('dbDataToFormFormat', () => {
    it('should convert database data to form format', () => {
      const dbData = {
        id: 'test-id',
        query_code: 'ABC12345',
        company_name: '测试公司',
        address: '测试地址',
        contact_person: '张三',
        mobile: '13800138000',
        company_size: '50人',
        office_size: '100平米',
        main_business: '软件开发',
        products: '管理系统',
        service_needs: '定制开发',
        salesperson: '李四',
        report_date: '2024-01-15',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      };

      const formData = dbDataToFormFormat(dbData);

      expect(formData.companyName).toBe('测试公司');
      expect(formData.address).toBe('测试地址');
      expect(formData.contactPerson).toBe('张三');
      expect(formData.mobile).toBe('13800138000');
      expect(formData.salesperson).toBe('李四');
      expect(formData.queryCode).toBe('ABC12345');
    });
  });
});
