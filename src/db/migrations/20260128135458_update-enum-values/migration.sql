-- Convert existing size values and update enum
ALTER TABLE "cloud"."companies" ALTER COLUMN "size" SET DATA TYPE text;--> statement-breakpoint
UPDATE "cloud"."companies" SET "size" = CASE
  WHEN "size" = 'SIZE_1_10' THEN '1-10'
  WHEN "size" = 'SIZE_11_50' THEN '11-50'
  WHEN "size" = 'SIZE_51_200' THEN '51-200'
  WHEN "size" = 'SIZE_200_PLUS' THEN '200+'
  ELSE "size"
END;--> statement-breakpoint
DROP TYPE "cloud"."CompanySize";--> statement-breakpoint
CREATE TYPE "cloud"."CompanySize" AS ENUM('1-10', '11-50', '51-200', '200+');--> statement-breakpoint
ALTER TABLE "cloud"."companies" ALTER COLUMN "size" SET DATA TYPE "cloud"."CompanySize" USING "size"::"cloud"."CompanySize";--> statement-breakpoint

-- Convert existing industry values and update enum
ALTER TABLE "cloud"."companies" ALTER COLUMN "industry" SET DATA TYPE text;--> statement-breakpoint
UPDATE "cloud"."companies" SET "industry" = CASE
  WHEN "industry" = 'HEALTHCARE' THEN 'Healthcare'
  WHEN "industry" = 'RETAIL' THEN 'Retail'
  WHEN "industry" = 'FOOD_AND_BEVERAGE' THEN 'F&B'
  WHEN "industry" = 'PROFESSIONAL_SERVICES' THEN 'Professional Services'
  WHEN "industry" = 'MANUFACTURING' THEN 'Manufacturing'
  WHEN "industry" = 'EDUCATION' THEN 'Education'
  WHEN "industry" = 'TECHNOLOGY' THEN 'Technology'
  WHEN "industry" = 'OTHER' THEN 'Other'
  ELSE "industry"
END;--> statement-breakpoint
DROP TYPE "cloud"."IndustryType";--> statement-breakpoint
CREATE TYPE "cloud"."IndustryType" AS ENUM('Healthcare', 'Retail', 'F&B', 'Professional Services', 'Manufacturing', 'Education', 'Technology', 'Other');--> statement-breakpoint
ALTER TABLE "cloud"."companies" ALTER COLUMN "industry" SET DATA TYPE "cloud"."IndustryType" USING "industry"::"cloud"."IndustryType";
