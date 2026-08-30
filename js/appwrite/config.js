// Appwrite SDK is available globally via CDN (Appwrite)
const { Client, Account, Databases, Storage, Functions, ID, Query } = window.Appwrite;

const CONFIG = {
  endpoint: 'https://sgp.cloud.appwrite.io/v1',
  projectId: '6a11e2ba00082db8f17a',
  databaseId: '6a635234001c8046ec7d',
  
  // Collections
  usersCol: 'users',
  pastPapersCol: 'past_papers',
  universitiesCol: 'universities',
  premiumRequestsCol: 'premium_requests',
  subscriptionsCol: 'subscriptions',
  feedbackCol: 'feedback',
  reviewsCol: 'reviews',
  couponsCol: 'coupons',
  couponUsagesCol: 'coupon_usages',
  userRewardsCol: 'user_rewards',
  
  // Buckets
  mockJsonsBucket: 'mock-jsons',
  generatedResultsBucket: 'generated-results',
  resultTemplatesBucket: 'result-templates',
  profileImagesBucket: 'profile-images',
  paymentReceiptsBucket: 'payment-receipts',
  pastPapersBucket: 'past-papers',

  // Functions
  premiumOpsFunctionId: 'admin-premium-ops' // Placeholder, user will need to update this
};

const client = new Client()
  .setEndpoint(CONFIG.endpoint)
  .setProject(CONFIG.projectId);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const functions = new Functions(client);

export { client, account, databases, storage, functions, CONFIG, ID, Query };
