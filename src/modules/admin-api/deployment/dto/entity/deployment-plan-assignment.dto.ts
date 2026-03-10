export class DeploymentPlanAssignmentIndustryDto {
  industryId: string;
  industryName: string;
  price: string | null;
  currency: string | null;
  isAssigned: boolean;
}

export class DeploymentPlanAssignmentDto {
  planId: string;
  planName: string;
  planCode: string;
  industries: DeploymentPlanAssignmentIndustryDto[];
}
