export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DEVOPS = 'devops',
  NETWORK_MANAGER = 'network_manager',
  STORE_MANAGER = 'store_manager',
  BRAND_MANAGER = 'brand_manager',
  USER = 'user',
}

export interface IRolePermissions {
  // Системные права
  canManageRoles: boolean;
  canManageUsers: boolean;
  canManageSystemSettings: boolean;
  canManageTariffs: boolean;
  canManageCommissions: boolean;
  canManageSecurity: boolean;
  canViewAuditLogs: boolean;
  canManageIntegrations: boolean;
  canViewSystemMonitoring: boolean;
  canManageBackups: boolean;
  canManageDeployments: boolean;

  // Финансовые права
  canViewFinancialAnalytics: boolean;
  canManagePartnerBalances: boolean;
  canIssueInvoices: boolean;
  canViewFinancialReports: boolean;
  canViewTopPartners: boolean;
  canViewRevenueForecasts: boolean;

  // Управление контентом
  canModerateContent: boolean;
  canManageCategories: boolean;
  canSendSystemNotifications: boolean;
  canManagePromoCodes: boolean;

  // Управление сетью
  canManageNetworks: boolean;
  canManageStores: boolean;
  canAssignStoreManagers: boolean;
  canManageStorePermissions: boolean;
  canConfigureGeofencing: boolean;
  canManageStoreHours: boolean;

  // Финансы сети
  canManageNetworkBalance: boolean;
  canViewNetworkAnalytics: boolean;
  canManageNetworkSubscription: boolean;
  canViewNetworkReports: boolean;
  canReplenishNetworkBalance: boolean;

  // Маркетинг
  canCreateNetworkCampaigns: boolean;
  canManagePushNotifications: boolean;
  canBuyPushNotifications: boolean;
  canRunABTests: boolean;
  canPersonalizeOffers: boolean;

  // Аналитика
  canCompareStores: boolean;
  canViewGeographicAnalytics: boolean;
  canViewNetworkForecasts: boolean;

  // Операционные права
  canBulkUploadProducts: boolean;
  canManageStoreInfo: boolean;
  canConfigureStoreGeofencing: boolean;
  canManageStorePersonnel: boolean;
  canIntegratePOS: boolean;
  canCreateLocalLoyaltyCards: boolean;
  canManageDiscounts: boolean;
  canLimitActivationTiers: boolean;
  canCreateTemporaryPromotions: boolean;
  canViewStoreAnalytics: boolean;
  canViewSalesAnalytics: boolean;
  canViewCustomerBase: boolean;
  canViewCustomerGeography: boolean;
  canManageProducts: boolean;
  canManagePrices: boolean;
  canManageInventory: boolean;
  canViewStoreReports: boolean;
  canReplenishStoreBalance: boolean;
  canBuyStorePushNotifications: boolean;
  canUploadStoreCSV: boolean;

  // Управление брендом
  canManageBrandProfile: boolean;
  canManageBrandAssortment: boolean;
  canCategorizeProducts: boolean;
  canBrandPromotions: boolean;
  canCreateBrandCampaigns: boolean;
  canManagePartnerStores: boolean;
  canConfigurePromotionTerms: boolean;
  canCreateBrandPromoCodes: boolean;
  canNegotiateWithStores: boolean;
  canManageDistribution: boolean;
  canConfigurePartnershipAgreements: boolean;
  canAnalyzePartners: boolean;
  canRunCPCAds: boolean;
  canRunTargetedAds: boolean;
  canAnalyzeCompetitors: boolean;
  canViewMarketingReports: boolean;
  canReplenishBrandBalance: boolean;
  canBuyBrandPushNotifications: boolean;
  canUploadBrandCSV: boolean;
  canViewBrandMetrics: boolean;
  canViewBrandEffectiveness: boolean;
  canViewBrandGeography: boolean;
  canViewBrandSegmentation: boolean;

  // Пользовательские права
  canEditProfile: boolean;
  canManageNotifications: boolean;
  canManagePrivacy: boolean;
  canViewPurchaseHistory: boolean;
  canViewAvailableCards: boolean;
  canActivateLoyaltyCards: boolean;
  canSaveFavoriteCards: boolean;
  canViewActivationHistory: boolean;
  canManageFavorites: boolean;
  canSearchNearbyStores: boolean;
  canUseGeofencing: boolean;
  canViewStoreDistance: boolean;
  canViewStoreHours: boolean;
  canViewPersonalRecommendations: boolean;
  canManagePreferences: boolean;
  canViewPersonalDiscounts: boolean;
  canViewPromotionsCalendar: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, IRolePermissions> = {
  [UserRole.SUPER_ADMIN]: {
    // Системные права - полный доступ
    canManageRoles: true,
    canManageUsers: true,
    canManageSystemSettings: true,
    canManageTariffs: true,
    canManageCommissions: true,
    canManageSecurity: true,
    canViewAuditLogs: true,
    canManageIntegrations: true,
    canViewSystemMonitoring: true,
    canManageBackups: true,
    canManageDeployments: true,

    // Финансовые права - полный доступ
    canViewFinancialAnalytics: true,
    canManagePartnerBalances: true,
    canIssueInvoices: true,
    canViewFinancialReports: true,
    canViewTopPartners: true,
    canViewRevenueForecasts: true,

    // Управление контентом - полный доступ
    canModerateContent: true,
    canManageCategories: true,
    canSendSystemNotifications: true,
    canManagePromoCodes: true,

    // Все остальные права - полный доступ
    canManageNetworks: true,
    canManageStores: true,
    canAssignStoreManagers: true,
    canManageStorePermissions: true,
    canConfigureGeofencing: true,
    canManageStoreHours: true,
    canManageNetworkBalance: true,
    canViewNetworkAnalytics: true,
    canManageNetworkSubscription: true,
    canViewNetworkReports: true,
    canReplenishNetworkBalance: true,
    canCreateNetworkCampaigns: true,
    canManagePushNotifications: true,
    canBuyPushNotifications: true,
    canRunABTests: true,
    canPersonalizeOffers: true,
    canCompareStores: true,
    canViewGeographicAnalytics: true,
    canViewNetworkForecasts: true,
    canBulkUploadProducts: true,
    canManageStoreInfo: true,
    canConfigureStoreGeofencing: true,
    canManageStorePersonnel: true,
    canIntegratePOS: true,
    canCreateLocalLoyaltyCards: true,
    canManageDiscounts: true,
    canLimitActivationTiers: true,
    canCreateTemporaryPromotions: true,
    canViewStoreAnalytics: true,
    canViewSalesAnalytics: true,
    canViewCustomerBase: true,
    canViewCustomerGeography: true,
    canManageProducts: true,
    canManagePrices: true,
    canManageInventory: true,
    canViewStoreReports: true,
    canReplenishStoreBalance: true,
    canBuyStorePushNotifications: true,
    canUploadStoreCSV: true,
    canManageBrandProfile: true,
    canManageBrandAssortment: true,
    canCategorizeProducts: true,
    canBrandPromotions: true,
    canCreateBrandCampaigns: true,
    canManagePartnerStores: true,
    canConfigurePromotionTerms: true,
    canCreateBrandPromoCodes: true,
    canNegotiateWithStores: true,
    canManageDistribution: true,
    canConfigurePartnershipAgreements: true,
    canAnalyzePartners: true,
    canRunCPCAds: true,
    canRunTargetedAds: true,
    canAnalyzeCompetitors: true,
    canViewMarketingReports: true,
    canReplenishBrandBalance: true,
    canBuyBrandPushNotifications: true,
    canUploadBrandCSV: true,
    canViewBrandMetrics: true,
    canViewBrandEffectiveness: true,
    canViewBrandGeography: true,
    canViewBrandSegmentation: true,
    canEditProfile: true,
    canManageNotifications: true,
    canManagePrivacy: true,
    canViewPurchaseHistory: true,
    canViewAvailableCards: true,
    canActivateLoyaltyCards: true,
    canSaveFavoriteCards: true,
    canViewActivationHistory: true,
    canManageFavorites: true,
    canSearchNearbyStores: true,
    canUseGeofencing: true,
    canViewStoreDistance: true,
    canViewStoreHours: true,
    canViewPersonalRecommendations: true,
    canManagePreferences: true,
    canViewPersonalDiscounts: true,
    canViewPromotionsCalendar: true,
  },

  [UserRole.ADMIN]: {
    // Системные права - полный доступ
    canManageRoles: true,
    canManageUsers: true,
    canManageSystemSettings: true,
    canManageTariffs: true,
    canManageCommissions: true,
    canManageSecurity: true,
    canViewAuditLogs: true,
    canManageIntegrations: true,
    canViewSystemMonitoring: true,
    canManageBackups: true,
    canManageDeployments: true,

    // Финансовые права - полный доступ
    canViewFinancialAnalytics: true,
    canManagePartnerBalances: true,
    canIssueInvoices: true,
    canViewFinancialReports: true,
    canViewTopPartners: true,
    canViewRevenueForecasts: true,

    // Управление контентом - полный доступ
    canModerateContent: true,
    canManageCategories: true,
    canSendSystemNotifications: true,
    canManagePromoCodes: true,

    // Все остальные права - полный доступ
    canManageNetworks: true,
    canManageStores: true,
    canAssignStoreManagers: true,
    canManageStorePermissions: true,
    canConfigureGeofencing: true,
    canManageStoreHours: true,
    canManageNetworkBalance: true,
    canViewNetworkAnalytics: true,
    canManageNetworkSubscription: true,
    canViewNetworkReports: true,
    canReplenishNetworkBalance: true,
    canCreateNetworkCampaigns: true,
    canManagePushNotifications: true,
    canBuyPushNotifications: true,
    canRunABTests: true,
    canPersonalizeOffers: true,
    canCompareStores: true,
    canViewGeographicAnalytics: true,
    canViewNetworkForecasts: true,
    canBulkUploadProducts: true,
    canManageStoreInfo: true,
    canConfigureStoreGeofencing: true,
    canManageStorePersonnel: true,
    canIntegratePOS: true,
    canCreateLocalLoyaltyCards: true,
    canManageDiscounts: true,
    canLimitActivationTiers: true,
    canCreateTemporaryPromotions: true,
    canViewStoreAnalytics: true,
    canViewSalesAnalytics: true,
    canViewCustomerBase: true,
    canViewCustomerGeography: true,
    canManageProducts: true,
    canManagePrices: true,
    canManageInventory: true,
    canViewStoreReports: true,
    canReplenishStoreBalance: true,
    canBuyStorePushNotifications: true,
    canUploadStoreCSV: true,
    canManageBrandProfile: true,
    canManageBrandAssortment: true,
    canCategorizeProducts: true,
    canBrandPromotions: true,
    canCreateBrandCampaigns: true,
    canManagePartnerStores: true,
    canConfigurePromotionTerms: true,
    canCreateBrandPromoCodes: true,
    canNegotiateWithStores: true,
    canManageDistribution: true,
    canConfigurePartnershipAgreements: true,
    canAnalyzePartners: true,
    canRunCPCAds: true,
    canRunTargetedAds: true,
    canAnalyzeCompetitors: true,
    canViewMarketingReports: true,
    canReplenishBrandBalance: true,
    canBuyBrandPushNotifications: true,
    canUploadBrandCSV: true,
    canViewBrandMetrics: true,
    canViewBrandEffectiveness: true,
    canViewBrandGeography: true,
    canViewBrandSegmentation: true,
    canEditProfile: true,
    canManageNotifications: true,
    canManagePrivacy: true,
    canViewPurchaseHistory: true,
    canViewAvailableCards: true,
    canActivateLoyaltyCards: true,
    canSaveFavoriteCards: true,
    canViewActivationHistory: true,
    canManageFavorites: true,
    canSearchNearbyStores: true,
    canUseGeofencing: true,
    canViewStoreDistance: true,
    canViewStoreHours: true,
    canViewPersonalRecommendations: true,
    canManagePreferences: true,
    canViewPersonalDiscounts: true,
    canViewPromotionsCalendar: true,
  },

  [UserRole.DEVOPS]: {
    // Системные права - DevOps доступ
    canManageRoles: false,
    canManageUsers: false,
    canManageSystemSettings: true,
    canManageTariffs: false,
    canManageCommissions: false,
    canManageSecurity: true,
    canViewAuditLogs: true,
    canManageIntegrations: true,
    canViewSystemMonitoring: true,
    canManageBackups: true,
    canManageDeployments: true,

    // Финансовые права - нет доступа
    canViewFinancialAnalytics: false,
    canManagePartnerBalances: false,
    canIssueInvoices: false,
    canViewFinancialReports: false,
    canViewTopPartners: false,
    canViewRevenueForecasts: false,

    // Управление контентом - ограниченный доступ
    canModerateContent: false,
    canManageCategories: false,
    canSendSystemNotifications: true,
    canManagePromoCodes: false,

    // Управление сетью - ограниченный доступ
    canManageNetworks: false,
    canManageStores: false,
    canAssignStoreManagers: false,
    canManageStorePermissions: false,
    canConfigureGeofencing: false,
    canManageStoreHours: false,

    // Финансы сети - нет доступа
    canManageNetworkBalance: false,
    canViewNetworkAnalytics: false,
    canManageNetworkSubscription: false,
    canViewNetworkReports: false,
    canReplenishNetworkBalance: false,

    // Маркетинг - ограниченный доступ
    canCreateNetworkCampaigns: false,
    canManagePushNotifications: true,
    canBuyPushNotifications: false,
    canRunABTests: false,
    canPersonalizeOffers: false,

    // Аналитика сети - ограниченный доступ
    canCompareStores: false,
    canViewGeographicAnalytics: false,
    canViewNetworkForecasts: false,

    // Операционные права - ограниченный доступ
    canBulkUploadProducts: false,
    canManageStoreInfo: false,
    canConfigureStoreGeofencing: false,
    canManageStorePersonnel: false,
    canIntegratePOS: false,
    canCreateLocalLoyaltyCards: false,
    canManageDiscounts: false,
    canLimitActivationTiers: false,
    canCreateTemporaryPromotions: false,
    canViewStoreAnalytics: false,
    canViewSalesAnalytics: false,
    canViewCustomerBase: false,
    canViewCustomerGeography: false,
    canManageProducts: false,
    canManagePrices: false,
    canManageInventory: false,
    canViewStoreReports: false,
    canReplenishStoreBalance: false,
    canBuyStorePushNotifications: false,
    canUploadStoreCSV: false,

    // Брендовые права - нет доступа
    canManageBrandProfile: false,
    canManageBrandAssortment: false,
    canCategorizeProducts: false,
    canBrandPromotions: false,
    canCreateBrandCampaigns: false,
    canManagePartnerStores: false,
    canConfigurePromotionTerms: false,
    canCreateBrandPromoCodes: false,
    canNegotiateWithStores: false,
    canManageDistribution: false,
    canConfigurePartnershipAgreements: false,
    canAnalyzePartners: false,
    canRunCPCAds: false,
    canRunTargetedAds: false,
    canAnalyzeCompetitors: false,
    canViewMarketingReports: false,
    canReplenishBrandBalance: false,
    canBuyBrandPushNotifications: false,
    canUploadBrandCSV: false,
    canViewBrandMetrics: false,
    canViewBrandEffectiveness: false,
    canViewBrandGeography: false,
    canViewBrandSegmentation: false,

    // Пользовательские права - базовый доступ
    canEditProfile: true,
    canManageNotifications: true,
    canManagePrivacy: true,
    canViewPurchaseHistory: true,
    canViewAvailableCards: true,
    canActivateLoyaltyCards: true,
    canSaveFavoriteCards: true,
    canViewActivationHistory: true,
    canManageFavorites: true,
    canSearchNearbyStores: true,
    canUseGeofencing: true,
    canViewStoreDistance: true,
    canViewStoreHours: true,
    canViewPersonalRecommendations: true,
    canManagePreferences: true,
    canViewPersonalDiscounts: true,
    canViewPromotionsCalendar: true,
  },

  [UserRole.NETWORK_MANAGER]: {
    // Системные права - ограниченный доступ
    canManageRoles: false,
    canManageUsers: false,
    canManageSystemSettings: false,
    canManageTariffs: false,
    canManageCommissions: false,
    canManageSecurity: false,
    canViewAuditLogs: false,
    canManageIntegrations: false,
    canViewSystemMonitoring: false,
    canManageBackups: false,
    canManageDeployments: false,

    // Финансовые права - только для своей сети
    canViewFinancialAnalytics: false,
    canManagePartnerBalances: false,
    canIssueInvoices: false,
    canViewFinancialReports: false,
    canViewTopPartners: false,
    canViewRevenueForecasts: false,

    // Управление контентом - ограниченный доступ
    canModerateContent: false,
    canManageCategories: false,
    canSendSystemNotifications: false,
    canManagePromoCodes: false,

    // Управление сетью - полный доступ
    canManageNetworks: true,
    canManageStores: true,
    canAssignStoreManagers: true,
    canManageStorePermissions: true,
    canConfigureGeofencing: true,
    canManageStoreHours: true,

    // Финансы сети - полный доступ
    canManageNetworkBalance: true,
    canViewNetworkAnalytics: true,
    canManageNetworkSubscription: true,
    canViewNetworkReports: true,
    canReplenishNetworkBalance: true,

    // Маркетинг - полный доступ
    canCreateNetworkCampaigns: true,
    canManagePushNotifications: true,
    canBuyPushNotifications: true,
    canRunABTests: true,
    canPersonalizeOffers: true,

    // Аналитика сети - полный доступ
    canCompareStores: true,
    canViewGeographicAnalytics: true,
    canViewNetworkForecasts: true,

    // Операционные права - полный доступ
    canBulkUploadProducts: true,
    canManageStoreInfo: true,
    canConfigureStoreGeofencing: true,
    canManageStorePersonnel: true,
    canIntegratePOS: true,
    canCreateLocalLoyaltyCards: true,
    canManageDiscounts: true,
    canLimitActivationTiers: true,
    canCreateTemporaryPromotions: true,
    canViewStoreAnalytics: true,
    canViewSalesAnalytics: true,
    canViewCustomerBase: true,
    canViewCustomerGeography: true,
    canManageProducts: true,
    canManagePrices: true,
    canManageInventory: true,
    canViewStoreReports: true,
    canReplenishStoreBalance: true,
    canBuyStorePushNotifications: true,
    canUploadStoreCSV: true,

    // Брендовые права - ограниченный доступ
    canManageBrandProfile: false,
    canManageBrandAssortment: false,
    canCategorizeProducts: false,
    canBrandPromotions: false,
    canCreateBrandCampaigns: false,
    canManagePartnerStores: false,
    canConfigurePromotionTerms: false,
    canCreateBrandPromoCodes: false,
    canNegotiateWithStores: false,
    canManageDistribution: false,
    canConfigurePartnershipAgreements: false,
    canAnalyzePartners: false,
    canRunCPCAds: false,
    canRunTargetedAds: false,
    canAnalyzeCompetitors: false,
    canViewMarketingReports: false,
    canReplenishBrandBalance: false,
    canBuyBrandPushNotifications: false,
    canUploadBrandCSV: false,
    canViewBrandMetrics: false,
    canViewBrandEffectiveness: false,
    canViewBrandGeography: false,
    canViewBrandSegmentation: false,

    // Пользовательские права - базовый доступ
    canEditProfile: true,
    canManageNotifications: true,
    canManagePrivacy: true,
    canViewPurchaseHistory: true,
    canViewAvailableCards: true,
    canActivateLoyaltyCards: true,
    canSaveFavoriteCards: true,
    canViewActivationHistory: true,
    canManageFavorites: true,
    canSearchNearbyStores: true,
    canUseGeofencing: true,
    canViewStoreDistance: true,
    canViewStoreHours: true,
    canViewPersonalRecommendations: true,
    canManagePreferences: true,
    canViewPersonalDiscounts: true,
    canViewPromotionsCalendar: true,
  },

  [UserRole.STORE_MANAGER]: {
    // Системные права - нет доступа
    canManageRoles: false,
    canManageUsers: false,
    canManageSystemSettings: false,
    canManageTariffs: false,
    canManageCommissions: false,
    canManageSecurity: false,
    canViewAuditLogs: false,
    canManageIntegrations: false,
    canViewSystemMonitoring: false,
    canManageBackups: false,
    canManageDeployments: false,

    // Финансовые права - нет доступа
    canViewFinancialAnalytics: false,
    canManagePartnerBalances: false,
    canIssueInvoices: false,
    canViewFinancialReports: false,
    canViewTopPartners: false,
    canViewRevenueForecasts: false,

    // Управление контентом - нет доступа
    canModerateContent: false,
    canManageCategories: false,
    canSendSystemNotifications: false,
    canManagePromoCodes: false,

    // Управление сетью - ограниченный доступ
    canManageNetworks: false,
    canManageStores: false,
    canAssignStoreManagers: false,
    canManageStorePermissions: false,
    canConfigureGeofencing: false,
    canManageStoreHours: false,

    // Финансы сети - ограниченный доступ
    canManageNetworkBalance: false,
    canViewNetworkAnalytics: false,
    canManageNetworkSubscription: false,
    canViewNetworkReports: false,
    canReplenishNetworkBalance: false,

    // Маркетинг - ограниченный доступ
    canCreateNetworkCampaigns: false,
    canManagePushNotifications: false,
    canBuyPushNotifications: false,
    canRunABTests: false,
    canPersonalizeOffers: false,

    // Аналитика сети - ограниченный доступ
    canCompareStores: false,
    canViewGeographicAnalytics: false,
    canViewNetworkForecasts: false,

    // Операционные права - полный доступ для своего магазина
    canBulkUploadProducts: false,
    canManageStoreInfo: true,
    canConfigureStoreGeofencing: true,
    canManageStorePersonnel: true,
    canIntegratePOS: true,
    canCreateLocalLoyaltyCards: true,
    canManageDiscounts: true,
    canLimitActivationTiers: true,
    canCreateTemporaryPromotions: true,
    canViewStoreAnalytics: true,
    canViewSalesAnalytics: true,
    canViewCustomerBase: true,
    canViewCustomerGeography: true,
    canManageProducts: true,
    canManagePrices: true,
    canManageInventory: true,
    canViewStoreReports: true,
    canReplenishStoreBalance: true,
    canBuyStorePushNotifications: true,
    canUploadStoreCSV: true,

    // Брендовые права - нет доступа
    canManageBrandProfile: false,
    canManageBrandAssortment: false,
    canCategorizeProducts: false,
    canBrandPromotions: false,
    canCreateBrandCampaigns: false,
    canManagePartnerStores: false,
    canConfigurePromotionTerms: false,
    canCreateBrandPromoCodes: false,
    canNegotiateWithStores: false,
    canManageDistribution: false,
    canConfigurePartnershipAgreements: false,
    canAnalyzePartners: false,
    canRunCPCAds: false,
    canRunTargetedAds: false,
    canAnalyzeCompetitors: false,
    canViewMarketingReports: false,
    canReplenishBrandBalance: false,
    canBuyBrandPushNotifications: false,
    canUploadBrandCSV: false,
    canViewBrandMetrics: false,
    canViewBrandEffectiveness: false,
    canViewBrandGeography: false,
    canViewBrandSegmentation: false,

    // Пользовательские права - базовый доступ
    canEditProfile: true,
    canManageNotifications: true,
    canManagePrivacy: true,
    canViewPurchaseHistory: true,
    canViewAvailableCards: true,
    canActivateLoyaltyCards: true,
    canSaveFavoriteCards: true,
    canViewActivationHistory: true,
    canManageFavorites: true,
    canSearchNearbyStores: true,
    canUseGeofencing: true,
    canViewStoreDistance: true,
    canViewStoreHours: true,
    canViewPersonalRecommendations: true,
    canManagePreferences: true,
    canViewPersonalDiscounts: true,
    canViewPromotionsCalendar: true,
  },

  [UserRole.BRAND_MANAGER]: {
    // Системные права - нет доступа
    canManageRoles: false,
    canManageUsers: false,
    canManageSystemSettings: false,
    canManageTariffs: false,
    canManageCommissions: false,
    canManageSecurity: false,
    canViewAuditLogs: false,
    canManageIntegrations: false,
    canViewSystemMonitoring: false,
    canManageBackups: false,
    canManageDeployments: false,

    // Финансовые права - нет доступа
    canViewFinancialAnalytics: false,
    canManagePartnerBalances: false,
    canIssueInvoices: false,
    canViewFinancialReports: false,
    canViewTopPartners: false,
    canViewRevenueForecasts: false,

    // Управление контентом - ограниченный доступ
    canModerateContent: false,
    canManageCategories: false,
    canSendSystemNotifications: false,
    canManagePromoCodes: false,

    // Управление сетью - нет доступа
    canManageNetworks: false,
    canManageStores: false,
    canAssignStoreManagers: false,
    canManageStorePermissions: false,
    canConfigureGeofencing: false,
    canManageStoreHours: false,

    // Финансы сети - нет доступа
    canManageNetworkBalance: false,
    canViewNetworkAnalytics: false,
    canManageNetworkSubscription: false,
    canViewNetworkReports: false,
    canReplenishNetworkBalance: false,

    // Маркетинг - ограниченный доступ
    canCreateNetworkCampaigns: false,
    canManagePushNotifications: false,
    canBuyPushNotifications: false,
    canRunABTests: false,
    canPersonalizeOffers: false,

    // Аналитика сети - нет доступа
    canCompareStores: false,
    canViewGeographicAnalytics: false,
    canViewNetworkForecasts: false,

    // Операционные права - ограниченный доступ
    canBulkUploadProducts: false,
    canManageStoreInfo: false,
    canConfigureStoreGeofencing: false,
    canManageStorePersonnel: false,
    canIntegratePOS: false,
    canCreateLocalLoyaltyCards: false,
    canManageDiscounts: false,
    canLimitActivationTiers: false,
    canCreateTemporaryPromotions: false,
    canViewStoreAnalytics: false,
    canViewSalesAnalytics: false,
    canViewCustomerBase: false,
    canViewCustomerGeography: false,
    canManageProducts: false,
    canManagePrices: false,
    canManageInventory: false,
    canViewStoreReports: false,
    canReplenishStoreBalance: false,
    canBuyStorePushNotifications: false,
    canUploadStoreCSV: false,

    // Брендовые права - полный доступ
    canManageBrandProfile: true,
    canManageBrandAssortment: true,
    canCategorizeProducts: true,
    canBrandPromotions: true,
    canCreateBrandCampaigns: true,
    canManagePartnerStores: true,
    canConfigurePromotionTerms: true,
    canCreateBrandPromoCodes: true,
    canNegotiateWithStores: true,
    canManageDistribution: true,
    canConfigurePartnershipAgreements: true,
    canAnalyzePartners: true,
    canRunCPCAds: true,
    canRunTargetedAds: true,
    canAnalyzeCompetitors: true,
    canViewMarketingReports: true,
    canReplenishBrandBalance: true,
    canBuyBrandPushNotifications: true,
    canUploadBrandCSV: true,
    canViewBrandMetrics: true,
    canViewBrandEffectiveness: true,
    canViewBrandGeography: true,
    canViewBrandSegmentation: true,

    // Пользовательские права - базовый доступ
    canEditProfile: true,
    canManageNotifications: true,
    canManagePrivacy: true,
    canViewPurchaseHistory: true,
    canViewAvailableCards: true,
    canActivateLoyaltyCards: true,
    canSaveFavoriteCards: true,
    canViewActivationHistory: true,
    canManageFavorites: true,
    canSearchNearbyStores: true,
    canUseGeofencing: true,
    canViewStoreDistance: true,
    canViewStoreHours: true,
    canViewPersonalRecommendations: true,
    canManagePreferences: true,
    canViewPersonalDiscounts: true,
    canViewPromotionsCalendar: true,
  },

  [UserRole.USER]: {
    // Все системные права - нет доступа
    canManageRoles: false,
    canManageUsers: false,
    canManageSystemSettings: false,
    canManageTariffs: false,
    canManageCommissions: false,
    canManageSecurity: false,
    canViewAuditLogs: false,
    canManageIntegrations: false,
    canViewSystemMonitoring: false,
    canManageBackups: false,
    canManageDeployments: false,

    // Все финансовые права - нет доступа
    canViewFinancialAnalytics: false,
    canManagePartnerBalances: false,
    canIssueInvoices: false,
    canViewFinancialReports: false,
    canViewTopPartners: false,
    canViewRevenueForecasts: false,

    // Все права управления контентом - нет доступа
    canModerateContent: false,
    canManageCategories: false,
    canSendSystemNotifications: false,
    canManagePromoCodes: false,

    // Все права управления сетью - нет доступа
    canManageNetworks: false,
    canManageStores: false,
    canAssignStoreManagers: false,
    canManageStorePermissions: false,
    canConfigureGeofencing: false,
    canManageStoreHours: false,

    // Все права финансов сети - нет доступа
    canManageNetworkBalance: false,
    canViewNetworkAnalytics: false,
    canManageNetworkSubscription: false,
    canViewNetworkReports: false,
    canReplenishNetworkBalance: false,

    // Все маркетинговые права - нет доступа
    canCreateNetworkCampaigns: false,
    canManagePushNotifications: false,
    canBuyPushNotifications: false,
    canRunABTests: false,
    canPersonalizeOffers: false,

    // Все права аналитики сети - нет доступа
    canCompareStores: false,
    canViewGeographicAnalytics: false,
    canViewNetworkForecasts: false,

    // Все операционные права - нет доступа
    canBulkUploadProducts: false,
    canManageStoreInfo: false,
    canConfigureStoreGeofencing: false,
    canManageStorePersonnel: false,
    canIntegratePOS: false,
    canCreateLocalLoyaltyCards: false,
    canManageDiscounts: false,
    canLimitActivationTiers: false,
    canCreateTemporaryPromotions: false,
    canViewStoreAnalytics: false,
    canViewSalesAnalytics: false,
    canViewCustomerBase: false,
    canViewCustomerGeography: false,
    canManageProducts: false,
    canManagePrices: false,
    canManageInventory: false,
    canViewStoreReports: false,
    canReplenishStoreBalance: false,
    canBuyStorePushNotifications: false,
    canUploadStoreCSV: false,

    // Все брендовые права - нет доступа
    canManageBrandProfile: false,
    canManageBrandAssortment: false,
    canCategorizeProducts: false,
    canBrandPromotions: false,
    canCreateBrandCampaigns: false,
    canManagePartnerStores: false,
    canConfigurePromotionTerms: false,
    canCreateBrandPromoCodes: false,
    canNegotiateWithStores: false,
    canManageDistribution: false,
    canConfigurePartnershipAgreements: false,
    canAnalyzePartners: false,
    canRunCPCAds: false,
    canRunTargetedAds: false,
    canAnalyzeCompetitors: false,
    canViewMarketingReports: false,
    canReplenishBrandBalance: false,
    canBuyBrandPushNotifications: false,
    canUploadBrandCSV: false,
    canViewBrandMetrics: false,
    canViewBrandEffectiveness: false,
    canViewBrandGeography: false,
    canViewBrandSegmentation: false,

    // Пользовательские права - полный доступ
    canEditProfile: true,
    canManageNotifications: true,
    canManagePrivacy: true,
    canViewPurchaseHistory: true,
    canViewAvailableCards: true,
    canActivateLoyaltyCards: true,
    canSaveFavoriteCards: true,
    canViewActivationHistory: true,
    canManageFavorites: true,
    canSearchNearbyStores: true,
    canUseGeofencing: true,
    canViewStoreDistance: true,
    canViewStoreHours: true,
    canViewPersonalRecommendations: true,
    canManagePreferences: true,
    canViewPersonalDiscounts: true,
    canViewPromotionsCalendar: true,
  },
};

export function hasPermission(
  userRole: UserRole,
  permission: keyof IRolePermissions
): boolean {
  return ROLE_PERMISSIONS[userRole][permission];
}

export function getRoleHierarchy(userRole: UserRole): UserRole[] {
  const hierarchy: Record<UserRole, UserRole[]> = {
    [UserRole.SUPER_ADMIN]: [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.DEVOPS,
      UserRole.NETWORK_MANAGER,
      UserRole.STORE_MANAGER,
      UserRole.BRAND_MANAGER,
      UserRole.USER,
    ],
    [UserRole.ADMIN]: [
      UserRole.ADMIN,
      UserRole.DEVOPS,
      UserRole.NETWORK_MANAGER,
      UserRole.STORE_MANAGER,
      UserRole.BRAND_MANAGER,
      UserRole.USER,
    ],
    [UserRole.DEVOPS]: [UserRole.DEVOPS, UserRole.USER],
    [UserRole.NETWORK_MANAGER]: [
      UserRole.NETWORK_MANAGER,
      UserRole.STORE_MANAGER,
      UserRole.USER,
    ],
    [UserRole.STORE_MANAGER]: [UserRole.STORE_MANAGER, UserRole.USER],
    [UserRole.BRAND_MANAGER]: [UserRole.BRAND_MANAGER, UserRole.USER],
    [UserRole.USER]: [UserRole.USER],
  };

  return hierarchy[userRole];
}

export function canAccessRole(
  userRole: UserRole,
  targetRole: UserRole
): boolean {
  return getRoleHierarchy(userRole).includes(targetRole);
}
