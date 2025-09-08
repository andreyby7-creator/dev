declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    PORT?: string;
    HOSTNAME?: string;
    npm_package_version?: string;

    // Feature Flags
    FEATURE_FLAGS_PROVIDER?: 'custom' | 'unleash' | 'launchdarkly';
    FEATURE_FLAGS_API_KEY?: string;
    FEATURE_FLAGS_BASE_URL?: string;
    FEATURE_FLAGS_CACHE_ENABLED?: 'true' | 'false';
    FEATURE_FLAGS_CACHE_TTL?: string;

    // Sentry
    SENTRY_DSN?: string;

    // BetterStack
    BETTERSTACK_SOURCE_TOKEN?: string;

    // Vault
    VAULT_ENABLED?: 'true' | 'false';
    VAULT_URL?: string;
    VAULT_TOKEN?: string;
    VAULT_NAMESPACE?: string;
    VAULT_ENGINE?: string;
    VAULT_MOUNT_PATH?: string;
    VAULT_TIMEOUT?: string;
    VAULT_RETRIES?: string;

    // Vulnerability Scanning
    VULNERABILITY_SCAN_ENABLED?: 'true' | 'false';
    VULNERABILITY_SCAN_SCHEDULE?: string;
    VULNERABILITY_SCAN_TYPES?: string;
    VULNERABILITY_SEVERITY_THRESHOLD?: string;
    VULNERABILITY_AUTO_REMEDIATION?: 'true' | 'false';
    VULNERABILITY_RETENTION_DAYS?: string;

    // ACME/Certificates
    ACME_ENABLED?: 'true' | 'false';
    ACME_SERVER?: string;
    ACME_EMAIL?: string;
    ACME_ACCOUNT_KEY?: string;
    ACME_CHALLENGE_TYPE?: string;
    ACME_WEBROOT_PATH?: string;
    ACME_DNS_PROVIDER?: string;

    // WAF
    WAF_ENABLED?: 'true' | 'false';
    WAF_MODE?: string;
    WAF_DEFAULT_ACTION?: string;
    WAF_MAX_REQUEST_SIZE?: string;
    WAF_MAX_URL_LENGTH?: string;
    WAF_MAX_HEADER_COUNT?: string;
    WAF_RATE_LIMIT_ENABLED?: 'true' | 'false';
    WAF_RATE_LIMIT_REQUESTS?: string;
    WAF_RATE_LIMIT_WINDOW?: string;
    WAF_GEO_BLOCKING_ENABLED?: 'true' | 'false';

    // Jaeger
    JAEGER_ENABLED?: 'true' | 'false';
    JAEGER_ENDPOINT?: string;
    JAEGER_AGENT_HOST?: string;
    JAEGER_AGENT_PORT?: string;
    JAEGER_SERVICE_NAME?: string;
    JAEGER_SAMPLER_TYPE?: string;
    JAEGER_SAMPLER_PARAM?: string;

    // Elasticsearch
    ELASTICSEARCH_NODE?: string;
    ELASTICSEARCH_USERNAME?: string;
    ELASTICSEARCH_PASSWORD?: string;
    ELASTICSEARCH_INDEX?: string;

    // Network Segmentation
    DEFAULT_VPC_CIDR?: string;
    MAX_VPCS?: string;
    MAX_SUBNETS_PER_VPC?: string;
    MAX_SECURITY_GROUPS_PER_VPC?: string;

    // VPN
    VPN_SERVER_ADDRESS?: string;
    VPN_PORT?: string;
    VPN_MAX_CONNECTIONS?: string;
    VPN_SESSION_TIMEOUT?: string;
  }
}
