export type SalesCouncilAgent = {
  verdict: string;
  confidence: number;
  rationale: string;
  nextStep: string;
};

export type SalesCouncil = {
  qualificationAgent: SalesCouncilAgent;
  objectionAgent: SalesCouncilAgent;
  closerAgent: SalesCouncilAgent;
  complianceAgent: SalesCouncilAgent;
};

export type WorkspaceAnalysisWithCouncil = {
  council?: SalesCouncil;
};
