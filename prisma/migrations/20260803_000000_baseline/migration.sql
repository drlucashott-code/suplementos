-- CreateEnum
CREATE TYPE "Store" AS ENUM ('AMAZON', 'MERCADO_LIVRE');

-- CreateEnum
CREATE TYPE "CreatineForm" AS ENUM ('POWDER', 'CAPSULE', 'GUMMY');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "flavor" TEXT,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatineInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "form" "CreatineForm" NOT NULL,
    "totalUnits" DOUBLE PRECISION NOT NULL,
    "unitsPerDose" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CreatineInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheyInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalWeightInGrams" DOUBLE PRECISION NOT NULL,
    "doseInGrams" DOUBLE PRECISION NOT NULL,
    "proteinPerDoseInGrams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WheyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProteinBarInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "doseInGrams" DOUBLE PRECISION NOT NULL,
    "proteinPerDoseInGrams" DOUBLE PRECISION NOT NULL,
    "unitsPerBox" INTEGER NOT NULL,

    CONSTRAINT "ProteinBarInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProteinDrinkInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitsPerPack" INTEGER NOT NULL,
    "volumePerUnitInMl" DOUBLE PRECISION NOT NULL,
    "proteinPerUnitInGrams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProteinDrinkInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionalCoffeeInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalWeightInGrams" DOUBLE PRECISION NOT NULL,
    "doseInGrams" DOUBLE PRECISION NOT NULL,
    "caffeinePerDoseInMg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FunctionalCoffeeInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreWorkoutInfo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalWeightInGrams" DOUBLE PRECISION NOT NULL,
    "doseInGrams" DOUBLE PRECISION NOT NULL,
    "caffeinePerDoseInMg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PreWorkoutInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "store" "Store" NOT NULL,
    "externalId" TEXT NOT NULL,
    "seller" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ratingAverage" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferPriceHistory" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmazonImportQueue" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmazonImportQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicCategory" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'casa',
    "groupName" TEXT NOT NULL DEFAULT 'Casa e Limpeza',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "displayConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicProduct" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "isVisibleOnSite" BOOLEAN NOT NULL DEFAULT true,
    "visibilityStatus" TEXT NOT NULL DEFAULT 'visible',
    "lastValidPrice" DOUBLE PRECISION,
    "lastValidPriceAt" TIMESTAMP(3),
    "availabilityStatus" TEXT DEFAULT 'UNKNOWN',
    "lastAvailabilityCheckedAt" TIMESTAMP(3),
    "averagePrice30d" DOUBLE PRECISION,
    "lowestPrice30d" DOUBLE PRECISION,
    "highestPrice30d" DOUBLE PRECISION,
    "lowestPrice365d" DOUBLE PRECISION,
    "priceStatsUpdatedAt" TIMESTAMP(3),
    "refreshTier" TEXT NOT NULL DEFAULT 'cold',
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPrioritySignalAt" TIMESTAMP(3),
    "lastInteractionAt" TIMESTAMP(3),
    "lastRefreshAttemptAt" TIMESTAMP(3),
    "lastPriceRefreshAt" TIMESTAMP(3),
    "lastSuccessfulRefreshAt" TIMESTAMP(3),
    "nextPriceRefreshAt" TIMESTAMP(3),
    "nextPriorityEnqueueAt" TIMESTAMP(3),
    "refreshFailCount" INTEGER NOT NULL DEFAULT 0,
    "priceChangeFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataFreshnessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refreshLockUntil" TIMESTAMP(3),
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "ratingAverage" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "ratingsUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicCategoryAsinDecision" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "sourceAsin" TEXT,
    "status" TEXT NOT NULL,
    "reasonCode" TEXT,
    "reasonText" TEXT,
    "policyHash" TEXT,
    "title" TEXT,
    "brand" TEXT,
    "imageUrl" TEXT,
    "observedPrice" DOUBLE PRECISION,
    "productId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicCategoryAsinDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicDiscoveryCategoryConfig" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'individual',
    "primeOnlyDefault" BOOLEAN NOT NULL DEFAULT false,
    "freeDeliveryDefault" BOOLEAN NOT NULL DEFAULT false,
    "ignoreInternationalDefault" BOOLEAN NOT NULL DEFAULT true,
    "multiBrandDefault" BOOLEAN NOT NULL DEFAULT true,
    "broadDiscoveryDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultSortBy" TEXT NOT NULL DEFAULT 'featured',
    "autoMaxPages" BOOLEAN NOT NULL DEFAULT true,
    "maxPages" INTEGER NOT NULL DEFAULT 2,
    "autoMaxItemsPerQuery" BOOLEAN NOT NULL DEFAULT true,
    "maxItemsPerQuery" INTEGER NOT NULL DEFAULT 30,
    "searchTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seedBrands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicDiscoveryCategoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicDiscoveryBrandStatus" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timesDetected" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicDiscoveryBrandStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicDiscoveryProductStatus" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "catalogState" TEXT NOT NULL DEFAULT 'new',
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'relevance',
    "query" TEXT NOT NULL,
    "brandName" TEXT,
    "ratingAverage" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "searchPosition" INTEGER,
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "isPrime" BOOLEAN NOT NULL DEFAULT false,
    "isInternational" BOOLEAN NOT NULL DEFAULT false,
    "timesDetected" INTEGER NOT NULL DEFAULT 1,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "queriesDetected" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicDiscoveryProductStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicDiscoveryExecution" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "primeOnly" BOOLEAN NOT NULL DEFAULT false,
    "freeDelivery" BOOLEAN NOT NULL DEFAULT false,
    "ignoreInternational" BOOLEAN NOT NULL DEFAULT true,
    "multiBrand" BOOLEAN NOT NULL DEFAULT true,
    "broadDiscovery" BOOLEAN NOT NULL DEFAULT false,
    "sortBy" TEXT[],
    "searchTerms" TEXT[],
    "seedBrands" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'done',
    "queryCount" INTEGER NOT NULL DEFAULT 0,
    "asinCount" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "existingCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "exportAsins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "previewSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicDiscoveryExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicDiscoveryRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalSearches" INTEGER NOT NULL DEFAULT 0,
    "processedSearches" INTEGER NOT NULL DEFAULT 0,
    "foundItems" INTEGER NOT NULL DEFAULT 0,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "inputs" JSONB,
    "items" JSONB,
    "logs" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicDiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicProductIssueReport" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "pagePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicProductIssueReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicProductReaction" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicProductReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicSiteConfig" (
    "key" TEXT NOT NULL,
    "fallbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fallbackManualEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fallbackAutoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fallbackAutoFailedProductsThreshold" INTEGER NOT NULL DEFAULT 20,
    "fallbackSource" TEXT,
    "fallbackMaxAgeHours" INTEGER NOT NULL DEFAULT 24,
    "fallbackReason" TEXT,
    "fallbackActivatedAt" TIMESTAMP(3),
    "clickEmailAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "clickAlertEmailTo" TEXT,
    "blockedMerchants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicSiteConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "GlobalPriceRefreshRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "totalOffers" INTEGER NOT NULL DEFAULT 0,
    "updatedOffers" INTEGER NOT NULL DEFAULT 0,
    "failedOffers" INTEGER NOT NULL DEFAULT 0,
    "maxConsecutiveFailedOffers" INTEGER NOT NULL DEFAULT 0,
    "outOfStockOffers" INTEGER NOT NULL DEFAULT 0,
    "excludedOffers" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalPriceRefreshRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicPriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "updateCount" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicProductClickStats" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicProductClickStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicProductClickEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "inferredSource" TEXT,
    "pagePath" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DynamicProductClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicClickSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "source" TEXT,
    "firstPagePath" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "summaryEmailSentAt" TIMESTAMP(3),
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueProducts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicClickSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriorityRefreshRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'sqs_priority',
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "processedMessages" INTEGER NOT NULL DEFAULT 0,
    "uniqueAsins" INTEGER NOT NULL DEFAULT 0,
    "updatedProducts" INTEGER NOT NULL DEFAULT 0,
    "skippedProducts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "updatedAsins" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriorityRefreshRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicImportRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "importedItems" INTEGER NOT NULL DEFAULT 0,
    "skippedItems" INTEGER NOT NULL DEFAULT 0,
    "errorItems" INTEGER NOT NULL DEFAULT 0,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "filters" JSONB,
    "logs" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "username" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "commentsBlocked" BOOLEAN NOT NULL DEFAULT false,
    "googleId" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "emailVerificationTokenHash" TEXT,
    "emailVerificationExpiresAt" TIMESTAMP(3),
    "passwordResetTokenHash" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUserFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastTrackedPrice" DOUBLE PRECISION,
    "lastTrackedAvailability" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteUserFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUserMonitoredProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackedProductId" TEXT,
    "asin" TEXT NOT NULL,
    "amazonUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averagePrice30d" DOUBLE PRECISION,
    "availabilityStatus" TEXT DEFAULT 'UNKNOWN',
    "programAndSavePrice" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastTrackedPrice" DOUBLE PRECISION,
    "lastTrackedAvailability" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteUserMonitoredProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTrackedAmazonProduct" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "amazonUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "ratingAverage" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "ratingsUpdatedAt" TIMESTAMP(3),
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averagePrice30d" DOUBLE PRECISION,
    "lowestPrice30d" DOUBLE PRECISION,
    "highestPrice30d" DOUBLE PRECISION,
    "lowestPrice365d" DOUBLE PRECISION,
    "availabilityStatus" TEXT DEFAULT 'UNKNOWN',
    "programAndSavePrice" DOUBLE PRECISION,
    "lastSyncedAt" TIMESTAMP(3),
    "refreshTier" TEXT NOT NULL DEFAULT 'cold',
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPrioritySignalAt" TIMESTAMP(3),
    "lastInteractionAt" TIMESTAMP(3),
    "lastRefreshAttemptAt" TIMESTAMP(3),
    "lastPriceRefreshAt" TIMESTAMP(3),
    "lastSuccessfulRefreshAt" TIMESTAMP(3),
    "nextPriceRefreshAt" TIMESTAMP(3),
    "nextPriorityEnqueueAt" TIMESTAMP(3),
    "refreshFailCount" INTEGER NOT NULL DEFAULT 0,
    "priceChangeFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataFreshnessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refreshLockUntil" TIMESTAMP(3),
    "monitorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrackedAmazonProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTrackedAmazonProductPriceHistory" (
    "id" TEXT NOT NULL,
    "trackedProductId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "updateCount" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTrackedAmazonProductPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteProductComment" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "productAsin" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteProductComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteProductCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT 'like',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteProductCommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUserListComment" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteUserListComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUserListCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT 'like',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteUserListCommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUserList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteUserList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUserListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "productId" TEXT,
    "monitoredProductId" TEXT,
    "trackedAmazonProductId" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteUserListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUserSavedList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteUserSavedList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'social',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "metadata" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "groupedKey" TEXT,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "targetProductId" TEXT,
    "targetListId" TEXT,
    "targetCommentId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteUserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUserNotificationPreference" (
    "userId" TEXT NOT NULL,
    "commentRepliesCentralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "commentRepliesPushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "commentRepliesEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "commentReactionsCentralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "commentReactionsPushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "commentReactionsEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "listCommentsCentralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "listCommentsPushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "listCommentsEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "listFollowsCentralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "listFollowsPushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "listFollowsEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mentionsCentralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mentionsPushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mentionsEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "priceDropsCentralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceDropsPushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "priceDropsEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backInStockCentralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backInStockPushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backInStockEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mentionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reactionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "followersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceDropEnabled" BOOLEAN NOT NULL DEFAULT true,
    "stockReturnEnabled" BOOLEAN NOT NULL DEFAULT true,
    "centralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "priceAlertMode" TEXT NOT NULL DEFAULT 'any',
    "priceAlertPercentage" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteUserNotificationPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "SiteUserPushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SiteUserPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteNotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerMessageId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteNotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteProductSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asin" TEXT,
    "amazonUrl" TEXT,
    "title" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteProductSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRefreshBudgetWindow" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "windowType" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceRefreshBudgetWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteNotificationDispatchGuard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "groupedKey" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteNotificationDispatchGuard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSchedulerActionLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'admin',
    "actionType" TEXT NOT NULL,
    "productSource" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "productId" TEXT,
    "trackedProductId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSchedulerActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatineInfo_productId_key" ON "CreatineInfo"("productId");

-- CreateIndex
CREATE INDEX "CreatineInfo_form_idx" ON "CreatineInfo"("form");

-- CreateIndex
CREATE UNIQUE INDEX "WheyInfo_productId_key" ON "WheyInfo"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProteinBarInfo_productId_key" ON "ProteinBarInfo"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProteinDrinkInfo_productId_key" ON "ProteinDrinkInfo"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "FunctionalCoffeeInfo_productId_key" ON "FunctionalCoffeeInfo"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PreWorkoutInfo_productId_key" ON "PreWorkoutInfo"("productId");

-- CreateIndex
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");

-- CreateIndex
CREATE INDEX "Offer_store_idx" ON "Offer"("store");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_store_externalId_key" ON "Offer"("store", "externalId");

-- CreateIndex
CREATE INDEX "OfferPriceHistory_offerId_createdAt_idx" ON "OfferPriceHistory"("offerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AmazonImportQueue_asin_key" ON "AmazonImportQueue"("asin");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicCategory_group_slug_key" ON "DynamicCategory"("group", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicProduct_asin_key" ON "DynamicProduct"("asin");

-- CreateIndex
CREATE INDEX "DynamicProduct_categoryId_visibilityStatus_totalPrice_idx" ON "DynamicProduct"("categoryId", "visibilityStatus", "totalPrice");

-- CreateIndex
CREATE INDEX "DynamicProduct_categoryId_visibilityStatus_createdAt_idx" ON "DynamicProduct"("categoryId", "visibilityStatus", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicProduct_nextPriceRefreshAt_idx" ON "DynamicProduct"("nextPriceRefreshAt");

-- CreateIndex
CREATE INDEX "DynamicProduct_refreshTier_priorityScore_idx" ON "DynamicProduct"("refreshTier", "priorityScore");

-- CreateIndex
CREATE INDEX "DynamicCategoryAsinDecision_categoryId_status_lastSeenAt_idx" ON "DynamicCategoryAsinDecision"("categoryId", "status", "lastSeenAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicCategoryAsinDecision_asin_idx" ON "DynamicCategoryAsinDecision"("asin");

-- CreateIndex
CREATE INDEX "DynamicCategoryAsinDecision_status_lastSeenAt_idx" ON "DynamicCategoryAsinDecision"("status", "lastSeenAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DynamicCategoryAsinDecision_categoryId_asin_key" ON "DynamicCategoryAsinDecision"("categoryId", "asin");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicDiscoveryCategoryConfig_categoryId_key" ON "DynamicDiscoveryCategoryConfig"("categoryId");

-- CreateIndex
CREATE INDEX "DynamicDiscoveryBrandStatus_categoryId_status_relevanceScor_idx" ON "DynamicDiscoveryBrandStatus"("categoryId", "status", "relevanceScore" DESC);

-- CreateIndex
CREATE INDEX "DynamicDiscoveryBrandStatus_categoryId_lastSeenAt_idx" ON "DynamicDiscoveryBrandStatus"("categoryId", "lastSeenAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DynamicDiscoveryBrandStatus_categoryId_brandName_key" ON "DynamicDiscoveryBrandStatus"("categoryId", "brandName");

-- CreateIndex
CREATE INDEX "DynamicDiscoveryProductStatus_categoryId_status_relevanceSc_idx" ON "DynamicDiscoveryProductStatus"("categoryId", "status", "relevanceScore" DESC);

-- CreateIndex
CREATE INDEX "DynamicDiscoveryProductStatus_categoryId_catalogState_lastS_idx" ON "DynamicDiscoveryProductStatus"("categoryId", "catalogState", "lastSeenAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicDiscoveryProductStatus_asin_idx" ON "DynamicDiscoveryProductStatus"("asin");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicDiscoveryProductStatus_categoryId_asin_key" ON "DynamicDiscoveryProductStatus"("categoryId", "asin");

-- CreateIndex
CREATE INDEX "DynamicDiscoveryExecution_categoryId_createdAt_idx" ON "DynamicDiscoveryExecution"("categoryId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicDiscoveryExecution_categoryId_status_createdAt_idx" ON "DynamicDiscoveryExecution"("categoryId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicDiscoveryRun_status_startedAt_idx" ON "DynamicDiscoveryRun"("status", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicDiscoveryRun_startedAt_idx" ON "DynamicDiscoveryRun"("startedAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicProductIssueReport_productId_createdAt_idx" ON "DynamicProductIssueReport"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicProductIssueReport_status_createdAt_idx" ON "DynamicProductIssueReport"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicProductIssueReport_createdAt_idx" ON "DynamicProductIssueReport"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicProductReaction_productId_reaction_idx" ON "DynamicProductReaction"("productId", "reaction");

-- CreateIndex
CREATE INDEX "DynamicProductReaction_createdAt_idx" ON "DynamicProductReaction"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DynamicProductReaction_productId_visitorId_key" ON "DynamicProductReaction"("productId", "visitorId");

-- CreateIndex
CREATE INDEX "GlobalPriceRefreshRun_startedAt_idx" ON "GlobalPriceRefreshRun"("startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DynamicPriceHistory_productId_date_key" ON "DynamicPriceHistory"("productId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicProductClickStats_productId_key" ON "DynamicProductClickStats"("productId");

-- CreateIndex
CREATE INDEX "DynamicProductClickEvent_sessionId_createdAt_idx" ON "DynamicProductClickEvent"("sessionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicProductClickEvent_productId_createdAt_idx" ON "DynamicProductClickEvent"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicProductClickEvent_createdAt_idx" ON "DynamicProductClickEvent"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DynamicClickSession_sessionId_key" ON "DynamicClickSession"("sessionId");

-- CreateIndex
CREATE INDEX "DynamicClickSession_visitorId_startedAt_idx" ON "DynamicClickSession"("visitorId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicClickSession_startedAt_idx" ON "DynamicClickSession"("startedAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicClickSession_endedAt_idx" ON "DynamicClickSession"("endedAt");

-- CreateIndex
CREATE INDEX "PriorityRefreshRun_startedAt_idx" ON "PriorityRefreshRun"("startedAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicImportRun_status_startedAt_idx" ON "DynamicImportRun"("status", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "DynamicImportRun_startedAt_idx" ON "DynamicImportRun"("startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteUser_email_key" ON "SiteUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SiteUser_username_key" ON "SiteUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "SiteUser_googleId_key" ON "SiteUser"("googleId");

-- CreateIndex
CREATE INDEX "SiteUser_createdAt_idx" ON "SiteUser"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteSession_tokenHash_key" ON "SiteSession"("tokenHash");

-- CreateIndex
CREATE INDEX "SiteSession_userId_expiresAt_idx" ON "SiteSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "SiteSession_expiresAt_idx" ON "SiteSession"("expiresAt");

-- CreateIndex
CREATE INDEX "SiteUserFavorite_productId_createdAt_idx" ON "SiteUserFavorite"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteUserFavorite_userId_createdAt_idx" ON "SiteUserFavorite"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteUserFavorite_userId_productId_key" ON "SiteUserFavorite"("userId", "productId");

-- CreateIndex
CREATE INDEX "SiteUserMonitoredProduct_asin_idx" ON "SiteUserMonitoredProduct"("asin");

-- CreateIndex
CREATE INDEX "SiteUserMonitoredProduct_trackedProductId_idx" ON "SiteUserMonitoredProduct"("trackedProductId");

-- CreateIndex
CREATE INDEX "SiteUserMonitoredProduct_userId_createdAt_idx" ON "SiteUserMonitoredProduct"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteUserMonitoredProduct_userId_asin_key" ON "SiteUserMonitoredProduct"("userId", "asin");

-- CreateIndex
CREATE UNIQUE INDEX "SiteUserMonitoredProduct_userId_trackedProductId_key" ON "SiteUserMonitoredProduct"("userId", "trackedProductId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTrackedAmazonProduct_asin_key" ON "SiteTrackedAmazonProduct"("asin");

-- CreateIndex
CREATE INDEX "SiteTrackedAmazonProduct_createdAt_idx" ON "SiteTrackedAmazonProduct"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteTrackedAmazonProduct_updatedAt_idx" ON "SiteTrackedAmazonProduct"("updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteTrackedAmazonProductPriceHistory_trackedProductId_date_key" ON "SiteTrackedAmazonProductPriceHistory"("trackedProductId", "date");

-- CreateIndex
CREATE INDEX "SiteProductComment_productAsin_createdAt_idx" ON "SiteProductComment"("productAsin", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteProductComment_productId_createdAt_idx" ON "SiteProductComment"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteProductComment_parentId_createdAt_idx" ON "SiteProductComment"("parentId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "SiteProductComment_userId_createdAt_idx" ON "SiteProductComment"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteProductCommentReaction_commentId_reaction_idx" ON "SiteProductCommentReaction"("commentId", "reaction");

-- CreateIndex
CREATE INDEX "SiteProductCommentReaction_userId_createdAt_idx" ON "SiteProductCommentReaction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteProductCommentReaction_commentId_userId_reaction_key" ON "SiteProductCommentReaction"("commentId", "userId", "reaction");

-- CreateIndex
CREATE INDEX "SiteUserListComment_listId_createdAt_idx" ON "SiteUserListComment"("listId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteUserListComment_parentId_createdAt_idx" ON "SiteUserListComment"("parentId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "SiteUserListComment_userId_createdAt_idx" ON "SiteUserListComment"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteUserListCommentReaction_commentId_reaction_idx" ON "SiteUserListCommentReaction"("commentId", "reaction");

-- CreateIndex
CREATE INDEX "SiteUserListCommentReaction_userId_createdAt_idx" ON "SiteUserListCommentReaction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteUserListCommentReaction_commentId_userId_reaction_key" ON "SiteUserListCommentReaction"("commentId", "userId", "reaction");

-- CreateIndex
CREATE UNIQUE INDEX "SiteUserList_slug_key" ON "SiteUserList"("slug");

-- CreateIndex
CREATE INDEX "SiteUserList_isPublic_updatedAt_idx" ON "SiteUserList"("isPublic", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "SiteUserList_userId_isDefault_idx" ON "SiteUserList"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "SiteUserListItem_productId_idx" ON "SiteUserListItem"("productId");

-- CreateIndex
CREATE INDEX "SiteUserListItem_monitoredProductId_idx" ON "SiteUserListItem"("monitoredProductId");

-- CreateIndex
CREATE INDEX "SiteUserListItem_trackedAmazonProductId_idx" ON "SiteUserListItem"("trackedAmazonProductId");

-- CreateIndex
CREATE INDEX "SiteUserListItem_listId_sortOrder_createdAt_idx" ON "SiteUserListItem"("listId", "sortOrder", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteUserListItem_listId_productId_key" ON "SiteUserListItem"("listId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteUserListItem_listId_monitoredProductId_key" ON "SiteUserListItem"("listId", "monitoredProductId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteUserListItem_listId_trackedAmazonProductId_key" ON "SiteUserListItem"("listId", "trackedAmazonProductId");

-- CreateIndex
CREATE INDEX "SiteUserSavedList_listId_createdAt_idx" ON "SiteUserSavedList"("listId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteUserSavedList_userId_createdAt_idx" ON "SiteUserSavedList"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteUserSavedList_userId_listId_key" ON "SiteUserSavedList"("userId", "listId");

-- CreateIndex
CREATE INDEX "SiteUserNotification_userId_isRead_createdAt_idx" ON "SiteUserNotification"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteUserNotification_userId_createdAt_idx" ON "SiteUserNotification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteUserNotification_userId_category_createdAt_idx" ON "SiteUserNotification"("userId", "category", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteUserNotification_userId_groupedKey_idx" ON "SiteUserNotification"("userId", "groupedKey");

-- CreateIndex
CREATE INDEX "SiteUserNotification_targetProductId_idx" ON "SiteUserNotification"("targetProductId");

-- CreateIndex
CREATE INDEX "SiteUserNotification_targetListId_idx" ON "SiteUserNotification"("targetListId");

-- CreateIndex
CREATE INDEX "SiteUserNotification_targetCommentId_idx" ON "SiteUserNotification"("targetCommentId");

-- CreateIndex
CREATE INDEX "SiteUserNotification_targetUserId_idx" ON "SiteUserNotification"("targetUserId");

-- CreateIndex
CREATE INDEX "SiteUserNotification_actorUserId_idx" ON "SiteUserNotification"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteUserPushSubscription_endpoint_key" ON "SiteUserPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "SiteUserPushSubscription_userId_createdAt_idx" ON "SiteUserPushSubscription"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteNotificationDelivery_status_scheduledAt_idx" ON "SiteNotificationDelivery"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "SiteNotificationDelivery_userId_channel_status_idx" ON "SiteNotificationDelivery"("userId", "channel", "status");

-- CreateIndex
CREATE INDEX "SiteNotificationDelivery_notificationId_idx" ON "SiteNotificationDelivery"("notificationId");

-- CreateIndex
CREATE INDEX "SiteProductSuggestion_userId_createdAt_idx" ON "SiteProductSuggestion"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteProductSuggestion_status_createdAt_idx" ON "SiteProductSuggestion"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PriceRefreshBudgetWindow_scope_windowType_windowStart_idx" ON "PriceRefreshBudgetWindow"("scope", "windowType", "windowStart" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PriceRefreshBudgetWindow_scope_windowType_windowStart_key" ON "PriceRefreshBudgetWindow"("scope", "windowType", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "SiteNotificationDispatchGuard_dedupeKey_key" ON "SiteNotificationDispatchGuard"("dedupeKey");

-- CreateIndex
CREATE INDEX "SiteNotificationDispatchGuard_expiresAt_idx" ON "SiteNotificationDispatchGuard"("expiresAt");

-- CreateIndex
CREATE INDEX "SiteNotificationDispatchGuard_type_createdAt_idx" ON "SiteNotificationDispatchGuard"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SiteNotificationDispatchGuard_userId_createdAt_idx" ON "SiteNotificationDispatchGuard"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminSchedulerActionLog_createdAt_idx" ON "AdminSchedulerActionLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminSchedulerActionLog_actionType_createdAt_idx" ON "AdminSchedulerActionLog"("actionType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminSchedulerActionLog_asin_createdAt_idx" ON "AdminSchedulerActionLog"("asin", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CreatineInfo" ADD CONSTRAINT "CreatineInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheyInfo" ADD CONSTRAINT "WheyInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProteinBarInfo" ADD CONSTRAINT "ProteinBarInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProteinDrinkInfo" ADD CONSTRAINT "ProteinDrinkInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionalCoffeeInfo" ADD CONSTRAINT "FunctionalCoffeeInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreWorkoutInfo" ADD CONSTRAINT "PreWorkoutInfo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPriceHistory" ADD CONSTRAINT "OfferPriceHistory_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicProduct" ADD CONSTRAINT "DynamicProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DynamicCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicCategoryAsinDecision" ADD CONSTRAINT "DynamicCategoryAsinDecision_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DynamicCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicDiscoveryCategoryConfig" ADD CONSTRAINT "DynamicDiscoveryCategoryConfig_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DynamicCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicDiscoveryBrandStatus" ADD CONSTRAINT "DynamicDiscoveryBrandStatus_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DynamicCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicDiscoveryProductStatus" ADD CONSTRAINT "DynamicDiscoveryProductStatus_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DynamicCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicDiscoveryExecution" ADD CONSTRAINT "DynamicDiscoveryExecution_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DynamicCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicProductIssueReport" ADD CONSTRAINT "DynamicProductIssueReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicProductReaction" ADD CONSTRAINT "DynamicProductReaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicPriceHistory" ADD CONSTRAINT "DynamicPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicProductClickStats" ADD CONSTRAINT "DynamicProductClickStats_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicProductClickEvent" ADD CONSTRAINT "DynamicProductClickEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicProductClickEvent" ADD CONSTRAINT "DynamicProductClickEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DynamicClickSession"("sessionId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSession" ADD CONSTRAINT "SiteSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserFavorite" ADD CONSTRAINT "SiteUserFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserFavorite" ADD CONSTRAINT "SiteUserFavorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserMonitoredProduct" ADD CONSTRAINT "SiteUserMonitoredProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserMonitoredProduct" ADD CONSTRAINT "SiteUserMonitoredProduct_trackedProductId_fkey" FOREIGN KEY ("trackedProductId") REFERENCES "SiteTrackedAmazonProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTrackedAmazonProductPriceHistory" ADD CONSTRAINT "SiteTrackedAmazonProductPriceHistory_trackedProductId_fkey" FOREIGN KEY ("trackedProductId") REFERENCES "SiteTrackedAmazonProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteProductComment" ADD CONSTRAINT "SiteProductComment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteProductComment" ADD CONSTRAINT "SiteProductComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteProductComment" ADD CONSTRAINT "SiteProductComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SiteProductComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteProductCommentReaction" ADD CONSTRAINT "SiteProductCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "SiteProductComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteProductCommentReaction" ADD CONSTRAINT "SiteProductCommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserListComment" ADD CONSTRAINT "SiteUserListComment_listId_fkey" FOREIGN KEY ("listId") REFERENCES "SiteUserList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserListComment" ADD CONSTRAINT "SiteUserListComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserListComment" ADD CONSTRAINT "SiteUserListComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SiteUserListComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserListCommentReaction" ADD CONSTRAINT "SiteUserListCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "SiteUserListComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserListCommentReaction" ADD CONSTRAINT "SiteUserListCommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserList" ADD CONSTRAINT "SiteUserList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserListItem" ADD CONSTRAINT "SiteUserListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "SiteUserList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserListItem" ADD CONSTRAINT "SiteUserListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DynamicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserListItem" ADD CONSTRAINT "SiteUserListItem_monitoredProductId_fkey" FOREIGN KEY ("monitoredProductId") REFERENCES "SiteUserMonitoredProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserListItem" ADD CONSTRAINT "SiteUserListItem_trackedAmazonProductId_fkey" FOREIGN KEY ("trackedAmazonProductId") REFERENCES "SiteTrackedAmazonProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserSavedList" ADD CONSTRAINT "SiteUserSavedList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserSavedList" ADD CONSTRAINT "SiteUserSavedList_listId_fkey" FOREIGN KEY ("listId") REFERENCES "SiteUserList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserNotification" ADD CONSTRAINT "SiteUserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserNotificationPreference" ADD CONSTRAINT "SiteUserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteUserPushSubscription" ADD CONSTRAINT "SiteUserPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteNotificationDelivery" ADD CONSTRAINT "SiteNotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "SiteUserNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteNotificationDelivery" ADD CONSTRAINT "SiteNotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteProductSuggestion" ADD CONSTRAINT "SiteProductSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteNotificationDispatchGuard" ADD CONSTRAINT "SiteNotificationDispatchGuard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SiteUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
