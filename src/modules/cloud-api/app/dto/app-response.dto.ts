import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { App, CompanyApp } from '@/db/schema';

export class AppResponseDto {
  @ApiProperty({ description: 'App ID' })
  id: string;

  @ApiProperty({ description: 'App name' })
  name: string;

  @ApiProperty({ description: 'App slug (unique identifier)' })
  slug: string;

  @ApiProperty({ description: 'Lucide icon name' })
  icon: string;

  @ApiPropertyOptional({ description: 'App description' })
  description: string | null;

  @ApiProperty({ description: 'App category', enum: ['HR', 'FINANCE', 'OPERATIONS', 'SALES', 'MARKETING', 'OTHER'] })
  category: string;

  @ApiProperty({ description: 'Pricing tier', enum: ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'] })
  pricingTier: string;

  @ApiProperty({ description: 'Monthly price in smallest currency unit' })
  monthlyPrice: number;

  @ApiProperty({ description: 'Is featured app' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Is new app' })
  isNew: boolean;

  @ApiPropertyOptional({ description: 'Recommended industries (JSON array)' })
  recommendedIndustries: string | null;

  @ApiPropertyOptional({ description: 'Dependencies (JSON array of app IDs)' })
  dependencies: string | null;

  @ApiProperty({ description: 'Whether the app is enabled for the company' })
  enabled: boolean;

  @ApiPropertyOptional({ description: 'When the app was enabled' })
  enabledAt?: string | null;

  static from(app: App, companyApp?: CompanyApp | null): AppResponseDto {
    return {
      id: app.id,
      name: app.name,
      slug: app.slug,
      icon: app.icon,
      description: app.description,
      category: app.category,
      pricingTier: app.pricingTier,
      monthlyPrice: app.monthlyPrice,
      isFeatured: app.isFeatured,
      isNew: app.isNew,
      recommendedIndustries: app.recommendedIndustries,
      dependencies: app.dependencies,
      enabled: companyApp?.status === 'ACTIVE',
      enabledAt: companyApp?.enabledAt?.toISOString() ?? null,
    };
  }
}

export class ToggleAppResponseDto {
  @ApiProperty({ description: 'App ID' })
  appId: string;

  @ApiProperty({ description: 'Company ID' })
  companyId: string;

  @ApiProperty({ description: 'Whether the app is now enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'Status message' })
  message: string;
}
