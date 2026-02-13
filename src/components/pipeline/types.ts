export interface LeadsPipelineData {
  intakeRequests: {
    total: number;
    pending: number; // Waiting for customer response
    submitted: number; // Customer has responded
    unlinked: number; // Not linked to a project
  };
  quotes: {
    total: number;
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    acceptedTotal: number; // Sum of accepted quote amounts
  };
  loading: boolean;
}

export interface IntakeRequestSummary {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  property_address: string | null;
  property_city: string | null;
  status: string;
  project_id: string | null;
  project_name?: string | null;
  created_at: string;
  submitted_at: string | null;
}

export interface QuoteSummary {
  id: string;
  title: string;
  status: string;
  total_amount: number;
  total_after_rot: number;
  project_id: string;
  project_name?: string | null;
  updated_at: string;
  created_at: string;
}
