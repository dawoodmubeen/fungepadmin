const { Client, Account, Databases, Storage, Functions, ID, Query, Permission, Role } = window.Appwrite;

const CONFIG = {
  endpoint: 'https://sgp.cloud.appwrite.io/v1',
  projectId: '6a11e2ba00082db8f17a',
  databaseId: '6a635234001c8046ec7d',
  
  // 12 Collections
  usersCol: 'users',
  subscriptionsCol: 'subscriptions',
  premiumRequestsCol: 'premium_requests',
  couponsCol: 'coupons',
  couponUsagesCol: 'coupon_usages',
  mockTestsCol: 'mock_tests',
  testAttemptsCol: 'test_attempts',
  attemptAnswersCol: 'attempt_answers',
  universitiesCol: 'universities',
  pastPapersCol: 'past_papers',
  feedbackCol: 'feedback',
  notificationsCol: 'notifications',
  
  // Compatibility aliases
  reviewsCol: 'feedback', // Reviews are handled under feedback with category='review'
  
  // 7 Storage Buckets
  profileImagesBucket: 'profile-images',
  paymentReceiptsBucket: 'payment-receipts',
  mockJsonsBucket: 'mock-jsons',
  testPatternsBucket: 'test_patterns',
  solutionsBucket: 'solutions',
  pastPapersBucket: 'past-papers',
  supportAttachmentsBucket: 'support-attachments',

  // Functions
  premiumOpsFunctionId: '6a941f71001c52d43dbd'
};

const client = new Client()
  .setEndpoint(CONFIG.endpoint)
  .setProject(CONFIG.projectId);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const functions = new Functions(client);

export { client, account, databases, storage, functions, CONFIG, ID, Query, Permission, Role };
