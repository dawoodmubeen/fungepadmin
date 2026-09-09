const AppwriteObj = (typeof window !== 'undefined' && window.Appwrite) ? window.Appwrite : {};
const { Client, Account, Databases, Storage, Functions, ID, Query, Permission, Role } = AppwriteObj;

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
  userSessionsCol: 'user_sessions',
  
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

let client = null;
let account = null;
let databases = null;
let storage = null;
let functions = null;

if (Client) {
  client = new Client()
    .setEndpoint(CONFIG.endpoint)
    .setProject(CONFIG.projectId);

  account = new Account(client);
  databases = new Databases(client);
  storage = new Storage(client);
  functions = new Functions(client);
}

export { client, account, databases, storage, functions, CONFIG, ID, Query, Permission, Role };
