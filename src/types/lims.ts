export type TestResultRow = {
  id?: string;
  job_entry_test_id: string;
  sr_no: number;
  id_mark?: string | null;
  length_mm?: number | null;
  width_mm?: number | null;
  area_mm2?: number | null;
  load_kn?: number | null;
  strength_nmm2?: number | null;
  particulars?: string | null;
  result_value?: string | null;
  specified_value?: string | null;
};
