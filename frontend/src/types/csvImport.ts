/** CSV·엑셀 가져오기 결과 (관제시스템 문서, 업무일지 공용) */
export interface CsvImportSkip {
  line: number;
  key: string;
  name: string;
  reason: string;
}

export interface CsvImportResult {
  total: number;
  imported: number;
  skipped: CsvImportSkip[];
  new_categories: string[];
  missing_files: string[];
  warnings: string[];
}
