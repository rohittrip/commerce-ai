-- Add UCP metadata fields to providers table
ALTER TABLE "providers"
ADD COLUMN IF NOT EXISTS "ucp_profile" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "auth_type" TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS "oauth_config" JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN "providers"."ucp_profile" IS 'UCP platform metadata and profile information';
COMMENT ON COLUMN "providers"."auth_type" IS 'Authentication type: none, oauth2, api_key';
COMMENT ON COLUMN "providers"."oauth_config" IS 'OAuth2 configuration (authorizationURL, tokenURL, clientID, scope)';
