export interface TalentaAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface TalentaRawEmployee {
  id: number;
  nik: string;         // employee_id
  first_name: string;
  last_name: string;
  email: string;
  mobile_phone: string;
  job_position: {
    id: number;
    name: string;
  };
  organization: {
    id: number;
    name: string;
  };
  branch: {
    id: number;
    name: string;
  };
  employment_status: {
    id: number;
    name: string;       // e.g. "Contract", "Permanent"
  };
  join_date: string;   // YYYY-MM-DD
  contract_start_date: string;
  contract_end_date: string;
  direct_manager?: {
    id: number;
    email: string;
  };
}

export interface TalentaPaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}
