#!/bin/bash

# Read stdin to get JSON
input=$(cat)

# Extract tool name and input
tool_name=$(echo "$input" | jq -r '.tool_name')
file_path=$(echo "$input" | jq -r '.tool_input.file_path')

# Only check if a file was written/replaced
if [[ "$tool_name" != "write_file" && "$tool_name" != "replace" ]]; then
  exit 0
fi

# 1. Swagger decorators check
if [[ "$file_path" == *.controller.ts ]] && grep -qE '@Api(Operation|Body|Response|Param|Query|Header|Produces)\(' "$file_path" 2>/dev/null; then
  echo "❌ BLOCKED: Swagger decorators belong in docs/*.docs.ts files, not inline on controllers. Use applyDecorators() in the docs/ folder." >&2
  exit 1
fi

# 2. JSDoc check
if [[ "$file_path" == *.ts && "$file_path" != *.docs.ts && "$file_path" != *.dto.ts ]] && grep -nE '^\s*/\*\*' "$file_path" 2>/dev/null | grep -vE '@deprecated' | head -1 | grep -q '.'; then
  echo "⚠️  WARNING: Use // comments, not /** */ JSDoc style. Only /** @deprecated */ is allowed." >&2
fi

# 3. Exception import check
if [[ "$file_path" == *src/modules/* || "$file_path" == *src/services/* ]] && grep -qE "import.*\b(BadRequestException|UnauthorizedException|NotFoundException|ConflictException|ForbiddenException)\b.*from '@nestjs/common'" "$file_path" 2>/dev/null; then
  echo "❌ BLOCKED: Import exceptions from @vritti/api-sdk, NOT @nestjs/common" >&2
  exit 1
fi

# 4. Controller return await check
if [[ "$file_path" == *.controller.ts ]] && grep -nE '^[^/]*return\s+await\s+' "$file_path" 2>/dev/null | head -3 | grep -q '.'; then
  echo "⚠️  WARNING: Avoid "return await" in controllers unless inside try-catch. Just return the Promise directly for better performance." >&2
fi

exit 0
